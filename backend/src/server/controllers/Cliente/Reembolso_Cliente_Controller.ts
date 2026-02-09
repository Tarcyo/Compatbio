import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * POST /api/creditos/reembolso/solicitar
 * body: { compraId: number, motivo?: string }
 *
 * Regras de segurança/integridade:
 * - compra precisa ser do cliente logado
 * - STATUS da compra: "PAGO" e DATA_PAGAMENTO preenchida
 * - janela: até 7 dias após DATA_PAGAMENTO
 * - não permite se já existir solicitação para a compra
 * - não permite se já houver reembolso (pendente/sucesso) para a compra
 * - trava “consumo”: exige SALDO >= QUANTIDADE (melhor que nada sem ledger por compra)
 */
export async function solicitarReembolsoCredito(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const compraId = toPositiveInt(req.body?.compraId);
  const motivo = typeof req.body?.motivo === "string" ? req.body.motivo.trim() : "";

  if (!compraId) return res.status(400).json({ error: "compraId inválido." });
  if (motivo.length > 1000) return res.status(400).json({ error: "Motivo muito longo." });

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true, SALDO: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    const compra = await prisma.compra_credito.findFirst({
      where: { ID: compraId, ID_CLIENTE: cliente.ID },
      select: {
        ID: true,
        ID_CLIENTE: true,
        QUANTIDADE: true,
        VALOR_TOTAL: true,
        STATUS: true,
        DATA_PAGAMENTO: true,
        // já tem solicitação?
        solicitacao_reembolso: {
          select: { ID: true, STATUS: true, DATA_CRIACAO: true },
        },
        // já tem reembolso efetivo?
        reembolsos: {
          select: { ID: true, STATUS: true },
          where: { STATUS: { in: ["PENDENTE", "SUCESSO"] } },
        },
      },
    });

    if (!compra) return res.status(404).json({ error: "Compra não encontrada." });

    if (upper(compra.STATUS) !== "PAGO" || !compra.DATA_PAGAMENTO) {
      return res.status(400).json({ error: "A compra ainda não foi finalizada como PAGA." });
    }

    // janela de 7 dias após finalização
    const now = new Date();
    const dias = daysBetween(now, new Date(compra.DATA_PAGAMENTO));
    if (dias > 7) {
      return res.status(400).json({ error: "Prazo expirado: reembolso só pode ser solicitado em até 7 dias após o pagamento." });
    }

    if (compra.solicitacao_reembolso) {
      return res.status(409).json({
        error: "Já existe uma solicitação de reembolso para esta compra.",
        solicitacao: compra.solicitacao_reembolso,
      });
    }

    if (compra.reembolsos?.length) {
      return res.status(409).json({ error: "Esta compra já possui reembolso em andamento ou concluído." });
    }

    // trava mínima de integridade sem ledger por compra:
    // só permite solicitar se o saldo atual ainda comporta “devolver” aqueles créditos
    // (se o saldo for menor, é sinal forte de que o cliente consumiu créditos)
    const saldoAtual = Number(cliente.SALDO ?? 0);
    if (!Number.isFinite(saldoAtual) || saldoAtual < Number(compra.QUANTIDADE)) {
      return res.status(400).json({
        error: "Não é possível solicitar reembolso: créditos já foram consumidos (saldo insuficiente).",
      });
    }

    // cria solicitação (idempotência por unique(ID_COMPRA))
    const solicitacao = await prisma.solicitacao_reembolso_credito.create({
      data: {
        ID_COMPRA: compra.ID,
        ID_CLIENTE: cliente.ID,
        STATUS: "PENDENTE",
        MOTIVO: motivo || null,
        QUANTIDADE: compra.QUANTIDADE,
        VALOR: compra.VALOR_TOTAL,
      },
      select: {
        ID: true,
        STATUS: true,
        MOTIVO: true,
        QUANTIDADE: true,
        VALOR: true,
        DATA_CRIACAO: true,
        DATA_ATUALIZACAO: true,
      },
    });

    return res.json({ ok: true, solicitacao });
  } catch (e: any) {
    // se bater unique constraint por corrida
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Já existe uma solicitação de reembolso para esta compra." });
    }

    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao solicitar reembolso." });
  }
}
