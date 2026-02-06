import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function toPositiveInt(v: any, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return def;
  return n;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isWithinDays(date: Date, days: number) {
  const ms = days * 24 * 60 * 60 * 1000;
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= ms;
}

/**
 * GET /api/assinatura/historico?page=&pageSize=
 * Resposta esperada pela tela:
 * { page, pageSize, total, totalPages, faturas: [...] }
 *
 * Cada fatura inclui:
 * - solicitacao_reembolso (opcional)
 * - reembolso (opcional)
 */
export async function getHistoricoAssinatura(req: Request, res: Response) {
  const clienteIdAuth = req.auth?.clienteId;
  const emailAuth = req.auth?.email;

  if (!clienteIdAuth && !emailAuth) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const page = toPositiveInt(req.query.page, 1);
  const pageSize = clamp(toPositiveInt(req.query.pageSize, 10), 1, 50);

  try {
    const cliente = await prisma.cliente.findUnique({
      where: clienteIdAuth ? { ID: clienteIdAuth } : { EMAIL: emailAuth! },
      select: { ID: true, ID_ASSINATURA: true },
    });

    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    // sem assinatura vinculada => lista vazia (a tela lida bem com isso)
    if (!cliente.ID_ASSINATURA) {
      return res.json({
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        faturas: [],
      });
    }

    const assinaturaId = cliente.ID_ASSINATURA;

    const [total, rows] = await Promise.all([
      prisma.assinatura_fatura.count({
        where: { ID_ASSINATURA: assinaturaId },
      }),
      prisma.assinatura_fatura.findMany({
        where: { ID_ASSINATURA: assinaturaId },
        orderBy: { DATA_CRIACAO: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ID: true,
          ID_ASSINATURA: true,
          STRIPE_INVOICE_ID: true,
          STATUS: true, // "PAGO" | "FALHOU"
          VALOR: true,
          CREDITOS_CONCEDIDOS: true,
          PERIODO_INICIO: true,
          PERIODO_FIM: true,
          DATA_CRIACAO: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // buscar solicitações+reembolsos vinculados às invoices desta página
    const invoiceIds = rows
      .map((r) => String(r.STRIPE_INVOICE_ID || "").trim())
      .filter((x) => x.length > 0);

    const solicitacoes = invoiceIds.length
      ? await prisma.solicitacao_reembolso_assinatura.findMany({
          where: {
            ID_ASSINATURA: assinaturaId,
            STRIPE_INVOICE_ID: { in: invoiceIds },
          },
          select: {
            ID: true,
            ID_ASSINATURA: true,
            ID_CLIENTE: true,
            STRIPE_INVOICE_ID: true,
            STATUS: true, // PENDENTE | APROVADA | NEGADA
            MOTIVO: true,
            VALOR: true,
            CREDITOS: true,
            DATA_CRIACAO: true,
            DATA_ATUALIZACAO: true,
            reembolso: {
              select: {
                ID: true,
                STRIPE_REFUND_ID: true,
                STATUS: true, // PENDENTE | SUCESSO | FALHOU
                VALOR: true,
                DATA_CRIACAO: true,
                DATA_ATUALIZACAO: true,
              },
            },
          },
        })
      : [];

    const solByInvoice = new Map<string, any>();
    for (const s of solicitacoes) {
      solByInvoice.set(String(s.STRIPE_INVOICE_ID), s);
    }

    const faturas = rows.map((f) => {
      const inv = String(f.STRIPE_INVOICE_ID || "");
      const sol = solByInvoice.get(inv) || null;
      const reembolso = sol?.reembolso || null;

      return {
        ...f,
        // para encaixar com a tela:
        solicitacao_reembolso: sol
          ? {
              ID: sol.ID,
              STATUS: sol.STATUS,
              MOTIVO: sol.MOTIVO,
              DATA_CRIACAO: sol.DATA_CRIACAO,
              DATA_ATUALIZACAO: sol.DATA_ATUALIZACAO,
            }
          : null,
        reembolso: reembolso
          ? {
              ID: reembolso.ID,
              STATUS: reembolso.STATUS,
              STRIPE_REFUND_ID: reembolso.STRIPE_REFUND_ID,
              VALOR: reembolso.VALOR,
              DATA_CRIACAO: reembolso.DATA_CRIACAO,
              DATA_ATUALIZACAO: reembolso.DATA_ATUALIZACAO,
            }
          : null,
      };
    });

    return res.json({ page, pageSize, total, totalPages, faturas });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao carregar histórico de assinatura." });
  }
}

/**
 * POST /api/assinatura/reembolso/solicitar
 * body: { stripeInvoiceId: string, motivo?: string }
 *
 * Regras:
 * - precisa estar logado
 * - invoice pertence à assinatura do usuário
 * - fatura precisa estar PAGO
 * - janela de 7 dias (usando assinatura_fatura.DATA_CRIACAO)
 * - idempotência: 1 solicitação por invoice (unique STRIPE_INVOICE_ID)
 * - (IMPORTANTE) só o dono/admin pode solicitar (porque cancela a assinatura inteira)
 */
export async function solicitarReembolsoAssinatura(req: Request, res: Response) {
  const clienteIdAuth = req.auth?.clienteId;
  const emailAuth = req.auth?.email;

  if (!clienteIdAuth && !emailAuth) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const stripeInvoiceId = String(req.body?.stripeInvoiceId || "").trim();
  const motivoRaw = String(req.body?.motivo || "").trim();
  const motivo = motivoRaw ? motivoRaw.slice(0, 1000) : null;

  if (!stripeInvoiceId) return res.status(400).json({ error: "stripeInvoiceId é obrigatório." });

  try {
    const cliente = await prisma.cliente.findUnique({
      where: clienteIdAuth ? { ID: clienteIdAuth } : { EMAIL: emailAuth! },
      select: { ID: true, ID_ASSINATURA: true },
    });

    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });
    if (!cliente.ID_ASSINATURA) return res.status(409).json({ error: "Você não possui assinatura vinculada." });

    const assinatura = await prisma.assinatura.findUnique({
      where: { ID: cliente.ID_ASSINATURA },
      select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true },
    });

    if (!assinatura) return res.status(409).json({ error: "Assinatura vinculada não encontrada." });

    // ✅ REGRA: apenas o dono/admin pode solicitar reembolso (cancela a assinatura inteira)
    if (assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA !== cliente.ID) {
      return res.status(403).json({
        error: "Apenas o administrador (dono) da assinatura pode solicitar reembolso da assinatura.",
      });
    }

    // encontra a fatura no nosso DB
    const fatura = await prisma.assinatura_fatura.findUnique({
      where: { STRIPE_INVOICE_ID: stripeInvoiceId },
      select: {
        ID: true,
        ID_ASSINATURA: true,
        STRIPE_INVOICE_ID: true,
        STATUS: true,
        VALOR: true,
        CREDITOS_CONCEDIDOS: true,
        DATA_CRIACAO: true,
      },
    });

    if (!fatura) return res.status(404).json({ error: "Fatura não encontrada." });

    if (fatura.ID_ASSINATURA !== assinatura.ID) {
      return res.status(403).json({ error: "Esta fatura não pertence à sua assinatura." });
    }

    if (upper(fatura.STATUS) !== "PAGO") {
      return res.status(409).json({ error: "A fatura não está PAGA (não reembolsável)." });
    }

    // janela de 7 dias (alinhado com sua UI: usa DATA_CRIACAO)
    if (!fatura.DATA_CRIACAO || !isWithinDays(new Date(fatura.DATA_CRIACAO), 7)) {
      return res.status(409).json({ error: "Prazo de reembolso expirado (7 dias)." });
    }

    // bloqueia se já existe solicitação para essa invoice
    const exists = await prisma.solicitacao_reembolso_assinatura.findUnique({
      where: { STRIPE_INVOICE_ID: stripeInvoiceId },
      select: { ID: true, STATUS: true },
    });

    if (exists) {
      return res.status(409).json({ error: "Já existe uma solicitação de reembolso para esta fatura." });
    }

    // cria solicitação (snapshot de valor e créditos concedidos)
    const created = await prisma.solicitacao_reembolso_assinatura.create({
      data: {
        ID_ASSINATURA: assinatura.ID,
        ID_CLIENTE: cliente.ID,
        STRIPE_INVOICE_ID: stripeInvoiceId,
        STATUS: "PENDENTE",
        MOTIVO: motivo,
        VALOR: fatura.VALOR as any,
        CREDITOS: Number(fatura.CREDITOS_CONCEDIDOS || 0),
      },
      select: {
        ID: true,
        STATUS: true,
        MOTIVO: true,
        STRIPE_INVOICE_ID: true,
        VALOR: true,
        CREDITOS: true,
        DATA_CRIACAO: true,
        DATA_ATUALIZACAO: true,
      },
    });

    return res.json({ ok: true, solicitacao: created });
  } catch (e: any) {
    console.error(e);

    // se bater unique STRIPE_INVOICE_ID, responde mais amigável
    if (String(e?.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "Já existe uma solicitação de reembolso para esta fatura." });
    }

    return res.status(500).json({ error: "Erro ao solicitar reembolso da assinatura." });
  }
}
