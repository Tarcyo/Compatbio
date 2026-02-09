import type { Request, Response } from "express";
import type Stripe from "stripe";
import { stripe } from "../../../lib/stripe";
import { prisma } from "../../../lib/prisma";
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

function isPrismaUniqueError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function normalizeEmail(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s;
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

function getStripeCustomerIdFromInvoice(inv: any): string | null {
  const c = inv?.customer;
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

function getInvoiceAmountCents(inv: any, isPaid: boolean): number {
  const pick = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  // pago: amount_paid é o mais correto
  if (isPaid) {
    const ap = pick(inv?.amount_paid);
    if (ap > 0) return ap;
  }

  // falhou/aberto: amount_due/total costumam refletir o valor cobrado
  const ad = pick(inv?.amount_due);
  if (ad > 0) return ad;

  const total = pick(inv?.total);
  if (total > 0) return total;

  return pick(inv?.amount_paid);
}

function shouldCreditMonthlyForInvoice(inv: any): boolean {
  // Evita creditar em invoices de proration/upgrade/etc.
  // - subscription_cycle: cobrança recorrente
  // - subscription_create: primeira cobrança
  const reason = String(inv?.billing_reason || "").toLowerCase();
  if (!reason) return true;
  return reason === "subscription_cycle" || reason === "subscription_create";
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

async function getEmailFromCheckoutSession(session: any): Promise<string | null> {
  return (
    normalizeEmail(session?.customer_details?.email) ||
    normalizeEmail(session?.customer_email) ||
    normalizeEmail(session?.metadata?.email) ||
    null
  );
}

async function getEmailFromInvoice(inv: any): Promise<string | null> {
  const fromInvoice = normalizeEmail(inv?.customer_email);
  if (fromInvoice) return fromInvoice;

  const customerId = getStripeCustomerIdFromInvoice(inv);
  if (!customerId) return null;

  try {
    const c: any = await stripe.customers.retrieve(customerId);
    return normalizeEmail(c?.email);
  } catch {
    return null;
  }
}

async function markCompraNoSistema(
  tx: Prisma.TransactionClient,
  params: { clienteId?: number; clienteEmail?: string | null }
) {
  const email = normalizeEmail(params.clienteEmail);
  const ops: Promise<any>[] = [];

  if (typeof params.clienteId === "number" && Number.isFinite(params.clienteId) && params.clienteId > 0) {
    ops.push(
      tx.cliente.updateMany({
        where: { ID: params.clienteId },
        data: { COMPRA_NO_SISTEMA: true },
      })
    );
  }

  if (email) {
    ops.push(
      tx.cliente.updateMany({
        where: { EMAIL: email },
        data: { COMPRA_NO_SISTEMA: true },
      })
    );
  }

  if (ops.length) await Promise.all(ops);
}

async function upsertAssinaturaFaturaAndSideEffects(params: {
  tx: Prisma.TransactionClient;
  assinaturaId: number;
  clienteId: number;
  planoId: number;
  invoice: any;
  targetStatus: "PAGO" | "FALHOU";
  clienteEmail?: string | null;
}) {
  const { tx, assinaturaId, clienteId, planoId, invoice, targetStatus, clienteEmail } = params;
  if (!invoice?.id) return;

  const invoiceId = String(invoice.id);
  if (!invoiceId) return;

  const periodoInicio =
    typeof invoice?.period_start === "number" ? toDateFromUnixSeconds(invoice.period_start) || undefined : undefined;
  const periodoFim =
    typeof invoice?.period_end === "number" ? toDateFromUnixSeconds(invoice.period_end) || undefined : undefined;

  const isPaid = targetStatus === "PAGO";
  const amountCents = getInvoiceAmountCents(invoice, isPaid);
  const valor = new Prisma.Decimal(amountCents).div(100);

  let creditosParaConceder = 0;
  if (isPaid && shouldCreditMonthlyForInvoice(invoice)) {
    const plano = await tx.plano.findUnique({
      where: { ID: planoId },
      select: { QUANT_CREDITO_MENSAL: true },
    });
    const creditos = Number(plano?.QUANT_CREDITO_MENSAL || 0);
    if (creditos > 0) creditosParaConceder = creditos;
  }

  let created: { ID: number; STATUS: string; CREDITOS_CONCEDIDOS: number } | null = null;
  try {
    created = await tx.assinatura_fatura.create({
      data: {
        ID_ASSINATURA: assinaturaId,
        STRIPE_INVOICE_ID: invoiceId,
        STATUS: targetStatus,
        VALOR: valor,
        CREDITOS_CONCEDIDOS: isPaid ? creditosParaConceder : 0,
        PERIODO_INICIO: periodoInicio,
        PERIODO_FIM: periodoFim,
      },
      select: { ID: true, STATUS: true, CREDITOS_CONCEDIDOS: true },
    });
  } catch (e) {
    if (!isPrismaUniqueError(e)) throw e;
  }

  if (created) {
    if (isPaid) {
      await markCompraNoSistema(tx, { clienteId, clienteEmail });

      if (creditosParaConceder > 0) {
        await tx.cliente.update({
          where: { ID: clienteId },
          data: { SALDO: { increment: new Prisma.Decimal(creditosParaConceder) } },
        });
      }

      await tx.log_transacao.create({
        data: {
          TIPO: "ASSINATURA",
          ID_CLIENTE: clienteId,
          STATUS: "PAGO",
          VALOR: valor,
          DATA_TRANSACAO: new Date(),
        },
      });
    } else {
      await tx.log_transacao.create({
        data: {
          TIPO: "ASSINATURA",
          ID_CLIENTE: clienteId,
          STATUS: "FALHOU",
          VALOR: valor.mul(-1),
          DATA_TRANSACAO: new Date(),
        },
      });
    }
    return;
  }

  const existing = await tx.assinatura_fatura.findUnique({
    where: { STRIPE_INVOICE_ID: invoiceId },
    select: { ID: true, STATUS: true, CREDITOS_CONCEDIDOS: true },
  });
  if (!existing) return;

  const prevStatus = String(existing.STATUS || "").toUpperCase();

  if (!isPaid && prevStatus === "PAGO") return;

  if (isPaid) {
    const wasCreditedBefore = Number(existing.CREDITOS_CONCEDIDOS || 0) > 0;
    const shouldCreditNow = creditosParaConceder > 0 && !wasCreditedBefore;

    if (prevStatus !== "PAGO" || shouldCreditNow) {
      await tx.assinatura_fatura.update({
        where: { STRIPE_INVOICE_ID: invoiceId },
        data: {
          STATUS: "PAGO",
          VALOR: valor,
          CREDITOS_CONCEDIDOS: shouldCreditNow ? creditosParaConceder : existing.CREDITOS_CONCEDIDOS,
          PERIODO_INICIO: periodoInicio,
          PERIODO_FIM: periodoFim,
        },
      });
    }

    await markCompraNoSistema(tx, { clienteId, clienteEmail });

    if (shouldCreditNow) {
      await tx.cliente.update({
        where: { ID: clienteId },
        data: { SALDO: { increment: new Prisma.Decimal(creditosParaConceder) } },
      });
    }

    if (prevStatus !== "PAGO") {
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
    return;
  }

  if (prevStatus !== "FALHOU") {
    await tx.assinatura_fatura.update({
      where: { STRIPE_INVOICE_ID: invoiceId },
      data: {
        STATUS: "FALHOU",
        VALOR: valor,
        CREDITOS_CONCEDIDOS: 0,
        PERIODO_INICIO: periodoInicio,
        PERIODO_FIM: periodoFim,
      },
    });

    await tx.log_transacao.create({
      data: {
        TIPO: "ASSINATURA",
        ID_CLIENTE: clienteId,
        STATUS: "FALHOU",
        VALOR: valor.mul(-1),
        DATA_TRANSACAO: new Date(),
      },
    });
  }
}

async function tryCreateFaturaAndCreditOnPaidInvoice(params: {
  tx: Prisma.TransactionClient;
  assinaturaId: number;
  clienteId: number;
  planoId: number;
  invoice: any;
  clienteEmail?: string | null;
}) {
  const { tx, assinaturaId, clienteId, planoId, invoice, clienteEmail } = params;
  if (!invoice?.id) return;
  if (!isInvoicePaid(invoice)) return;

  await upsertAssinaturaFaturaAndSideEffects({
    tx,
    assinaturaId,
    clienteId,
    planoId,
    invoice,
    targetStatus: "PAGO",
    clienteEmail,
  });
}

export async function stripeWebhookAssinatura(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as any,
      sig,
      requireEnv("STRIPE_WEBHOOK_SECRET_ASSINATURA")
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

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
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed": {
        const payloadSession = event.data.object as Stripe.Checkout.Session;
        const sessionId = String((payloadSession as any)?.id || "");
        if (!sessionId) return res.status(200).json({ received: true });

        const session: any = await stripe.checkout.sessions.retrieve(sessionId);

        if (session?.mode !== "subscription") return res.status(200).json({ received: true });
        if (upper(session?.metadata?.tipo) !== "ASSINATURA") return res.status(200).json({ received: true });

        const clienteEmail = await getEmailFromCheckoutSession(session);

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

        const subAny: any = await stripe.subscriptions.retrieve(subscriptionId);

        const statusAss = mapSubscriptionStatus(subAny?.status);
        const periodStart = toDateFromUnixSeconds(subAny?.current_period_start ?? null);
        const periodEnd = toDateFromUnixSeconds(subAny?.current_period_end ?? null);
        const cancelAtPeriodEnd = !!subAny?.cancel_at_period_end;
        const canceledAt = toDateFromUnixSeconds(subAny?.canceled_at ?? null);
        const stripeCustomerId = getStripeCustomerIdFromSub(subAny);

        const latestInvoice = await getLatestInvoiceFromSubscription(subscriptionId);

        await prisma.$transaction(async (tx) => {
          const ass = await tx.assinatura.findUnique({
            where: { STRIPE_CHECKOUT_SESSION_ID: sessionId },
            select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, ID_PLANO: true },
          });

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

            await tryCreateFaturaAndCreditOnPaidInvoice({
              tx,
              assinaturaId: created.ID,
              clienteId: created.ID_CLIENTE_ADMIN_DA_ASSINATURA,
              planoId: created.ID_PLANO,
              invoice: latestInvoice,
              clienteEmail,
            });

            return;
          }

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

          await tryCreateFaturaAndCreditOnPaidInvoice({
            tx,
            assinaturaId: ass.ID,
            clienteId: ass.ID_CLIENTE_ADMIN_DA_ASSINATURA,
            planoId: ass.ID_PLANO,
            invoice: latestInvoice,
            clienteEmail,
          });
        });

        return res.status(200).json({ received: true });
      }

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

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const inv: any = event.data.object as any;

        const invoiceId = String(inv?.id || "");
        const subscriptionId = getInvoiceSubscriptionId(inv);
        if (!invoiceId || !subscriptionId) return res.status(200).json({ received: true });

        const clienteEmail = await getEmailFromInvoice(inv);

        const priceIds = await getSubscriptionPriceIds(subscriptionId);
        if (!(await hasAnyPlanPrice(priceIds))) {
          return res.status(200).json({ received: true });
        }

        const isPaidEvent = event.type === "invoice.payment_succeeded";
        const statusAss = isPaidEvent ? "ATIVA" : "INADIMPLENTE";

        await prisma.$transaction(async (tx) => {
          const assinatura = await tx.assinatura.findFirst({
            where: { STRIPE_SUBSCRIPTION_ID: subscriptionId },
            select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, ID_PLANO: true },
          });
          if (!assinatura) return;

          await tx.assinatura.update({
            where: { ID: assinatura.ID },
            data: { STATUS: statusAss },
          });

          await upsertAssinaturaFaturaAndSideEffects({
            tx,
            assinaturaId: assinatura.ID,
            clienteId: assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA,
            planoId: assinatura.ID_PLANO,
            invoice: inv,
            targetStatus: isPaidEvent ? "PAGO" : "FALHOU",
            clienteEmail,
          });
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
