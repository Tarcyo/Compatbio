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

function getProductIdFromLineItem(li: Stripe.LineItem): string | null {
  // li.price.product pode ser string (id) ou objeto expandido
  const p: any = li?.price?.product;
  if (!p) return null;
  if (typeof p === "string") return p;
  if (typeof p === "object" && typeof p.id === "string") return p.id;
  return null;
}

export async function stripeWebhook(req: Request, res: Response) {
  // 1) assinatura é obrigatória sempre
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("Missing stripe-signature");
  }

  let event: Stripe.Event;
  try {
    // req.body precisa ser Buffer (express.raw no app.ts)
    event = stripe.webhooks.constructEvent(req.body, sig, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  // 2) aceite SOMENTE este tipo de evento (qualquer outro: sai imediatamente)
  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const payloadSession = event.data.object as Stripe.Checkout.Session;
  const sessionId = String(payloadSession?.id || "");
  if (!sessionId) return res.status(200).json({ received: true });

  try {
    const CREDIT_PRODUCT_ID = requireEnv("STRIPE_CREDITO_PRODUCT_ID");

    // 3) re-busca a sessão no Stripe (não confia apenas no payload do evento)
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // ainda mais restrições
    if (session.mode !== "payment") return res.status(200).json({ received: true });
    if (session.payment_status !== "paid") return res.status(200).json({ received: true });

    // (recomendado) trava por metadata também
    if (upper(session.metadata?.tipo) !== "CREDITO") {
      return res.status(200).json({ received: true });
    }

    // 4) busca line items e valida se o produto é EXATAMENTE o de crédito
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    const creditItems = (lineItems.data || []).filter(
      (li) => getProductIdFromLineItem(li) === CREDIT_PRODUCT_ID
    );

    if (creditItems.length === 0) {
      // evento não é da compra do produto "Créditos" (ID específico)
      return res.status(200).json({ received: true });
    }

    const qty = creditItems.reduce((sum, li) => sum + (li.quantity ?? 0), 0);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(200).json({ received: true });

    // 5) busca a compra no banco pelo sessionId (idempotência + segurança)
    const compra = await prisma.compra_credito.findUnique({
      where: { STRIPE_SESSION_ID: sessionId },
      select: { ID: true, ID_CLIENTE: true, QUANTIDADE: true, VALOR_TOTAL: true, STATUS: true },
    });

    if (!compra) return res.status(200).json({ received: true });
    if (upper(compra.STATUS) === "PAGO") return res.status(200).json({ received: true });

    // trava contra mismatch de quantidade (sinal de sessão “errada”)
    if (Number(compra.QUANTIDADE) !== qty) {
      console.warn(
        `[WEBHOOK] Quantidade divergente: compra=${compra.QUANTIDADE} stripe=${qty} session=${sessionId}`
      );
      return res.status(200).json({ received: true });
    }

    // 6) transação + idempotência forte (evita “duplo crédito” por reentrega)
    await prisma.$transaction(async (tx) => {
      const upd = await tx.compra_credito.updateMany({
        where: { STRIPE_SESSION_ID: sessionId, STATUS: { not: "PAGO" } },
        data: { STATUS: "PAGO", DATA_PAGAMENTO: new Date() },
      });

      // se já atualizou antes (ou corrida), não aplica crédito
      if (upd.count === 0) return;

      await tx.cliente.update({
        where: { ID: compra.ID_CLIENTE },
        data: {
          SALDO: { increment: new Prisma.Decimal(compra.QUANTIDADE) },
          COMPRA_NO_SISTEMA: true,
        },
      });

      await tx.log_transacao.create({
        data: {
          TIPO: "COMPRA_AVULSA",
          ID_CLIENTE: compra.ID_CLIENTE,
          STATUS: "PAGO",
          VALOR: new Prisma.Decimal(compra.VALOR_TOTAL),
          DATA_TRANSACAO: new Date(),
        },
      });
    });

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Webhook handler failed.");
  }
}
