import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { produto_TIPO } from "@prisma/client";

// Função auxiliar: pega cliente logado e verifica COMPRA_NO_SISTEMA
async function getClienteOr404(email: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: email },
    select: { ID: true, EMAIL: true, COMPRA_NO_SISTEMA: true },
  });
  return cliente;
}

async function listByTipo(req: Request, res: Response, tipo: produto_TIPO) {
  const email = req.auth!.email;

  const cliente = await getClienteOr404(email);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  const where: any = { TIPO: tipo };

  // ✅ regra: se não comprou, só demo
  if (!cliente.COMPRA_NO_SISTEMA) {
    where.E_PARA_DEMO = true;
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    // filtro por nome (contém)
    where.NOME = { contains: q };
  }

  const produtos = await prisma.produto.findMany({
    where,
    orderBy: { NOME: "asc" },
    take: 50, // limite básico
  });

  return res.json({
    cliente: { ID: cliente.ID, COMPRA_NO_SISTEMA: cliente.COMPRA_NO_SISTEMA },
    tipo,
    count: produtos.length,
    produtos,
  });
}

export async function listQuimicos(req: Request, res: Response) {
  return listByTipo(req, res, produto_TIPO.QU_MICO);
}

export async function listBiologicos(req: Request, res: Response) {
  return listByTipo(req, res, produto_TIPO.BIOL_GICO);
}
