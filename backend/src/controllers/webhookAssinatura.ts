import type { Request, Response } from "express";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function toDateFromUnixSeconds(sec?: number | null): Date | null {
  if (sec == null) return null;
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000);
}

function mapSubscriptionStatus(s?: string | null): string {
  const st = String(s || "").toLowerCase();
  if (st === "active" || st === "trialing") return "ATIVA";
  if (st === "past_due" || st === "unpaid") return "INADIMPLENTE";
  if (st === "canceled") return "CANCELADA";
  if (st === "incomplete" || st === "incomplete_expired") return "PENDENTE";
  return "PENDENTE";
}

async function hasAnyPlanPrice(priceIds: string[]): Promise<boolean> {
  if (!priceIds.length) return false;
  const count = await prisma.plano.count({ where: { ID_STRIPE: { in: priceIds } } });
  return count > 0;
}

function getInvoiceSubscriptionId(inv: any): string | null {
  const s = inv?.subscription;
  if (!s) return null;
  if (typeof s === "string") return s;
  if (typeof s === "object" && typeof s.id === "string") return s.id;
  return null;
}

function getStripeCustomerIdFromSub(subAny: any): string | null {
  const c = subAny?.customer;
  if (!c) return null;
  if (typeof c === "string") return c;
  if (typeof c === "object" && typeof c.id === "string") return c.id;
  return null;
}

async function getSubscriptionPriceIds(subscriptionId: string): Promise<string[]> {
  const subAny: any = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  return (subAny?.items?.data || [])
    .map((it: any) => it?.price?.id)
    .filter((x: any): x is string => typeof x === "string" && x.length > 0);
}

function isInvoicePaid(inv: any): boolean {
  if (!inv) return false;
  if (inv.paid === true) return true;
  const st = String(inv.status || "").toLowerCase();
  return st === "paid";
}

