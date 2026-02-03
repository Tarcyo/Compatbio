import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

function onlyDigits(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatCNPJ(v: any) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length !== 14) return null;

  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function safeText(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function prismaErrorCode(e: any): string | null {
  // PrismaClientKnownRequestError: e.code (ex.: P2002, P2025, P2003)
  return typeof e?.code === "string" ? e.code : null;
}





// Formata parcial (igual seu front), ajuda a buscar por CNPJ digitado só com números
function formatCNPJPartial(v: any) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}


export async function adminListarEmpresas(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const take = clampInt(req.query.take, 500, 1, 500);

  const digits = onlyDigits(q);
  const qCnpj = digits ? formatCNPJPartial(digits) : "";

  const where: Prisma.empresaWhereInput = q
    ? {
        OR: [
          { NOME: { contains: q } },
          { CNPJ: { contains: q } },
          ...(qCnpj && qCnpj !== q ? [{ CNPJ: { contains: qCnpj } }] : []),
        ],
      }
    : {};

  try {
    const list = await prisma.empresa.findMany({
      where,
      take,
      orderBy: { ID: "desc" },
      select: {
        ID: true,
        NOME: true,
        CNPJ: true,
        IMAGEM_DA_LOGO: true,
        _count: { select: { cliente: true } },
      },
    });

    const empresas = list.map((e) => ({
      ID: e.ID,
      NOME: e.NOME,
      CNPJ: e.CNPJ,
      IMAGEM_DA_LOGO: e.IMAGEM_DA_LOGO,
      clientesCount: e._count.cliente, // number ✅
    }));

    return res.json({ count: empresas.length, empresas });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar empresas." });
  }
}

/**
 * POST /admin/api/empresas
 * body: { nome, cnpj, imagemDaLogo }
 */
export async function adminCriarEmpresa(req: Request, res: Response) {
  const nome = safeText(req.body?.nome);
  const cnpjFmt = formatCNPJ(req.body?.cnpj);
  const imagemDaLogo = safeText(req.body?.imagemDaLogo);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (nome.length > 255) return res.status(400).json({ error: "Nome excede 255 caracteres." });

  if (!cnpjFmt) return res.status(400).json({ error: "CNPJ inválido. Informe 14 dígitos." });
  // schema: VarChar(18) — formatado fica 18
  if (cnpjFmt.length > 18) return res.status(400).json({ error: "CNPJ inválido." });

  if (imagemDaLogo && imagemDaLogo.length > 500) {
    return res.status(400).json({ error: "URL da logo excede 500 caracteres." });
  }

  try {
    const empresa = await prisma.empresa.create({
      data: {
        NOME: nome,
        CNPJ: cnpjFmt,
        IMAGEM_DA_LOGO: imagemDaLogo,
      },
      select: {
        ID: true,
        NOME: true,
        CNPJ: true,
        IMAGEM_DA_LOGO: true,
      },
    });

    return res.json({ ok: true, empresa: { ...empresa, clientesCount: 0 } });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);
    if (code === "P2002") {
      return res.status(409).json({ error: "Já existe uma empresa com esse CNPJ." });
    }
    return res.status(500).json({ error: "Erro ao criar empresa." });
  }
}

/**
 * PUT /admin/api/empresas/:id
 * body: { nome, cnpj, imagemDaLogo }
 */
export async function adminAtualizarEmpresa(req: Request, res: Response) {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });

  const nome = safeText(req.body?.nome);
  const cnpjFmt = formatCNPJ(req.body?.cnpj);
  const imagemDaLogo = safeText(req.body?.imagemDaLogo);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (nome.length > 255) return res.status(400).json({ error: "Nome excede 255 caracteres." });

  if (!cnpjFmt) return res.status(400).json({ error: "CNPJ inválido. Informe 14 dígitos." });

  if (imagemDaLogo && imagemDaLogo.length > 500) {
    return res.status(400).json({ error: "URL da logo excede 500 caracteres." });
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { ID: id },
      data: {
        NOME: nome,
        CNPJ: cnpjFmt,
        IMAGEM_DA_LOGO: imagemDaLogo,
      },
      select: {
        ID: true,
        NOME: true,
        CNPJ: true,
        IMAGEM_DA_LOGO: true,
      },
    });

    const clientesCount = await prisma.cliente.count({ where: { ID_EMPRESA: id } });

    return res.json({ ok: true, empresa: { ...empresa, clientesCount } });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);

    if (code === "P2025") {
      return res.status(404).json({ error: "Empresa não encontrada." });
    }
    if (code === "P2002") {
      return res.status(409).json({ error: "Já existe uma empresa com esse CNPJ." });
    }

    return res.status(500).json({ error: "Erro ao atualizar empresa." });
  }
}

/**
 * DELETE /admin/api/empresas/:id
 * Bloqueia se houver clientes vinculados (recomendado pela sua UI)
 */
export async function adminRemoverEmpresa(req: Request, res: Response) {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });

  try {
    const clientesCount = await prisma.cliente.count({ where: { ID_EMPRESA: id } });
    if (clientesCount > 0) {
      return res.status(409).json({
        error: `Não é possível remover: existem ${clientesCount} cliente(s) vinculados a esta empresa.`,
      });
    }

    await prisma.empresa.delete({ where: { ID: id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);

    if (code === "P2025") return res.status(404).json({ error: "Empresa não encontrada." });
    if (code === "P2003") {
      // FK constraint (caso o banco bloqueie antes do nosso count)
      return res.status(409).json({ error: "Não é possível remover: existem vínculos no sistema." });
    }

    return res.status(500).json({ error: "Erro ao remover empresa." });
  }
}
