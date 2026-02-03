import { Router } from "express";
import { prisma } from "../lib/prisma";

export const solicitacaoAdicaoProdutoClienteRoutes = Router();

function normalizeTipo(t: any) {
  const s = String(t || "").toUpperCase().trim();
  if (s === "QU_MICO") return "QU_MICO";
  if (s === "BIOL_GICO") return "BIOL_GICO";
  return null;
}

function normalizeNome(n: any) {
  const s = typeof n === "string" ? n.trim() : "";
  // ajuste as regras se quiser:
  if (s.length < 2) return null;
  if (s.length > 255) return null;
  return s;
}

/**
 * POST /solicitacoes/adicao-produto
 * Body: { nome: string, tipo: "QU_MICO" | "BIOL_GICO" }
 *
 * Requer cliente logado (authRequired -> req.auth.email)
 */
solicitacaoAdicaoProdutoClienteRoutes.post("/solicitacoes/adicao-produto", async (req, res) => {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const nome = normalizeNome(req.body?.nome);
  const tipo = normalizeTipo(req.body?.tipo);

  if (!nome) return res.status(400).json({ error: "Informe um nome válido (2..255 caracteres)." });
  if (!tipo) return res.status(400).json({ error: "Tipo inválido. Use QU_MICO ou BIOL_GICO." });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) pega o cliente logado
      const cliente = await tx.cliente.findUnique({
        where: { EMAIL: email },
        select: { ID: true, NOME: true, EMAIL: true },
      });

      if (!cliente) {
        return { ok: false as const, status: 404 as const, error: "Cliente não encontrado." };
      }

      // 2) evita solicitar se o produto já existe no catálogo
      const produtoExistente = await tx.produto.findFirst({
        where: { NOME: nome, TIPO: tipo as any },
        select: { ID: true },
      });

      if (produtoExistente) {
        return {
          ok: false as const,
          status: 409 as const,
          error: "Esse produto já existe no catálogo.",
        };
      }

      // 3) evita duplicar solicitação pendente igual
      const pendenteIgual = await tx.solicitacao_adicao_produto.findFirst({
        where: {
          ID_CLIENTE: cliente.ID,
          STATUS: "PENDENTE",
          NOME: nome,
          TIPO: tipo as any,
        },
        select: { ID: true, STATUS: true },
      });

      if (pendenteIgual) {
        return {
          ok: false as const,
          status: 409 as const,
          error: "Você já possui uma solicitação pendente para esse produto.",
        };
      }

      // 4) cria solicitação
      const solicitacao = await tx.solicitacao_adicao_produto.create({
        data: {
          ID_CLIENTE: cliente.ID,
          NOME: nome,
          TIPO: tipo as any,
          // STATUS já tem default("PENDENTE") no schema
          // DATA_RESPOSTA, DESCRICAO_RESPOSTA, ID_ADMIN... ficam null
        },
        select: {
          ID: true,
          NOME: true,
          TIPO: true,
          STATUS: true,
          DATA_RESPOSTA: true,
          DESCRICAO_RESPOSTA: true,
        },
      });

      return { ok: true as const, solicitacao };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, solicitacao: result.solicitacao });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar solicitação." });
  }
});
