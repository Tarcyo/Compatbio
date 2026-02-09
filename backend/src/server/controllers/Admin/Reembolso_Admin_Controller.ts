import type { Request, Response } from "express";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { stripe } from "../../../lib/stripe";

/** =======================
 * Helpers
 * ======================= */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

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

function mapStripeRefundStatus(status?: string | null): "PENDENTE" | "SUCESSO" | "FALHOU" {
  const s = String(status || "").toLowerCase();
  if (s === "succeeded") return "SUCESSO";
  if (s === "failed" || s === "canceled") return "FALHOU";
  return "PENDENTE";
}

function getIdFromExpandable(x: any): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object" && typeof x.id === "string") return x.id;
  return null;
}

function getProductIdFromLineItem(li: Stripe.LineItem): string | null {
  const p: any = li?.price?.product;
  if (!p) return null;
  if (typeof p === "string") return p;
  if (typeof p === "object" && typeof p.id === "string") return p.id;
  return null;
}

type RefundTarget = { paymentIntentId?: string; chargeId?: string };

/**
 * Tenta achar um Charge para uma Invoice:
 * - Primeiro por invoice.payment_intent / invoice.charge
 * - Depois varrendo charges do customer e batendo charge.invoice === invoice.id
 */
async function resolveRefundTargetFromInvoice(invoiceAny: any): Promise<RefundTarget | null> {
  const invoiceId = String(invoiceAny?.id || "").trim();
  if (!invoiceId) return null;

  const paymentIntentId = getIdFromExpandable(invoiceAny?.payment_intent);
  if (paymentIntentId) return { paymentIntentId };

  const directChargeId = getIdFromExpandable(invoiceAny?.charge);
  if (directChargeId) return { chargeId: directChargeId };

  const customerId = getIdFromExpandable(invoiceAny?.customer);
  if (!customerId) return null;

  // janela de busca ao redor da criação da invoice
  const createdSec = typeof invoiceAny?.created === "number" ? Number(invoiceAny.created) : null;
  const windowSec = 45 * 24 * 60 * 60; // 45 dias pra ser bem resiliente
  const created =
    createdSec && Number.isFinite(createdSec) && createdSec > 0
      ? { gte: createdSec - windowSec, lte: createdSec + windowSec }
      : undefined;

  let startingAfter: string | undefined;
  for (let page = 0; page < 5; page++) {
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      ...(created ? { created } : {}),
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const ch of charges.data || []) {
      const invOnCharge = getIdFromExpandable((ch as any)?.invoice);
      if (invOnCharge && invOnCharge === invoiceId) {
        const piOnCharge = getIdFromExpandable((ch as any)?.payment_intent);
        if (piOnCharge) return { paymentIntentId: piOnCharge };
        return { chargeId: ch.id };
      }
    }

    if (!charges.has_more) break;
    startingAfter = charges.data?.[charges.data.length - 1]?.id;
  }

  return null;
}

async function cancelSubscriptionNow(subscriptionId: string): Promise<any> {
  // stripe-node pode ter cancel() ou del() dependendo da versão
  const current: any = await (stripe.subscriptions as any).retrieve(subscriptionId);

  const alreadyCanceled =
    String(current?.status || "").toLowerCase() === "canceled" || !!current?.canceled_at;

  if (alreadyCanceled) return current;

  if (typeof (stripe.subscriptions as any).cancel === "function") {
    return await (stripe.subscriptions as any).cancel(subscriptionId, {
      invoice_now: false,
      prorate: false,
    });
  }

  return await (stripe.subscriptions as any).del(subscriptionId, {
    invoice_now: false,
    prorate: false,
  });
}

/** =======================
 * LISTAGEM (ADMIN)
 * ======================= */

