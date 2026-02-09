// src/controllers/precoCreditoController.ts
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

/**
 * GET /preco-credito
 * Retorna o preço do crédito MAIS RECENTE (maior ID) da tabela preco_credito
 */
export async function getPrecoCreditoAtual(req: Request, res: Response) {
  // como essa rota roda em privateRoutes (authRequired), req.auth deve existir
  if (!req.auth?.email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const last = await prisma.preco_credito.findFirst({
      orderBy: { ID: "desc" }, // ✅ maior ID = mais recente
      select: { ID: true, VALOR: true },
    });

    if (!last) {
      return res.status(404).json({ error: "Nenhum preço de crédito cadastrado." });
    }

    return res.json({
      id: last.ID,
      valor: Number(last.VALOR), // Decimal -> number
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar preço do crédito." });
  }
}
