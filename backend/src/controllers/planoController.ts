import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * GET /api/planos
 * Retorna todos os planos do sistema (rota protegida via privateRoutes + authRequired)
 */
export async function listarPlanos(req: Request, res: Response) {
  // como essa rota roda dentro de privateRoutes, req.auth deve existir.
  // mas deixo a proteção extra por segurança:
  if (!req.auth?.email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const planos = await prisma.plano.findMany({
      orderBy: { ID: "asc" },
      select: {
        ID: true,
        NOME: true,
        QUANT_CREDITO_MENSAL: true,
        ID_STRIPE: true,
      },
    });

    return res.json({
      count: planos.length,
      planos,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar planos." });
  }
}
