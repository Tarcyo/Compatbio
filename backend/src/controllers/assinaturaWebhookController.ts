// src/controllers/stripeAssinaturaWebhookController.ts
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function isLivemodeMismatch(eventLivemode: boolean) {
  const key = requireEnv("STRIPE_SECRET_KEY");
  const isLiveKey = key.startsWith("sk_live_");
  return Boolean(eventLivemode) !== isLiveKey;
}

function mapStripeSubStatusToDb(status: string) {
  const s = upper(status);
  if (s === "ACTIVE" || s === "TRIALING") return "ATIVA";
  if (s === "PAST_DUE" || s === "UNPAID") return "INADIMPLENTE";
  if (s === "CANCELED") return "CANCELADA";
  if (s === "INCOMPLETE" || s === "INCOMPLETE_EXPIRED") return "PENDENTE";
  return "PENDENTE";
}

function toDateFromUnixSeconds(sec: number | null | undefined) {
  if (!sec || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000);
}

/**
 * Compatibilidade: algumas versões antigas dos types do Stripe não expõem
 * current_period_start/current_period_end/cancel_at_period_end no tipo Subscription.
 * Então lemos via "any" com validação.
 */
function getSubCurrentPeriodStart(sub: Stripe.Subscription): number | null {
  const anySub: any = sub as any;
  const v = anySub?.current_period_start;
  return typeof v === "number" ? v : null;
}

function getSubCurrentPeriodEnd(sub: Stripe.Subscription): number | null {
  const anySub: any = sub as any;
  const v = anySub?.current_period_end;
  return typeof v === "number" ? v : null;
}

function getSubCancelAtPeriodEnd(sub: Stripe.Subscription): boolean {
  const anySub: any = sub as any;
  return Boolean(anySub?.cancel_at_period_end);
}

async function getPlanoIdBySubscription(sub: Stripe.Subscription) {
  // Também pode variar por versão: garantimos acesso via any
  const anySub: any = sub as any;
  const priceId: string | undefined =
    anySub?.items?.data?.[0]?.price?.id || anySub?.plan?.id || undefined;

  if (!priceId) return null;

  const plano = await prisma.plano.findFirst({
    where: { ID_STRIPE: priceId },
    select: { ID: true, NOME: true },
  });

  return plano ? { planoId: plano.ID, planoNome: plano.NOME } : null;
}

/**
 * Compatível com versões de types do Stripe que não expõem inv.subscription no type.
 * Preferimos pegar subscription por inv.lines.data[0].subscription,
 * e fazemos fallback para inv["subscription"] via any.
 */
function getSubscriptionIdFromInvoice(inv: Stripe.Invoice): string {
  const line0: any = inv.lines?.data?.[0];
  if (typeof line0?.subscription === "string") return line0.subscription;

  const anyInv: any = inv as any;
  if (typeof anyInv.subscription === "string") return anyInv.subscription;

  return "";
}

/**
 * POST /stripe/webhook-assinatura
 * ✅ assinatura obrigatória (STRIPE_WEBHOOK_SECRET_ASSINATURA)
 * ✅ ignora qualquer evento fora do escopo
 *
 * IMPORTANTE:
 * - Este endpoint precisa de `express.raw({ type: "application/json" })` na rota,
 *   para que `req.body` chegue como Buffer (Stripe webhook signature validation).
 */