async function getLatestInvoiceFromSubscription(subscriptionId: string): Promise<any | null> {
  try {
    const subAny: any = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    } as any);

    const li = subAny?.latest_invoice;
    if (!li) return null;

    if (typeof li === "string") {
      return await stripe.invoices.retrieve(li);
    }
    if (typeof li === "object" && typeof li.id === "string") {
      return li;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ✅ Cria a "transação" (assinatura_fatura + log_transacao) e credita saldo
 * somente se:
 * - invoice existe
 * - invoice está PAGA
 * - assinatura_fatura ainda não existe (idempotência por STRIPE_INVOICE_ID)
 */
async function tryCreateFaturaAndCreditOnPaidInvoice(params: {
  tx: Prisma.TransactionClient;
  assinaturaId: number;
  clienteId: number;
  planoId: number;
  invoice: any;
}) {
  const { tx, assinaturaId, clienteId, planoId, invoice } = params;

  if (!invoice?.id) return;
  if (!isInvoicePaid(invoice)) return;

  const invoiceId = String(invoice.id);

  const amountPaidCents = typeof invoice?.amount_paid === "number" ? invoice.amount_paid : 0;
  const valor = new Prisma.Decimal(amountPaidCents).div(100);

  const plano = await tx.plano.findUnique({
    where: { ID: planoId },
    select: { QUANT_CREDITO_MENSAL: true },
  });
  if (!plano) return;

  const creditos = Number(plano.QUANT_CREDITO_MENSAL || 0);
  if (creditos <= 0) return;

  // ✅ cria fatura idempotente (unique por invoice)
  const created = await tx.assinatura_fatura
    .create({
      data: {
        ID_ASSINATURA: assinaturaId,
        STRIPE_INVOICE_ID: invoiceId,
        STATUS: "PAGO",
        VALOR: valor,
        CREDITOS_CONCEDIDOS: creditos,
        PERIODO_INICIO:
          typeof invoice?.period_start === "number" ? toDateFromUnixSeconds(invoice.period_start) || undefined : undefined,
        PERIODO_FIM:
          typeof invoice?.period_end === "number" ? toDateFromUnixSeconds(invoice.period_end) || undefined : undefined,
      },
    })
    .catch(() => null);

  // Se já existia, não credita nem loga de novo
  if (!created) return;

  // ✅ credita saldo do cliente (crédito mensal do plano)
  await tx.cliente.update({
    where: { ID: clienteId },
    data: { SALDO: { increment: new Prisma.Decimal(creditos) } },
  });

  // ✅ registra log (idempotência indireta por só criar quando a fatura foi criada)
  await tx.log_transacao.create({
    data: {
      TIPO: "ASSINATURA",
      ID_CLIENTE: clienteId,
      STATUS: "PAGO",
      VALOR: valor,
      DATA_TRANSACAO: new Date(),
    },
  });
}

/**
 * POST /stripe/webhook-assinatura
 * Requer:
 * - express.raw({ type: "application/json" }) nessa rota
 * - secret: STRIPE_WEBHOOK_SECRET_ASSINATURA
 */
export async function stripeWebhookAssinatura(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, requireEnv("STRIPE_WEBHOOK_SECRET_ASSINATURA"));
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  // ✅ whitelist: só eventos de assinatura
  const allowed = new Set<string>([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ]);

  if (!allowed.has(event.type)) {
    return res.status(200).json({ received: true });
  }

  try {
    switch (event.type) {
      // ==========================
      // CHECKOUT ASSINATURA
      // ==========================
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed": {
        const payloadSession = event.data.object as Stripe.Checkout.Session;
        const sessionId = String((payloadSession as any)?.id || "");
        if (!sessionId) return res.status(200).json({ received: true });

        // re-busca sessão
        const session: any = await stripe.checkout.sessions.retrieve(sessionId);

        if (session?.mode !== "subscription") return res.status(200).json({ received: true });
        if (upper(session?.metadata?.tipo) !== "ASSINATURA") return res.status(200).json({ received: true });

        // valida se line_items contém price de algum plano do seu DB
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
          limit: 100,
          expand: ["data.price.product"],
        });

        const priceIds = (lineItems.data || [])
          .map((li: any) => li?.price?.id ?? null)
          .filter((x: any): x is string => typeof x === "string" && x.length > 0);

        if (!(await hasAnyPlanPrice(priceIds))) {
          return res.status(200).json({ received: true });
        }

        const clienteId = session?.metadata?.clienteId ? Number(session.metadata.clienteId) : null;
        const planoIdMeta = session?.metadata?.planoId ? Number(session.metadata.planoId) : null;

        const subscriptionId = typeof session?.subscription === "string" ? session.subscription : null;
        if (!subscriptionId) return res.status(200).json({ received: true });

        // subscription + dados (para DB)
        const subAny: any = await stripe.subscriptions.retrieve(subscriptionId);

        const statusAss = mapSubscriptionStatus(subAny?.status);
        const periodStart = toDateFromUnixSeconds(subAny?.current_period_start ?? null);
        const periodEnd = toDateFromUnixSeconds(subAny?.current_period_end ?? null);
        const cancelAtPeriodEnd = !!subAny?.cancel_at_period_end;
        const canceledAt = toDateFromUnixSeconds(subAny?.canceled_at ?? null);
        const stripeCustomerId = getStripeCustomerIdFromSub(subAny);

        // ✅ (NOVO) tenta obter a primeira invoice da assinatura (latest_invoice)
        // Vamos criar a "transação" + creditar saldo aqui **somente se paid**,
        // e com idempotência pela assinatura_fatura(STRIPE_INVOICE_ID).
        const latestInvoice = await getLatestInvoiceFromSubscription(subscriptionId);

        await prisma.$transaction(async (tx) => {
          const ass = await tx.assinatura.findUnique({
            where: { STRIPE_CHECKOUT_SESSION_ID: sessionId },
            select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, ID_PLANO: true },
          });

          // se não existe no DB, cria
          if (!ass) {
            if (!clienteId || !planoIdMeta) return;

            const created = await tx.assinatura.create({
              data: {
                ID_PLANO: planoIdMeta,
                NOME: "ASSINATURA",
                STATUS: statusAss,
                ID_CLIENTE_ADMIN_DA_ASSINATURA: clienteId,
                STRIPE_CUSTOMER_ID: stripeCustomerId || undefined,
                STRIPE_CHECKOUT_SESSION_ID: sessionId,
                STRIPE_SUBSCRIPTION_ID: subscriptionId,
                PERIODO_ATUAL_INICIO: periodStart || undefined,
                PERIODO_ATUAL_FIM: periodEnd || undefined,
                CANCEL_AT_PERIOD_END: cancelAtPeriodEnd,
                DATA_CANCELAMENTO: canceledAt || undefined,
              },
              select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, ID_PLANO: true },
            });

            await tx.cliente.update({
              where: { ID: created.ID_CLIENTE_ADMIN_DA_ASSINATURA },
              data: {
                ID_ASSINATURA: created.ID,
                STRIPE_CUSTOMER_ID: stripeCustomerId || undefined,
              },
            });

            // ✅ (NOVO) cria fatura+log e credita saldo do cliente se invoice paid
            await tryCreateFaturaAndCreditOnPaidInvoice({
              tx,
              assinaturaId: created.ID,
              clienteId: created.ID_CLIENTE_ADMIN_DA_ASSINATURA,
              planoId: created.ID_PLANO,
              invoice: latestInvoice,
            });

            return;
          }

          // se já existe, atualiza
          await tx.assinatura.update({
            where: { ID: ass.ID },
            data: {
              STATUS: statusAss,
              STRIPE_SUBSCRIPTION_ID: subscriptionId,
              STRIPE_CUSTOMER_ID: stripeCustomerId || undefined,
              PERIODO_ATUAL_INICIO: periodStart || undefined,
              PERIODO_ATUAL_FIM: periodEnd || undefined,
              CANCEL_AT_PERIOD_END: cancelAtPeriodEnd,
              DATA_CANCELAMENTO: canceledAt || undefined,
            },
          });

          await tx.cliente.update({
            where: { ID: ass.ID_CLIENTE_ADMIN_DA_ASSINATURA },
            data: {
              ID_ASSINATURA: ass.ID,
              STRIPE_CUSTOMER_ID: stripeCustomerId || undefined,
            },
          });

          // ✅ (NOVO) mesmo se já existia, tenta registrar a primeira fatura+log e creditar saldo
          // (idempotente por STRIPE_INVOICE_ID)
          await tryCreateFaturaAndCreditOnPaidInvoice({
            tx,
            assinaturaId: ass.ID,
            clienteId: ass.ID_CLIENTE_ADMIN_DA_ASSINATURA,
            planoId: ass.ID_PLANO,
            invoice: latestInvoice,
          });
        });

        return res.status(200).json({ received: true });
      }

      // ==========================
      // SUBSCRIPTION UPDATED / DELETED
      // ==========================
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const payloadSub = event.data.object as Stripe.Subscription;
        const payloadAny: any = payloadSub as any;

        const subId = String(payloadAny?.id || "");
        if (!subId) return res.status(200).json({ received: true });

        const priceIds = (payloadAny?.items?.data || [])
          .map((it: any) => it?.price?.id)
          .filter((x: any): x is string => typeof x === "string" && x.length > 0);

        if (!(await hasAnyPlanPrice(priceIds))) {
          return res.status(200).json({ received: true });
        }

        const statusAss =
          event.type === "customer.subscription.deleted" ? "CANCELADA" : mapSubscriptionStatus(payloadAny?.status);

        const periodStart = toDateFromUnixSeconds(payloadAny?.current_period_start ?? null);
        const periodEnd = toDateFromUnixSeconds(payloadAny?.current_period_end ?? null);
        const cancelAtPeriodEnd = !!payloadAny?.cancel_at_period_end;
        const canceledAt =
          statusAss === "CANCELADA" ? new Date() : toDateFromUnixSeconds(payloadAny?.canceled_at ?? null) || undefined;

        await prisma.assinatura.updateMany({
          where: { STRIPE_SUBSCRIPTION_ID: subId },
          data: {
            STATUS: statusAss,
            PERIODO_ATUAL_INICIO: periodStart || undefined,
            PERIODO_ATUAL_FIM: periodEnd || undefined,
            CANCEL_AT_PERIOD_END: cancelAtPeriodEnd,
            DATA_CANCELAMENTO: canceledAt as any,
          },
        });

        return res.status(200).json({ received: true });
      }

      // ==========================
      // INVOICE PAYMENT SUCCEEDED / FAILED
      // ==========================
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const inv: any = event.data.object as any;

        const invoiceId = String(inv?.id || "");
        const subscriptionId = getInvoiceSubscriptionId(inv);
        if (!invoiceId || !subscriptionId) return res.status(200).json({ received: true });

        // ✅ valida plano via Subscription (não depende de InvoiceLineItem.price)
        const priceIds = await getSubscriptionPriceIds(subscriptionId);
        if (!(await hasAnyPlanPrice(priceIds))) {
          return res.status(200).json({ received: true });
        }

        const isPaid = event.type === "invoice.payment_succeeded";
        const statusAss = isPaid ? "ATIVA" : "INADIMPLENTE";

        const amountPaidCents = typeof inv?.amount_paid === "number" ? inv.amount_paid : 0;
        const valor = new Prisma.Decimal(amountPaidCents).div(100);

        await prisma.$transaction(async (tx) => {
          const assinatura = await tx.assinatura.findFirst({
            where: { STRIPE_SUBSCRIPTION_ID: subscriptionId },
            select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, ID_PLANO: true },
          });
          if (!assinatura) return;

          // atualiza status da assinatura
          await tx.assinatura.update({
            where: { ID: assinatura.ID },
            data: { STATUS: statusAss },
          });

          const periodoInicio =
            typeof inv?.period_start === "number" ? toDateFromUnixSeconds(inv.period_start) || undefined : undefined;
          const periodoFim =
            typeof inv?.period_end === "number" ? toDateFromUnixSeconds(inv.period_end) || undefined : undefined;

          if (isPaid) {
            const plano = await tx.plano.findUnique({
              where: { ID: assinatura.ID_PLANO },
              select: { QUANT_CREDITO_MENSAL: true },
            });
            if (!plano) return;

            const creditos = Number(plano.QUANT_CREDITO_MENSAL || 0);
            if (creditos <= 0) return;

            // ✅ idempotência: só quem conseguir criar a fatura credita e loga
            const created = await tx.assinatura_fatura
              .create({
                data: {
                  ID_ASSINATURA: assinatura.ID,
                  STRIPE_INVOICE_ID: invoiceId,
                  STATUS: "PAGO",
                  VALOR: valor,
                  CREDITOS_CONCEDIDOS: creditos,
                  PERIODO_INICIO: periodoInicio,
                  PERIODO_FIM: periodoFim,
                },
              })
              .catch(() => null);

            if (!created) return;

            await tx.cliente.update({
              where: { ID: assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA },
              data: { SALDO: { increment: new Prisma.Decimal(creditos) } },
            });

            await tx.log_transacao.create({
              data: {
                TIPO: "ASSINATURA",
                ID_CLIENTE: assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA,
                STATUS: "PAGO",
                VALOR: valor,
                DATA_TRANSACAO: new Date(),
              },
            });
          } else {
            // ✅ idempotência também no failed
            const created = await tx.assinatura_fatura
              .create({
                data: {
                  ID_ASSINATURA: assinatura.ID,
                  STRIPE_INVOICE_ID: invoiceId,
                  STATUS: "FALHOU",
                  VALOR: valor,
                  CREDITOS_CONCEDIDOS: 0,
                  PERIODO_INICIO: periodoInicio,
                  PERIODO_FIM: periodoFim,
                },
              })
              .catch(() => null);

            if (!created) return;

            await tx.log_transacao.create({
              data: {
                TIPO: "ASSINATURA",
                ID_CLIENTE: assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA,
                STATUS: "FALHOU",
                VALOR: valor.mul(-1),
                DATA_TRANSACAO: new Date(),
              },
            });
          }
        });

        return res.status(200).json({ received: true });
      }

      default:
        return res.status(200).json({ received: true });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send("Webhook assinatura handler failed.");
  }
}
