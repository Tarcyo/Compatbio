import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function safeText(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseTake(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 500;
  return clampInt(n, 1, 500);
}

function prismaErrorCode(e: any): string | null {
  return typeof e?.code === "string" ? e.code : null;
}

/**
 * GET /admin/api/planos?q=&take=
 * Retorna: { count, planos: [...] }
 * Ordena por PRIORIDADE (asc) e ID (desc) para ficar "bonito" no admin.
 */
export async function adminListarPlanos(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const take = parseTake(req.query.take);

  const where: any = {};
  if (q) {
    where.OR = [
      { NOME: { contains: q } },
      { ID_STRIPE: { contains: q } },
    ];
  }

  try {
    const planos = await prisma.plano.findMany({
      where,
      take,
      orderBy: [{ PRIORIDADE: "asc" }, { ID: "desc" }],
      select: {
        ID: true,
        NOME: true,
        QUANT_CREDITO_MENSAL: true,
        ID_STRIPE: true,
        PRIORIDADE: true,
        _count: { select: { assinatura: true } },
      },
    });

    // front pode usar assinaturaCount se quiser bloquear UI, etc.
    const payload = planos.map((p) => ({
      ID: p.ID,
      NOME: p.NOME,
      QUANT_CREDITO_MENSAL: p.QUANT_CREDITO_MENSAL,
      ID_STRIPE: p.ID_STRIPE,
      PRIORIDADE: p.PRIORIDADE,
      assinaturaCount: p._count.assinatura,
    }));

    return res.json({ count: payload.length, planos: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar planos." });
  }
}

/**
 * POST /admin/api/planos
 * body: { nome, idStripe, quantCreditoMensal, prioridade? }
 */
export async function adminCriarPlano(req: Request, res: Response) {
  const nome = safeText(req.body?.nome);
  const idStripe = safeText(req.body?.idStripe);
  const quantCreditoMensal = toPositiveInt(req.body?.quantCreditoMensal);
  const prioridadeRaw = req.body?.prioridade;
  const prioridade = prioridadeRaw == null ? 3 : toPositiveInt(prioridadeRaw);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (nome.length > 255) return res.status(400).json({ error: "Nome excede 255 caracteres." });

  if (!idStripe) return res.status(400).json({ error: "Informe 'idStripe'." });
  if (idStripe.length > 255) return res.status(400).json({ error: "idStripe excede 255 caracteres." });

  if (!quantCreditoMensal) {
    return res.status(400).json({ error: "Informe 'quantCreditoMensal' (inteiro > 0)." });
  }

  const prio = prioridade ? clampInt(prioridade, 1, 999) : 3;

  try {
    const plano = await prisma.plano.create({
      data: {
        NOME: nome,
        ID_STRIPE: idStripe,
        QUANT_CREDITO_MENSAL: quantCreditoMensal,
        PRIORIDADE: prio,
      },
      select: {
        ID: true,
        NOME: true,
        QUANT_CREDITO_MENSAL: true,
        ID_STRIPE: true,
        PRIORIDADE: true,
      },
    });

    return res.json({ ok: true, plano: { ...plano, assinaturaCount: 0 } });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);

    // Unique de ID_STRIPE (UK_PLANO_ID_STRIPE)
    if (code === "P2002") return res.status(409).json({ error: "Já existe um plano com esse ID do Stripe." });

    return res.status(500).json({ error: "Erro ao criar plano." });
  }
}

/**
 * PUT /admin/api/planos/:id
 * body: { nome, idStripe, quantCreditoMensal, prioridade? }
 */
export async function adminAtualizarPlano(req: Request, res: Response) {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });

  const nome = safeText(req.body?.nome);
  const idStripe = safeText(req.body?.idStripe);
  const quantCreditoMensal = toPositiveInt(req.body?.quantCreditoMensal);
  const prioridadeRaw = req.body?.prioridade;
  const prioridade = prioridadeRaw == null ? 3 : toPositiveInt(prioridadeRaw);

  if (!nome) return res.status(400).json({ error: "Informe 'nome'." });
  if (nome.length > 255) return res.status(400).json({ error: "Nome excede 255 caracteres." });

  if (!idStripe) return res.status(400).json({ error: "Informe 'idStripe'." });
  if (idStripe.length > 255) return res.status(400).json({ error: "idStripe excede 255 caracteres." });

  if (!quantCreditoMensal) {
    return res.status(400).json({ error: "Informe 'quantCreditoMensal' (inteiro > 0)." });
  }

  const prio = prioridade ? clampInt(prioridade, 1, 999) : 3;

  try {
    const plano = await prisma.plano.update({
      where: { ID: id },
      data: {
        NOME: nome,
        ID_STRIPE: idStripe,
        QUANT_CREDITO_MENSAL: quantCreditoMensal,
        PRIORIDADE: prio,
      },
      select: {
        ID: true,
        NOME: true,
        QUANT_CREDITO_MENSAL: true,
        ID_STRIPE: true,
        PRIORIDADE: true,
      },
    });

    const assinaturaCount = await prisma.assinatura.count({ where: { ID_PLANO: id } });

    return res.json({ ok: true, plano: { ...plano, assinaturaCount } });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);

    if (code === "P2025") return res.status(404).json({ error: "Plano não encontrado." });
    if (code === "P2002") return res.status(409).json({ error: "Já existe um plano com esse ID do Stripe." });

    return res.status(500).json({ error: "Erro ao atualizar plano." });
  }
}

/**
 * DELETE /admin/api/planos/:id
 * Bloqueia se houver assinatura vinculada (assinatura.ID_PLANO -> plano.ID)
 */
export async function adminRemoverPlano(req: Request, res: Response) {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });

  try {
    const assinaturaCount = await prisma.assinatura.count({ where: { ID_PLANO: id } });
    if (assinaturaCount > 0) {
      return res.status(409).json({
        error: `Não é possível remover: existem ${assinaturaCount} assinatura(s) vinculada(s) a este plano.`,
      });
    }

    await prisma.plano.delete({ where: { ID: id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    const code = prismaErrorCode(e);

    if (code === "P2025") return res.status(404).json({ error: "Plano não encontrado." });
    // Caso o banco bloqueie por FK antes do nosso count
    if (code === "P2003") return res.status(409).json({ error: "Não é possível remover: existem vínculos no sistema." });

    return res.status(500).json({ error: "Erro ao remover plano." });
  }
}