export async function stripeAssinaturaWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("Missing stripe-signature");
  }

  let event: Stripe.Event;
  try {
    // req.body precisa ser Buffer (express.raw no app.ts)
    event = stripe.webhooks.constructEvent(
      req.body as any,
      sig,
      requireEnv("STRIPE_WEBHOOK_SECRET_ASSINATURA")
    );
  } catch (err: any) {
    console.error("Webhook assinatura: signature failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  // trava ambiente (test vs live)
  if (isLivemodeMismatch(Boolean(event.livemode))) {
    return res.status(200).json({ received: true });
  }

  // ✅ Só aceitamos eventos relevantes de assinatura
  const allowed = new Set([
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]);

  if (!allowed.has(event.type)) {
    return res.status(200).json({ received: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // só assinatura
      if (session.mode !== "subscription") return res.status(200).json({ received: true });
      if (upper(session.metadata?.tipo) !== "ASSINATURA")
        return res.status(200).json({ received: true });

      const assinaturaId = Number(session.metadata?.assinaturaId || 0);
      if (!Number.isFinite(assinaturaId) || assinaturaId <= 0)
        return res.status(200).json({ received: true });

      const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
      if (!subscriptionId) return res.status(200).json({ received: true });

      const sub = await stripe.subscriptions.retrieve(subscriptionId);

      // valida plano (tem que ser um price do seu BD)
      const plano = await getPlanoIdBySubscription(sub);
      if (!plano) return res.status(200).json({ received: true });

      await prisma.$transaction(async (tx) => {
        // idempotência: se já tem stripe subscription id gravado, não reprocessa
        const current = await tx.assinatura.findUnique({
          where: { ID: assinaturaId },
          select: { STRIPE_SUBSCRIPTION_ID: true, STRIPE_CHECKOUT_SESSION_ID: true },
        });
        if (!current) return;
        if (current.STRIPE_SUBSCRIPTION_ID) return;

        // opcional: amarrar no session_id registrado
        if (current.STRIPE_CHECKOUT_SESSION_ID && session.id !== current.STRIPE_CHECKOUT_SESSION_ID)
          return;

        await tx.assinatura.update({
          where: { ID: assinaturaId },
          data: {
            ID_PLANO: plano.planoId,
            NOME: plano.planoNome,

            STRIPE_SUBSCRIPTION_ID: (sub as any).id,
            STRIPE_CUSTOMER_ID:
              typeof (sub as any).customer === "string" ? (sub as any).customer : null,

            STATUS: mapStripeSubStatusToDb(String((sub as any).status || "")),
            PERIODO_ATUAL_INICIO: toDateFromUnixSeconds(getSubCurrentPeriodStart(sub)),
            PERIODO_ATUAL_FIM: toDateFromUnixSeconds(getSubCurrentPeriodEnd(sub)),
            CANCEL_AT_PERIOD_END: getSubCancelAtPeriodEnd(sub),
          },
        });
      });

      return res.status(200).json({ received: true });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;

      const plano = await getPlanoIdBySubscription(sub);
      if (!plano) return res.status(200).json({ received: true });

      await prisma.assinatura.updateMany({
        where: { STRIPE_SUBSCRIPTION_ID: (sub as any).id },
        data: {
          ID_PLANO: plano.planoId,
          NOME: plano.planoNome,

          STATUS: mapStripeSubStatusToDb(String((sub as any).status || "")),
          PERIODO_ATUAL_INICIO: toDateFromUnixSeconds(getSubCurrentPeriodStart(sub)),
          PERIODO_ATUAL_FIM: toDateFromUnixSeconds(getSubCurrentPeriodEnd(sub)),
          CANCEL_AT_PERIOD_END: getSubCancelAtPeriodEnd(sub),
          STRIPE_CUSTOMER_ID:
            typeof (sub as any).customer === "string" ? (sub as any).customer : null,
        },
      });

      return res.status(200).json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;

      await prisma.assinatura.updateMany({
        where: { STRIPE_SUBSCRIPTION_ID: (sub as any).id },
        data: {
          STATUS: "CANCELADA",
          CANCEL_AT_PERIOD_END: false,
          DATA_CANCELAMENTO: new Date(),
        },
      });

      return res.status(200).json({ received: true });
    }

    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const subId = getSubscriptionIdFromInvoice(inv);
      if (!subId) return res.status(200).json({ received: true });

      await prisma.assinatura.updateMany({
        where: { STRIPE_SUBSCRIPTION_ID: subId },
        data: { STATUS: "INADIMPLENTE" },
      });

      return res.status(200).json({ received: true });
    }

    if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const subId = getSubscriptionIdFromInvoice(inv);
      if (!subId) return res.status(200).json({ received: true });

      await prisma.assinatura.updateMany({
        where: { STRIPE_SUBSCRIPTION_ID: subId },
        data: { STATUS: "ATIVA" },
      });

      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    // 500 -> Stripe tenta reenviar (melhor consistência)
    return res.status(500).send("Webhook assinatura handler failed.");
  }
}