export async function adminListSolicitacoesReembolso(req: Request, res: Response) {
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = clamp(toPositiveInt(req.query.pageSize, 20), 1, 100);

  const status = String(req.query.status || "").trim();
  const whereCredit: any = {};
  const whereAssin: any = {};
  if (status) {
    whereCredit.STATUS = status;
    whereAssin.STATUS = status;
  }

  try {
    // puxa mais pra unir e depois paginar
    const take = page * pageSize;

    const [creditRows, assinRows] = await Promise.all([
      prisma.solicitacao_reembolso_credito.findMany({
        where: whereCredit,
        orderBy: { DATA_CRIACAO: "desc" },
        take,
        select: {
          ID: true,
          STATUS: true,
          MOTIVO: true,
          QUANTIDADE: true,
          VALOR: true,
          DATA_CRIACAO: true,
          DATA_ATUALIZACAO: true,
          compra: { select: { ID: true, STATUS: true, STRIPE_SESSION_ID: true, DATA_PAGAMENTO: true } },
          cliente: { select: { ID: true, EMAIL: true, NOME: true, SALDO: true } },
        },
      }),

      prisma.solicitacao_reembolso_assinatura.findMany({
        where: whereAssin,
        orderBy: { DATA_CRIACAO: "desc" },
        take,
        select: {
          ID: true,
          STATUS: true,
          MOTIVO: true,
          STRIPE_INVOICE_ID: true,
          VALOR: true,
          CREDITOS: true,
          DATA_CRIACAO: true,
          DATA_ATUALIZACAO: true,
          assinatura: { select: { ID: true, STATUS: true, STRIPE_SUBSCRIPTION_ID: true } },
          cliente: { select: { ID: true, EMAIL: true, NOME: true, SALDO: true } },
        },
      }),
    ]);

    const merged = [
      ...creditRows.map((r) => ({ tipo: "CREDITO" as const, ...r })),
      ...assinRows.map((r) => ({ tipo: "ASSINATURA" as const, ...r })),
    ].sort((a: any, b: any) => new Date(b.DATA_CRIACAO).getTime() - new Date(a.DATA_CRIACAO).getTime());

    const total = merged.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    const slice = merged.slice(start, start + pageSize).map((r: any) => {
      const aprovar =
        r.tipo === "CREDITO"
          ? `/admin/api/reembolsos/solicitacoes/${r.ID}/aprovar`
          : `/admin/api/reembolsos/solicitacoes/assinatura/${r.ID}/aprovar`;

      const negar =
        r.tipo === "CREDITO"
          ? `/admin/api/reembolsos/solicitacoes/${r.ID}/negar`
          : `/admin/api/reembolsos/solicitacoes/assinatura/${r.ID}/negar`;

      return {
        ...r,
        uid: `${r.tipo}_${r.ID}`, // evita colisão de ID no front
        endpoints: { aprovar, negar },
      };
    });

    return res.json({ page, pageSize, total, totalPages, solicitacoes: slice });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar solicitações de reembolso." });
  }
}

/** =======================
 * REEMBOLSO - CRÉDITO (ADMIN)
 * ======================= */

/**
 * POST /admin/api/reembolsos/solicitacoes/:id/aprovar
 */
