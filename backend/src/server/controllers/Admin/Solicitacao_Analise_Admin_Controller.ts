import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

const STATUS_PENDENTE = "PENDENTE";
const STATUS_EM_ANALISE = "EM_ANALISE";

function toPositiveInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function toNullablePriority(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

function toPageInt(v: any, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.floor(n);
}

function getPagination(req: Request) {
  const page = toPageInt(req.query.page, 1);
  const pageSize = Math.min(toPageInt(req.query.pageSize, 20), 100);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

async function listarPorFiltroStatus(req: Request, res: Response, where: any) {
  const { page, pageSize, skip } = getPagination(req);

  const [total, solicitacoes] = await prisma.$transaction([
    prisma.solicitacao_analise.count({ where }),
    prisma.solicitacao_analise.findMany({
      where,
      orderBy: [{ PRIORIDADE: "asc" }, { ID: "desc" }],
      skip,
      take: pageSize,
      include: {
        cliente: {
          select: {
            ID: true,
            EMAIL: true,
            NOME: true,
            ID_EMPRESA: true,
            empresa: { select: { ID: true, NOME: true, CNPJ: true, IMAGEM_DA_LOGO: true } },
          },
        },
        admin: { select: { ID: true, EMAIL: true } },
        produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
        },
        produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
        },
      },
    }),
  ]);

  return res.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    solicitacoes,
  });
}

/**
 * GET /admin/api/solicitacoes/analise/pendentes
 */
export async function listarSolicitacoesPendentes(req: Request, res: Response) {
  return listarPorFiltroStatus(req, res, { STATUS: STATUS_PENDENTE });
}

/**
 * GET /admin/api/solicitacoes/analise/concluidas
 * (tudo que NÃO é pendente) — inclui EM_ANALISE
 */
export async function listarSolicitacoesConcluidas(req: Request, res: Response) {
  return listarPorFiltroStatus(req, res, { STATUS: { not: STATUS_PENDENTE } });
}

/**
 * POST /admin/api/solicitacoes/analise/marcar-em-analise
 * Body: { id }
 *
 * Regras:
 * - exige admin logado (req.adminAuth preenchido por adminAuthRequired)
 * - só permite marcar se status atual for PENDENTE
 */
export async function marcarSolicitacaoEmAnalise(req: Request, res: Response) {
  const adminId = req.adminAuth?.adminId;
  if (!adminId) return res.status(401).json({ error: "Não autenticado (admin)." });

  const id = toPositiveInt(req.body?.id);
  if (!id) return res.status(400).json({ error: "Campo obrigatório: id (inteiro > 0)." });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.solicitacao_analise.findUnique({
        where: { ID: id },
        select: { ID: true, STATUS: true },
      });

      if (!existing) {
        return { ok: false as const, status: 404 as const, error: "Solicitação não encontrada." };
      }

      const current = String(existing.STATUS || "").toUpperCase();
      if (current !== STATUS_PENDENTE) {
        return {
          ok: false as const,
          status: 409 as const,
          error: `Só é possível marcar como EM_ANALISE quando o status atual é PENDENTE. (Atual: ${existing.STATUS || "—"})`,
        };
      }

      const updated = await tx.solicitacao_analise.update({
        where: { ID: id },
        data: {
          STATUS: STATUS_EM_ANALISE,
          // Se você tiver campos para rastrear início da análise, atualize aqui.
          // Ex.: DATA_INICIO_ANALISE: new Date(),
          // Ex.: ID_ADMIN_QUE_INICIOU_ANALISE: adminId,
        },
        select: { ID: true, STATUS: true },
      });

      return { ok: true as const, solicitacao: updated };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, solicitacao: result.solicitacao });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao marcar solicitação como em análise." });
  }
}

/**
 * POST /admin/api/solicitacoes/analise/responder
 * Body: { id, status, descricao?, prioridade? }
 *
 * ✅ cria OU atualiza o resultado_catalogado (químico+biológico) após responder.
 */
