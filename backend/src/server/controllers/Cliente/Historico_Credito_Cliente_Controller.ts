import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

function toPositiveInt(v: any, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return def;
  return n;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * GET /api/creditos/historico?page=1&pageSize=20
 */
export async function getHistoricoCreditos(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const page = toPositiveInt(req.query.page, 1);
  const pageSize = clamp(toPositiveInt(req.query.pageSize, 20), 1, 100);

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    const where = { ID_CLIENTE: cliente.ID };

    const [total, compras] = await Promise.all([
      prisma.compra_credito.count({ where }),
      prisma.compra_credito.findMany({
        where,
        orderBy: { DATA_CRIACAO: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ID: true,
          QUANTIDADE: true,
          VALOR_UNITARIO: true,
          VALOR_TOTAL: true,
          STATUS: true,
          STRIPE_SESSION_ID: true,
          DATA_CRIACAO: true,
          DATA_PAGAMENTO: true,

          // ✅ reembolsos efetivos
          reembolsos: {
            select: {
              ID: true,
              STRIPE_REFUND_ID: true,
              QUANTIDADE: true,
              VALOR: true,
              STATUS: true,
              DATA_CRIACAO: true,
              DATA_ATUALIZACAO: true,
            },
            orderBy: { DATA_CRIACAO: "desc" },
          },

          // ✅ solicitação (cliente)
          solicitacao_reembolso: {
            select: {
              ID: true,
              STATUS: true,
              MOTIVO: true,
              QUANTIDADE: true,
              VALOR: true,
              DATA_CRIACAO: true,
              DATA_ATUALIZACAO: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return res.json({ page, pageSize, total, totalPages, compras });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar histórico de créditos." });
  }
}