export async function adminAprovarSolicitacaoReembolso(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const CREDIT_PRODUCT_ID = requireEnv("STRIPE_CREDITO_PRODUCT_ID");

    const sol = await prisma.solicitacao_reembolso_credito.findUnique({
      where: { ID: id },
      select: {
        ID: true,
        STATUS: true,
        ID_COMPRA: true,
        ID_CLIENTE: true,
        QUANTIDADE: true,
        VALOR: true,
        compra: {
          select: {
            ID: true,
            STATUS: true,
            STRIPE_SESSION_ID: true,
            DATA_PAGAMENTO: true,
            QUANTIDADE: true,
            VALOR_TOTAL: true,
            ID_CLIENTE: true,
          },
        },
        cliente: {
          select: { ID: true, SALDO: true, EMAIL: true, NOME: true },
        },
      },
    });

    if (!sol) return res.status(404).json({ error: "Solicitação não encontrada." });
    if (upper(sol.STATUS) !== "PENDENTE") return res.status(409).json({ error: "Solicitação não está PENDENTE." });
    if (!sol.compra) return res.status(409).json({ error: "Compra vinculada não encontrada." });
    if (!sol.cliente) return res.status(409).json({ error: "Cliente vinculado não encontrado." });

    if (sol.compra.ID_CLIENTE !== sol.ID_CLIENTE) {
      return res.status(409).json({ error: "Integridade: cliente da compra difere do cliente da solicitação." });
    }

    if (upper(sol.compra.STATUS) !== "PAGO" || !sol.compra.DATA_PAGAMENTO) {
      return res.status(409).json({ error: "A compra não está PAGA (ou não tem DATA_PAGAMENTO)." });
    }

    const existing = await prisma.reembolso_credito.count({
      where: { ID_COMPRA: sol.compra.ID, STATUS: { in: ["PENDENTE", "SUCESSO"] } },
    });
    if (existing > 0) {
      return res.status(409).json({ error: "Essa compra já possui reembolso em andamento ou concluído." });
    }

    const qtyDec = new Prisma.Decimal(sol.QUANTIDADE);
    if (new Prisma.Decimal(sol.cliente.SALDO).lt(qtyDec)) {
      return res.status(409).json({
        error:
          "O cliente não possui saldo suficiente para estornar os créditos (possivelmente já usou). Faça análise manual.",
      });
    }

    const sessionId = String(sol.compra.STRIPE_SESSION_ID || "");
    if (!sessionId) return res.status(409).json({ error: "Compra sem STRIPE_SESSION_ID." });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "payment") return res.status(409).json({ error: "Sessão Stripe inválida (mode != payment)." });
    if (session.payment_status !== "paid") return res.status(409).json({ error: "Sessão Stripe não está paga." });

    if (upper(session.metadata?.tipo) !== "CREDITO") {
      return res.status(409).json({ error: "Sessão Stripe não é do tipo CREDITO (metadata.tipo)." });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    const hasCreditProduct = (lineItems.data || []).some((li) => getProductIdFromLineItem(li) === CREDIT_PRODUCT_ID);
    if (!hasCreditProduct) {
      return res.status(409).json({ error: "Sessão Stripe não contém o produto de créditos configurado." });
    }

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    if (!paymentIntentId) {
      return res.status(409).json({ error: "Sessão Stripe sem payment_intent para reembolso." });
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          tipo: "CREDITO",
          solicitacaoId: String(sol.ID),
          compraId: String(sol.compra.ID),
          clienteId: String(sol.ID_CLIENTE),
        },
      },
      { idempotencyKey: `sol_reemb_${sol.ID}` }
    );

    const refundStatus = mapStripeRefundStatus(refund.status);
    const refundAmountCents = typeof refund.amount === "number" ? refund.amount : null;
    const refundValor =
      refundAmountCents != null ? new Prisma.Decimal(refundAmountCents).div(100) : new Prisma.Decimal(sol.VALOR);

    const result = await prisma.$transaction(async (tx) => {
      const updSol = await tx.solicitacao_reembolso_credito.updateMany({
        where: { ID: sol.ID, STATUS: "PENDENTE" },
        data: { STATUS: "APROVADA" },
      });
      if (updSol.count === 0) throw new Error("Solicitação não está mais PENDENTE.");

      const updCliente = await tx.cliente.updateMany({
        where: { ID: sol.ID_CLIENTE, SALDO: { gte: qtyDec } },
        data: { SALDO: { decrement: qtyDec } },
      });
      if (updCliente.count === 0) throw new Error("Saldo insuficiente para estornar créditos (concorrência).");

      await tx.compra_credito.update({
        where: { ID: sol.compra!.ID },
        data: { STATUS: "CANCELADO" },
      });

      const reembolso = await tx.reembolso_credito.upsert({
        where: { STRIPE_REFUND_ID: refund.id },
        create: {
          ID_COMPRA: sol.compra!.ID,
          STRIPE_REFUND_ID: refund.id,
          QUANTIDADE: sol.QUANTIDADE,
          VALOR: refundValor,
          STATUS: refundStatus,
        },
        update: {
          QUANTIDADE: sol.QUANTIDADE,
          VALOR: refundValor,
          STATUS: refundStatus,
        },
      });

      await tx.log_transacao.create({
        data: {
          TIPO: "COMPRA_AVULSA",
          ID_CLIENTE: sol.ID_CLIENTE,
          STATUS: "REEMBOLSADO",
          VALOR: new Prisma.Decimal(refundValor).mul(-1),
          DATA_TRANSACAO: new Date(),
        },
      });

      const solicitacaoAtual = await tx.solicitacao_reembolso_credito.findUnique({
        where: { ID: sol.ID },
        select: {
          ID: true,
          STATUS: true,
          MOTIVO: true,
          QUANTIDADE: true,
          VALOR: true,
          DATA_CRIACAO: true,
          DATA_ATUALIZACAO: true,
        },
      });

      return { reembolso, solicitacaoAtual };
    });

    return res.json({
      ok: true,
      refund: { id: refund.id, status: refund.status, amount: refund.amount, currency: refund.currency },
      reembolso: result.reembolso,
      solicitacao: result.solicitacaoAtual,
    });
  } catch (e: any) {
    console.error(e);
    const msg = e?.message || "Erro ao aprovar solicitação.";
    if (String(msg).includes("PENDENTE")) return res.status(409).json({ error: msg });
    if (String(msg).includes("Saldo")) return res.status(409).json({ error: msg });
    return res.status(500).json({ error: msg });
  }
}

