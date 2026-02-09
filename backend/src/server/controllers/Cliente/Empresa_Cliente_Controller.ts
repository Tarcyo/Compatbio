import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

function toPositiveInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * GET /api/empresas
 * Retorna todas as empresas (detalhado).
 */
export async function listarEmpresas(req: Request, res: Response) {
  if (!req.auth?.email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { NOME: "asc" },
      select: {
        ID: true,
        CNPJ: true,
        NOME: true,
        IMAGEM_DA_LOGO: true,
      },
    });

    return res.json({ count: empresas.length, empresas });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar empresas." });
  }
}

/**
 * GET /api/empresas/resumo
 * Retorna empresas em formato leve (bom para dropdown).
 * Inclui também um contador de clientes vinculados.
 */
export async function listarEmpresasResumo(req: Request, res: Response) {
  if (!req.auth?.email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { NOME: "asc" },
      select: {
        ID: true,
        NOME: true,
        IMAGEM_DA_LOGO: true,
        _count: { select: { cliente: true } },
      },
    });

    const payload = empresas.map((e) => ({
      ID: e.ID,
      NOME: e.NOME,
      IMAGEM_DA_LOGO: e.IMAGEM_DA_LOGO,
      CLIENTES_VINCULADOS: e._count.cliente,
    }));

    return res.json({ count: payload.length, empresas: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar empresas (resumo)." });
  }
}

/**
 * POST /api/cliente/empresa
 * Body: { idEmpresa: number | null }
 * Permite mudar (ou remover) a empresa do cliente logado.
 * - idEmpresa null => desvincula empresa
 * - idEmpresa > 0 => vincula a uma empresa existente
 */
export async function atualizarMinhaEmpresa(req: Request, res: Response) {
  const clienteId = req.auth?.clienteId;
  if (!clienteId) return res.status(401).json({ error: "Não autenticado" });

  // aceita null para desvincular
  const raw = req.body?.idEmpresa;

  let idEmpresa: number | null = null;

  if (raw === null || raw === undefined || raw === "") {
    idEmpresa = null;
  } else {
    const parsed = toPositiveInt(raw);
    if (!parsed) {
      return res.status(400).json({ error: "idEmpresa inválido. Use um inteiro > 0 ou null." });
    }
    idEmpresa = parsed;
  }

  try {
    // se veio um idEmpresa, valida se existe
    if (idEmpresa !== null) {
      const exists = await prisma.empresa.findUnique({
        where: { ID: idEmpresa },
        select: { ID: true },
      });
      if (!exists) {
        return res.status(404).json({ error: "Empresa não encontrada." });
      }
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: { ID: clienteId },
      data: { ID_EMPRESA: idEmpresa },
      include: { empresa: true },
    });

    return res.json({
      ok: true,
      cliente: {
        ID: clienteAtualizado.ID,
        EMAIL: clienteAtualizado.EMAIL,
        NOME: clienteAtualizado.NOME,
        ID_EMPRESA: clienteAtualizado.ID_EMPRESA,
        empresa: clienteAtualizado.empresa,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao atualizar empresa do cliente." });
  }
}
