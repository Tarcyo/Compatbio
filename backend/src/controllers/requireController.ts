import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { produto_TIPO } from "@prisma/client";

const COST_PER_REQUEST = 1; // 1 crédito por solicitação

function toPositiveInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n <= 0) return null;
  return n;
}

function toPageInt(v: any, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.floor(n);
}

/**
 * POST /api/solicitacoes/analise
 * Body: { idProdutoQuimico, idProdutoBiologico, descricao? }
 *
 * Regras:
 * - precisa estar autenticado
 * - valida produtos e tipos
 * - se COMPRA_NO_SISTEMA=false, só permite E_PARA_DEMO=true
 * - precisa ter SALDO >= 1
 * - debita 1 crédito e cria solicitação em transação
 */
export async function criarSolicitacaoAnalise(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado" });

  const idProdutoQuimico = toPositiveInt(req.body?.idProdutoQuimico);
  const idProdutoBiologico = toPositiveInt(req.body?.idProdutoBiologico);
  const descricao =
    typeof req.body?.descricao === "string" ? req.body.descricao.trim() : undefined;

  if (!idProdutoQuimico || !idProdutoBiologico) {
    return res.status(400).json({
      error: "Campos obrigatórios: idProdutoQuimico e idProdutoBiologico",
    });
  }

  // 1) Cliente logado
  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: email },
    select: { ID: true, COMPRA_NO_SISTEMA: true },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  // 2) Produtos
  const produtos = await prisma.produto.findMany({
    where: { ID: { in: [idProdutoQuimico, idProdutoBiologico] } },
    select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
  });

  const prodQuimico = produtos.find((p) => p.ID === idProdutoQuimico);
  const prodBiologico = produtos.find((p) => p.ID === idProdutoBiologico);

  if (!prodQuimico) return res.status(404).json({ error: "Produto químico não encontrado" });
  if (!prodBiologico) return res.status(404).json({ error: "Produto biológico não encontrado" });

  // 3) Tipos corretos
  if (prodQuimico.TIPO !== produto_TIPO.QU_MICO) {
    return res.status(400).json({
      error: `O produto químico informado não é do tipo QUÍMICO: ${prodQuimico.NOME}`,
    });
  }
  if (prodBiologico.TIPO !== produto_TIPO.BIOL_GICO) {
    return res.status(400).json({
      error: `O produto biológico informado não é do tipo BIOLÓGICO: ${prodBiologico.NOME}`,
    });
  }

  // 4) Demo x compra
  if (!cliente.COMPRA_NO_SISTEMA) {
    if (!prodQuimico.E_PARA_DEMO || !prodBiologico.E_PARA_DEMO) {
      return res.status(403).json({
        error:
          "Conta sem compra no sistema: somente produtos de demonstração (E_PARA_DEMO=true) são permitidos.",
      });
    }
  }

  // 5) Créditos (atômico)
  try {
    const result = await prisma.$transaction(async (tx) => {
      // debita 1 crédito (condicional)
      const debit = await tx.cliente.updateMany({
        where: { ID: cliente.ID, SALDO: { gte: COST_PER_REQUEST } },
        data: { SALDO: { decrement: COST_PER_REQUEST } },
      });

      if (debit.count === 0) {
        return { ok: false as const, reason: "NO_CREDITS" as const };
      }

      const solicitacao = await tx.solicitacao_analise.create({
        data: {
          ID_CLIENTE: cliente.ID,
          ID_PRODUTO_QUIMICO: prodQuimico.ID,
          ID_PRODUTO_BIOLOGICO: prodBiologico.ID,
          STATUS: "PENDENTE",
          DESCRICAO: descricao || null,
          DATA_RESPOSTA: null,
          ID_ADMIN_QUE_RESPONDEU_A_SOLICITACAO: null,
        },
        include: {
          produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto: {
            select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
          },
          produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto: {
            select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
          },
        },
      });

      const clienteAtualizado = await tx.cliente.findUnique({
        where: { ID: cliente.ID },
        select: { SALDO: true },
      });

      return {
        ok: true as const,
        solicitacao,
        saldoAtual: clienteAtualizado?.SALDO ?? null,
      };
    });

    if (!result.ok) {
      return res.status(403).json({
        error: "Créditos insuficientes para solicitar uma análise.",
        custo: COST_PER_REQUEST,
      });
    }

    return res.status(201).json({
      ok: true,
      solicitacao: result.solicitacao,
      saldoAtual: result.saldoAtual,
      custo: COST_PER_REQUEST,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar solicitação de análise." });
  }
}

/**
 * GET /api/solicitacoes/analise/minhas?page=1&pageSize=20
 * Lista solicitações do cliente logado.
 *
 * Observação:
 * - sua tabela não tem "createdAt", então ordeno por ID desc (mais recente primeiro).
 */
export async function listarMinhasSolicitacoes(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado" });

  const page = toPageInt(req.query.page, 1);
  const pageSize = Math.min(toPageInt(req.query.pageSize, 20), 100);
  const skip = (page - 1) * pageSize;

  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: email },
    select: { ID: true, EMAIL: true, NOME: true },
  });

  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  const [total, solicitacoes] = await prisma.$transaction([
    prisma.solicitacao_analise.count({
      where: { ID_CLIENTE: cliente.ID },
    }),
    prisma.solicitacao_analise.findMany({
      where: { ID_CLIENTE: cliente.ID },
      orderBy: { ID: "desc" },
      skip,
      take: pageSize,
      include: {
        produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
        },
        produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
        },
        admin: {
          select: { ID: true, EMAIL: true },
        },
      },
    }),
  ]);

  return res.json({
    cliente,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    solicitacoes,
  });
}