/**
 * POST /admin/api/reembolsos/solicitacoes/:id/negar
 */
export async function adminNegarSolicitacaoReembolso(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const sol = await prisma.solicitacao_reembolso_credito.findUnique({
      where: { ID: id },
      select: { ID: true, STATUS: true },
    });

    if (!sol) return res.status(404).json({ error: "Solicitação não encontrada." });
    if (upper(sol.STATUS) !== "PENDENTE") return res.status(409).json({ error: "Solicitação não está PENDENTE." });

    const upd = await prisma.solicitacao_reembolso_credito.update({
      where: { ID: id },
      data: { STATUS: "NEGADA" },
      select: { ID: true, STATUS: true, DATA_CRIACAO: true, DATA_ATUALIZACAO: true },
    });

    return res.json({ ok: true, solicitacao: upd });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao negar solicitação." });
  }
}

/** =======================
 * REEMBOLSO - ASSINATURA (ADMIN)
 * ======================= */

/**
 * POST /admin/api/reembolsos/solicitacoes/assinatura/:id/aprovar
 *
 * - tenta refund da invoice (payment_intent/charge)
 * - se invoice não tiver PI/charge, tenta localizar charge via charges.list(customer) e bater charge.invoice
 * - se ainda assim não existir alvo, não quebra: aprova/cancela no DB/Stripe e retorna warning (reembolso manual)
 */