export async function responderSolicitacaoAnalise(req: Request, res: Response) {
  const adminId = req.adminAuth?.adminId;
  if (!adminId) return res.status(401).json({ error: "Não autenticado (admin)." });

  const id = toPositiveInt(req.body?.id);
  if (!id) return res.status(400).json({ error: "Campo obrigatório: id (inteiro > 0)." });

  const statusRaw = typeof req.body?.status === "string" ? req.body.status.trim() : "";
  const status = statusRaw.toUpperCase();

  const ALLOWED = new Set(["COMPATIVEL", "INCOMPATIVEL", "PARCIAL"]);
  if (!status || !ALLOWED.has(status)) {
    return res.status(400).json({
      error: "Status inválido. Use: COMPATIVEL, INCOMPATIVEL ou PARCIAL.",
    });
  }

  const hasDescricao = Object.prototype.hasOwnProperty.call(req.body, "descricao");
  const hasPrioridade = Object.prototype.hasOwnProperty.call(req.body, "prioridade");

  let descricaoValue: string | null | undefined = undefined;
  if (hasDescricao) {
    const raw = req.body?.descricao;
    if (raw === null) descricaoValue = null;
    else if (typeof raw === "string") {
      const t = raw.trim();
      descricaoValue = t.length ? t : null;
    } else {
      return res.status(400).json({ error: "descricao inválida. Use string ou null." });
    }
  }

  let prioridadeValue: number | null | undefined = undefined;
  if (hasPrioridade) {
    const raw = req.body?.prioridade;

    if (raw === null) {
      prioridadeValue = null;
    } else {
      const parsed = toNullablePriority(raw);
      if (parsed === null) {
        return res.status(400).json({ error: "prioridade inválida. Use inteiro de 1 a 5, ou null." });
      }
      prioridadeValue = parsed;
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.solicitacao_analise.findUnique({
        where: { ID: id },
        select: {
          ID: true,
          ID_PRODUTO_QUIMICO: true,
          ID_PRODUTO_BIOLOGICO: true,
        },
      });

      if (!existing) {
        return { ok: false as const, status: 404 as const, error: "Solicitação não encontrada." };
      }

      const updatedSolicitacao = await tx.solicitacao_analise.update({
        where: { ID: id },
        data: {
          STATUS: status,
          ...(hasDescricao ? { DESCRICAO: descricaoValue! } : {}),
          ...(hasPrioridade ? { PRIORIDADE: prioridadeValue! } : {}),
          DATA_RESPOSTA: new Date(),
          ID_ADMIN_QUE_RESPONDEU_A_SOLICITACAO: adminId,
        },
        include: {
          cliente: {
            select: {
              ID: true,
              EMAIL: true,
              NOME: true,
              ID_EMPRESA: true,
              empresa: { select: { ID: true, NOME: true, CNPJ: true, IMAGEM_DA_LOGO: true } },
            },
          },
          admin: { select: { ID: true, EMAIL: true } },
          produto_solicitacao_analise_ID_PRODUTO_QUIMICOToproduto: {
            select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
          },
          produto_solicitacao_analise_ID_PRODUTO_BIOLOGICOToproduto: {
            select: { ID: true, NOME: true, TIPO: true, E_PARA_DEMO: true },
          },
        },
      });

      const idQuimico = existing.ID_PRODUTO_QUIMICO;
      const idBiologico = existing.ID_PRODUTO_BIOLOGICO;

      let catalogoCriado = false;
      let catalogoAtualizado = false;

      if (idQuimico && idBiologico) {
        const updateData: any = { STATUS: status };
        if (hasDescricao) updateData.DESCRICAO = descricaoValue ?? null;

        const upd = await tx.resultado_catalogado.updateMany({
          where: {
            ID_PRODUTO_QUIMICO: idQuimico,
            ID_PRODUTO_BIOLOGICO: idBiologico,
          },
          data: updateData,
        });

        if (upd.count > 0) {
          catalogoAtualizado = true;
        } else {
          await tx.resultado_catalogado.create({
            data: {
              ID_PRODUTO_QUIMICO: idQuimico,
              ID_PRODUTO_BIOLOGICO: idBiologico,
              STATUS: status,
              DESCRICAO: hasDescricao ? (descricaoValue ?? null) : null,
            },
          });
          catalogoCriado = true;
        }
      }

      return {
        ok: true as const,
        solicitacao: updatedSolicitacao,
        catalogoCriado,
        catalogoAtualizado,
      };
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      ok: true,
      solicitacao: result.solicitacao,
      catalogoCriado: result.catalogoCriado,
      catalogoAtualizado: result.catalogoAtualizado,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao responder solicitação." });
  }
}
