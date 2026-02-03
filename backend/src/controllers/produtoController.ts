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

function normalizeTipo(t: any) {
  const s = String(t || "").toUpperCase();
  if (s === "QU_MICO") return "QU_MICO";
  if (s === "BIOL_GICO") return "BIOL_GICO";
  return null;
}

export async function listarProdutosAdmin(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const tipo = normalizeTipo(req.query.tipo);
  const demo = typeof req.query.demo === "string" ? req.query.demo.toUpperCase() : "ALL"; // DEMO | NORMAL | ALL

  const where: any = {};
  if (q) where.NOME = { contains: q };
  if (tipo) where.TIPO = tipo;
  if (demo === "DEMO") where.E_PARA_DEMO = true;
  if (demo === "NORMAL") where.E_PARA_DEMO = false;

  const produtos = await prisma.produto.findMany({
    where,
    orderBy: { NOME: "asc" },
    take: 500,
    select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
  });

  return res.json({ count: produtos.length, produtos });
}

export async function criarProdutoAdmin(req: Request, res: Response) {
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const tipo = normalizeTipo(req.body?.tipo);
  const eParaDemo = Boolean(req.body?.eParaDemo);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (!tipo) return res.status(400).json({ error: "Informe 'tipo' (QU_MICO ou BIOL_GICO)." });

  const produto = await prisma.produto.create({
    data: { NOME: nome, TIPO: tipo as any, E_PARA_DEMO: eParaDemo },
    select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
  });

  return res.status(201).json({ ok: true, produto });
}

export async function atualizarProdutoAdmin(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "ID inválido." });

  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const tipo = normalizeTipo(req.body?.tipo);
  const eParaDemo = Boolean(req.body?.eParaDemo);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (!tipo) return res.status(400).json({ error: "Informe 'tipo' (QU_MICO ou BIOL_GICO)." });

  const produto = await prisma.produto.update({
    where: { ID: id },
    data: { NOME: nome, TIPO: tipo as any, E_PARA_DEMO: eParaDemo },
    select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
  });

  return res.json({ ok: true, produto });
}
