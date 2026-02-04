import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1, 0, 0, 0, 0);
}

function buildMonthsRange(months: number) {
  const now = new Date();
  const end = now;
  const start = startOfMonth(addMonths(now, -(months - 1)));

  const keys: string[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < months; i++) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return { start, end, keys };
}

export async function adminDashboard(req: Request, res: Response) {
  const months = clampInt(req.query.months, 6, 3, 24);
  const { start, end, keys } = buildMonthsRange(months);

  const solicitacoesByMonth: Record<
    string,
    { total: number; biologico: number; quimico: number; combo: number }
  > = {};

  const novosClientesByMonth: Record<string, number> = {};
  const receitaByMonth: Record<string, number> = {};

  for (const k of keys) {
    solicitacoesByMonth[k] = { total: 0, biologico: 0, quimico: 0, combo: 0 };
    novosClientesByMonth[k] = 0;
    receitaByMonth[k] = 0;
  }

  try {
    // 1) Solicitações (últimos N meses) — usa DATA_SOLICITACAO
    const solicitacoes = await prisma.solicitacao_analise.findMany({
      where: { DATA_SOLICITACAO: { gte: start, lt: end } },
      select: {
        DATA_SOLICITACAO: true,
        ID_PRODUTO_BIOLOGICO: true,
        ID_PRODUTO_QUIMICO: true,
      },
    });

    for (const s of solicitacoes) {
      const k = monthKey(s.DATA_SOLICITACAO);
      if (!solicitacoesByMonth[k]) continue;

      solicitacoesByMonth[k].total += 1;

      const hasBio = s.ID_PRODUTO_BIOLOGICO != null;
      const hasQuim = s.ID_PRODUTO_QUIMICO != null;

      if (hasBio && hasQuim) solicitacoesByMonth[k].combo += 1;
      else if (hasBio) solicitacoesByMonth[k].biologico += 1;
      else if (hasQuim) solicitacoesByMonth[k].quimico += 1;
    }

    // 2) Novos clientes (últimos N meses) — usa DATA_CRIACAO
    const novosClientes = await prisma.cliente.findMany({
      where: { DATA_CRIACAO: { gte: start, lt: end } },
      select: { DATA_CRIACAO: true },
    });

    for (const c of novosClientes) {
      const k = monthKey(c.DATA_CRIACAO);
      if (!novosClientesByMonth[k]) continue;
      novosClientesByMonth[k] += 1;
    }

    // 3) Receita (últimos N meses) — AGORA via log_transacao (somente CONCLUIDO)
    // ✅ soma log_transacao.VALOR agrupado por DATA_TRANSACAO
    const logs = await prisma.log_transacao.findMany({
      where: {
        DATA_TRANSACAO: { gte: start, lt: end },
        STATUS: { in: ["CONCLUIDO", "CONCLUÍDO"] }, // se você usa só "CONCLUIDO", pode deixar só ele
      },
      select: {
        DATA_TRANSACAO: true,
        VALOR: true,
      },
      take: 200000, // segurança (se precisar, a gente troca por agregação no banco)
    });

    for (const l of logs) {
      const k = monthKey(l.DATA_TRANSACAO);
      if (!receitaByMonth[k]) continue;
      receitaByMonth[k] += Number(l.VALOR ?? 0);
    }

    // 4) Clientes por empresa (Top 12)
    const empresas = await prisma.empresa.findMany({
      select: {
        ID: true,
        NOME: true,
        _count: { select: { cliente: true } },
      },
      orderBy: { ID: "desc" },
      take: 200,
    });

    const clientesPorEmpresa = empresas
      .map((e) => ({
        empresaId: e.ID,
        nome: e.NOME,
        clientes: e._count.cliente,
      }))
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 12);

    // 5) Top 6 combinações Bio + Quim mais pedidas
    const top = await prisma.solicitacao_analise.groupBy({
      by: ["ID_PRODUTO_BIOLOGICO", "ID_PRODUTO_QUIMICO"],
      where: {
        ID_PRODUTO_BIOLOGICO: { not: null },
        ID_PRODUTO_QUIMICO: { not: null },
        // Se quiser top do período:
        // DATA_SOLICITACAO: { gte: start, lt: end },
      },
      _count: { ID: true },
      orderBy: { _count: { ID: "desc" } },
      take: 6,
    });

    const ids = Array.from(
      new Set(
        top
          .flatMap((x) => [x.ID_PRODUTO_BIOLOGICO, x.ID_PRODUTO_QUIMICO])
          .filter((x): x is number => typeof x === "number")
      )
    );

    const produtos = await prisma.produto.findMany({
      where: { ID: { in: ids } },
      select: { ID: true, NOME: true, TIPO: true },
    });

    const nomeById = new Map(produtos.map((p) => [p.ID, p.NOME]));

    const topCombinacoes = top.map((x) => {
      const bioId = x.ID_PRODUTO_BIOLOGICO as number;
      const quimId = x.ID_PRODUTO_QUIMICO as number;

      const bioNome = nomeById.get(bioId) ?? `Bio #${bioId}`;
      const quimNome = nomeById.get(quimId) ?? `Quim #${quimId}`;

      return {
        bioId,
        quimId,
        bio: bioNome,
        quim: quimNome,
        count: x._count.ID,
        label: `${bioNome} + ${quimNome}`,
      };
    });

    const solicitacoesPorMes = keys.map((k) => ({ month: k, ...solicitacoesByMonth[k] }));
    const novosClientesPorMes = keys.map((k) => ({ month: k, novos: novosClientesByMonth[k] }));
    const receitaPorMes = keys.map((k) => ({
      month: k,
      receita: Number(receitaByMonth[k].toFixed(2)),
    }));

    const totalSolicitacoes = solicitacoesPorMes.reduce((acc, x) => acc + x.total, 0);
    const totalNovosClientes = novosClientesPorMes.reduce((acc, x) => acc + x.novos, 0);
    const totalReceita = receitaPorMes.reduce((acc, x) => acc + x.receita, 0);

    return res.json({
      range: { months, from: start.toISOString(), to: end.toISOString() },
      totals: {
        solicitacoes: totalSolicitacoes,
        novosClientes: totalNovosClientes,
        receita: Number(totalReceita.toFixed(2)),
      },
      solicitacoesPorMes,
      novosClientesPorMes,
      receitaPorMes,
      clientesPorEmpresa,
      topCombinacoes,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao carregar dados do dashboard." });
  }
}
