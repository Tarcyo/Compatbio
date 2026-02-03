import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function normalizeTipo(t: any) {
  const s = String(t || "").toUpperCase();
  if (s === "QU_MICO") return "QU_MICO";
  if (s === "BIOL_GICO") return "BIOL_GICO";
  return null;
}

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function listarSolicitacoesAdicaoProduto(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "PENDENTE";

  const where: any = {};
  if (status !== "ALL") where.STATUS = status;

  const solicitacoes = await prisma.solicitacao_adicao_produto.findMany({
    where,
    orderBy: { ID: "desc" },
    take: 500,
    select: {
      ID: true,
      NOME: true,
      TIPO: true,
      STATUS: true,
      DATA_RESPOSTA: true,
      DESCRICAO_RESPOSTA: true,
      ID_CLIENTE: true,
      cliente: { select: { ID: true, NOME: true } }, // sem email
    },
  });

  return res.json({ count: solicitacoes.length, solicitacoes });
}

export async function aprovarSolicitacaoAdicaoProduto(req: Request, res: Response) {
  const adminId = req.adminAuth?.adminId;
  if (!adminId) return res.status(401).json({ error: "Não autenticado (admin)." });

  const idSolicitacao = toPositiveInt(req.body?.idSolicitacao);
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const tipo = normalizeTipo(req.body?.tipo);
  const eParaDemo = Boolean(req.body?.eParaDemo);

  if (!idSolicitacao) return res.status(400).json({ error: "idSolicitacao inválido." });
  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (!tipo) return res.status(400).json({ error: "Informe 'tipo' (QU_MICO ou BIOL_GICO)." });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitacao_adicao_produto.findUnique({
        where: { ID: idSolicitacao },
        select: { ID: true, STATUS: true },
      });

      if (!sol) return { ok: false as const, status: 404 as const, error: "Solicitação não encontrada." };

      if (String(sol.STATUS).toUpperCase() !== "PENDENTE") {
        return { ok: false as const, status: 409 as const, error: "Solicitação já foi respondida." };
      }

      const produto = await tx.produto.create({
        data: { NOME: nome, TIPO: tipo as any, E_PARA_DEMO: eParaDemo },
        select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
      });

      await tx.solicitacao_adicao_produto.update({
        where: { ID: idSolicitacao },
        data: {
          STATUS: "APROVADA",
          DATA_RESPOSTA: new Date(),
          DESCRICAO_RESPOSTA: null,
          ID_ADMIN_QUE_RESPONDEU_A_SOLICITACAO: adminId,
        },
      });

      return { ok: true as const, produto };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, produto: result.produto });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao aprovar solicitação." });
  }
}

export async function recusarSolicitacaoAdicaoProduto(req: Request, res: Response) {
  const adminId = req.adminAuth?.adminId;
  if (!adminId) return res.status(401).json({ error: "Não autenticado (admin)." });

  const idSolicitacao = toPositiveInt(req.body?.idSolicitacao);
  const motivo = req.body?.motivo === null ? null : typeof req.body?.motivo === "string" ? req.body.motivo.trim() : undefined;

  if (!idSolicitacao) return res.status(400).json({ error: "idSolicitacao inválido." });

  try {
    const updated = await prisma.solicitacao_adicao_produto.updateMany({
      where: { ID: idSolicitacao, STATUS: "PENDENTE" },
      data: {
        STATUS: "RECUSADA",
        DATA_RESPOSTA: new Date(),
        DESCRICAO_RESPOSTA: motivo ?? null,
        ID_ADMIN_QUE_RESPONDEU_A_SOLICITACAO: adminId,
      },
    });

    if (updated.count === 0) {
      return res.status(409).json({ error: "Solicitação não existe ou já foi respondida." });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao recusar solicitação." });
  }
}
