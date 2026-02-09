// src/controllers/planoController.ts
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/planos
 * Retorna todos os planos do sistema
 * (rota protegida via privateRoutes + authRequired)
 */
export async function listarPlanos(req: Request, res: Response) {
  // segurança extra
  if (!req.auth?.email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const planosDb = await prisma.plano.findMany({
      orderBy: [
        // se PRIORIDADE existir, mantém a ordem "mais importante" primeiro
        { PRIORIDADE: "asc" },
        { ID: "asc" },
      ],
      select: {
        ID: true,
        NOME: true,
        QUANT_CREDITO_MENSAL: true,
        ID_STRIPE: true,
        PRIORIDADE: true,
        VALOR_MENSAL: true,
      },
    });

    // Prisma Decimal -> geralmente serializa como string.
    // Aqui garantimos um payload simples e estável para o front.
    const planos = planosDb.map((p) => ({
      ID: p.ID,
      NOME: p.NOME,
      QUANT_CREDITO_MENSAL: p.QUANT_CREDITO_MENSAL,
      ID_STRIPE: p.ID_STRIPE,
      PRIORIDADE: p.PRIORIDADE,
      // retorna como número (front aceita number ou string, mas assim fica padronizado)
      VALOR_MENSAL: Number(p.VALOR_MENSAL ?? 0),
    }));

    return res.json({ count: planos.length, planos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar planos." });
  }
}