export async function adminAprovarSolicitacaoReembolsoAssinatura(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const sol = await prisma.solicitacao_reembolso_assinatura.findUnique({
      where: { ID: id },
      select: {
        ID: true,
        STATUS: true,
        ID_ASSINATURA: true,
        ID_CLIENTE: true,
        STRIPE_INVOICE_ID: true,
        VALOR: true,
        CREDITOS: true,
        assinatura: {
          select: {
            ID: true,
            STATUS: true,
            STRIPE_SUBSCRIPTION_ID: true,
            STRIPE_CHECKOUT_SESSION_ID: true,
            ID_VINCULO_STRIPE: true,
          },
        },
        cliente: { select: { ID: true, SALDO: true, EMAIL: true, NOME: true } },
      },
    });

    if (!sol) return res.status(404).json({ error: "Solicitação não encontrada." });
    if (upper(sol.STATUS) !== "PENDENTE") return res.status(409).json({ error: "Solicitação não está PENDENTE." });
    if (!sol.assinatura) return res.status(409).json({ error: "Assinatura vinculada não encontrada." });
    if (!sol.cliente) return res.status(409).json({ error: "Cliente vinculado não encontrado." });

    const existing = await prisma.reembolso_assinatura.count({
      where: { ID_SOLICITACAO: sol.ID, STATUS: { in: ["PENDENTE", "SUCESSO"] } },
    });
    if (existing > 0) {
      return res.status(409).json({ error: "Essa solicitação já possui reembolso em andamento ou concluído." });
    }

    const creditosDec = new Prisma.Decimal(sol.CREDITOS || 0);
    if (creditosDec.gt(0) && new Prisma.Decimal(sol.cliente.SALDO).lt(creditosDec)) {
      return res.status(409).json({
        error:
          "O cliente não possui saldo suficiente para estornar os créditos da fatura (possivelmente já usou). Faça análise manual.",
      });
    }

    const invoiceId = String(sol.STRIPE_INVOICE_ID || "").trim();
    if (!invoiceId) return res.status(409).json({ error: "Solicitação sem STRIPE_INVOICE_ID." });

    // ✅ invoice no Stripe
    const invoice: any = await stripe.invoices.retrieve(invoiceId, {
      expand: ["payment_intent", "subscription", "customer"],
    } as any);

    const invoicePaid = !!invoice?.paid || String(invoice?.status || "").toLowerCase() === "paid";
    if (!invoicePaid) return res.status(409).json({ error: "Invoice do Stripe não está paga (não reembolsável)." });

    const amountPaidCents = typeof invoice?.amount_paid === "number" ? invoice.amount_paid : 0;

    // resolve subscriptionId com fallbacks (invoice -> db -> checkout -> legado)
    let subscriptionId: string | null =
      getIdFromExpandable(invoice?.subscription) ||
      (sol.assinatura.STRIPE_SUBSCRIPTION_ID?.trim() || null) ||
      null;

    if (!subscriptionId && sol.assinatura.STRIPE_CHECKOUT_SESSION_ID) {
      try {
        const sess: any = await stripe.checkout.sessions.retrieve(sol.assinatura.STRIPE_CHECKOUT_SESSION_ID, {
          expand: ["subscription"],
        } as any);
        subscriptionId = getIdFromExpandable(sess?.subscription);
      } catch {
        // ignora
      }
    }

    if (!subscriptionId && sol.assinatura.ID_VINCULO_STRIPE) {
      subscriptionId = String(sol.assinatura.ID_VINCULO_STRIPE || "").trim() || null;
    }

    // 1) tenta achar alvo de refund
    let refund: Stripe.Refund | null = null;
    let warning: string | null = null;

    if (amountPaidCents <= 0) {
      // invoice "paid" sem valor pago (ex.: crédito/balance)
      warning = "Invoice está paga, mas amount_paid=0. Não há Charge/PaymentIntent para reembolso automático.";
    } else {
      const target = await resolveRefundTargetFromInvoice(invoice);

      if (!target?.paymentIntentId && !target?.chargeId) {
        warning =
          "Invoice está paga, mas não foi possível localizar payment_intent/charge (nem por lookup em charges do customer). Reembolso deverá ser feito manualmente no Stripe.";
      } else {
        refund = await stripe.refunds.create(
          {
            ...(target.paymentIntentId ? { payment_intent: target.paymentIntentId } : { charge: target.chargeId! }),
            reason: "requested_by_customer",
            metadata: {
              tipo: "ASSINATURA",
              solicitacaoId: String(sol.ID),
              assinaturaId: String(sol.ID_ASSINATURA),
              clienteId: String(sol.ID_CLIENTE),
              stripeInvoiceId: invoiceId,
            },
          },
          { idempotencyKey: `sol_reemb_assin_${sol.ID}` }
        );
      }
    }

    // 2) cancela subscription no Stripe (mesmo se refund for manual)
    let stripeCancelInfo: any = null;
    if (subscriptionId) {
      try {
        stripeCancelInfo = await cancelSubscriptionNow(subscriptionId);
      } catch (e: any) {
        console.error("[adminAprovarSolicitacaoReembolsoAssinatura] Stripe cancel error:", e?.message || e);
        // ainda assim: cancela no DB (você pode preferir bloquear aqui)
      }
    }

    const refundStatus = refund ? mapStripeRefundStatus(refund.status) : null;
    const refundAmountCents = refund && typeof refund.amount === "number" ? refund.amount : null;
    const refundValor = refundAmountCents != null ? new Prisma.Decimal(refundAmountCents).div(100) : new Prisma.Decimal(sol.VALOR);

    // 3) DB transaction
    const result = await prisma.$transaction(async (tx) => {
      const updSol = await tx.solicitacao_reembolso_assinatura.updateMany({
        where: { ID: sol.ID, STATUS: "PENDENTE" },
        data: { STATUS: "APROVADA" },
      });
      if (updSol.count === 0) throw new Error("Solicitação não está mais PENDENTE.");

      // estorna créditos (se houver)
      if (creditosDec.gt(0)) {
        const updCliente = await tx.cliente.updateMany({
          where: { ID: sol.ID_CLIENTE, SALDO: { gte: creditosDec } },
          data: { SALDO: { decrement: creditosDec } },
        });
        if (updCliente.count === 0) throw new Error("Saldo insuficiente para estornar créditos (concorrência).");
      }

      // cancela assinatura no DB
      await tx.assinatura.updateMany({
        where: { ID: sol.ID_ASSINATURA, STATUS: { not: "CANCELADA" } },
        data: {
          STATUS: "CANCELADA",
          CANCEL_AT_PERIOD_END: false,
          DATA_CANCELAMENTO: new Date(),
          PERIODO_ATUAL_FIM: new Date(),
        },
      });

      // desvincula todos os clientes dessa assinatura
      await tx.cliente.updateMany({
        where: { ID_ASSINATURA: sol.ID_ASSINATURA },
        data: { ID_ASSINATURA: null },
      });

      // cria reembolso_assinatura só se houver refund Stripe
      let reembolso: any = null;
      if (refund) {
        reembolso = await tx.reembolso_assinatura.upsert({
          where: { STRIPE_REFUND_ID: refund.id },
          create: {
            ID_SOLICITACAO: sol.ID,
            STRIPE_REFUND_ID: refund.id,
            STATUS: refundStatus || "PENDENTE",
            VALOR: refundValor,
          },
          update: {
            STATUS: refundStatus || "PENDENTE",
            VALOR: refundValor,
          },
        });
      }

      // log transação (se refund for manual, ainda registra como reembolso aprovado)
      await tx.log_transacao.create({
        data: {
          TIPO: "ASSINATURA",
          ID_CLIENTE: sol.ID_CLIENTE,
          STATUS: refund ? "REEMBOLSADO" : "REEMBOLSO_MANUAL",
          VALOR: new Prisma.Decimal(refundValor).mul(-1),
          DATA_TRANSACAO: new Date(),
        },
      });

      const solicitacaoAtual = await tx.solicitacao_reembolso_assinatura.findUnique({
        where: { ID: sol.ID },
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

      return { reembolso, solicitacaoAtual };
    });

    return res.json({
      ok: true,
      warning, // 👈 se existir, mostre no front (toast/alert)
      refund: refund ? { id: refund.id, status: refund.status, amount: refund.amount, currency: refund.currency } : null,
      cancelamento: {
        subscriptionId,
        status: stripeCancelInfo?.status ?? null,
        canceled_at: stripeCancelInfo?.canceled_at ?? null,
      },
      reembolso: result.reembolso,
      solicitacao: result.solicitacaoAtual,
      assinaturaStatusDb: "CANCELADA",
    });
  } catch (e: any) {
    console.error(e);
    const msg = e?.message || "Erro ao aprovar solicitação de reembolso de assinatura.";
    if (String(msg).includes("PENDENTE")) return res.status(409).json({ error: msg });
    if (String(msg).includes("Saldo")) return res.status(409).json({ error: msg });
    return res.status(500).json({ error: msg });
  }
}

/**
 * POST /admin/api/reembolsos/solicitacoes/assinatura/:id/negar
 */
export async function adminNegarSolicitacaoReembolsoAssinatura(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const sol = await prisma.solicitacao_reembolso_assinatura.findUnique({
      where: { ID: id },
      select: { ID: true, STATUS: true },
    });

    if (!sol) return res.status(404).json({ error: "Solicitação não encontrada." });
    if (upper(sol.STATUS) !== "PENDENTE") return res.status(409).json({ error: "Solicitação não está PENDENTE." });

    const upd = await prisma.solicitacao_reembolso_assinatura.update({
      where: { ID: id },
      data: { STATUS: "NEGADA" },
      select: { ID: true, STATUS: true, DATA_CRIACAO: true, DATA_ATUALIZACAO: true },
    });

    return res.json({ ok: true, solicitacao: upd });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao negar solicitação de reembolso de assinatura." });
  }
}
