import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

/**
 * Resolve o preço do produto "Créditos" no Stripe.
 * Preferência:
 * 1) product.default_price (expandido)
 * 2) primeiro price ativo do produto (não-recorrente se possível)
 */
async function resolveStripePriceForProduct(productId: string): Promise<Stripe.Price> {
  // 1) tenta default_price
  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });

  const dp = (product as any).default_price as string | Stripe.Price | null | undefined;
  if (dp && typeof dp !== "string") {
    // dp já veio expandido como Price
    return dp;
  }
  if (dp && typeof dp === "string") {
    const price = await stripe.prices.retrieve(dp);
    return price;
  }

  // 2) fallback: lista prices do produto
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });

  if (!prices.data.length) {
    throw new Error("Produto Stripe sem preço ativo (Price).");
  }

  // tenta pegar um price "one-time" primeiro
  const oneTime = prices.data.find((p) => !p.recurring);
  return oneTime ?? prices.data[0];
}

/**
 * POST /api/creditos/checkout
 * body: { quantidade: number }
 * Cliente logado -> cria Checkout Session e devolve { url }
 */
export async function criarCheckoutCreditos(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const quantidade = toPositiveInt(req.body?.quantidade);
  if (!quantidade) return res.status(400).json({ error: "Quantidade inválida." });

  // limite anti-abuso
  if (quantidade > 100000) return res.status(400).json({ error: "Quantidade muito alta." });

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true, EMAIL: true, NOME: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    const productId = requireEnv("STRIPE_CREDITO_PRODUCT_ID");

    // ✅ pega o PRICE do produto no Stripe (valor vem do Stripe)
    const priceObj = await resolveStripePriceForProduct(productId);

    if (!priceObj?.id) {
      return res.status(500).json({ error: "Preço Stripe inválido (sem id)." });
    }

    if (priceObj.type !== "one_time") {
      return res.status(500).json({ error: "O preço do produto no Stripe não é 'one_time'." });
    }

    const unitAmount = priceObj.unit_amount; // em centavos (para BRL)
    if (unitAmount == null || !Number.isInteger(unitAmount) || unitAmount <= 0) {
      return res.status(500).json({ error: "Preço Stripe sem unit_amount válido." });
    }

    // ⚠️ Assumindo moeda com 2 casas (BRL). Se você usar moeda zero-decimal, ajuste aqui.
    const valorUnit = new Prisma.Decimal(unitAmount).div(100);
    const valorTotal = valorUnit.mul(quantidade);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: requireEnv("STRIPE_SUCCESS_URL"),
      cancel_url: requireEnv("STRIPE_CANCEL_URL"),
      customer_email: cliente.EMAIL,
      client_reference_id: String(cliente.ID),
      metadata: {
        clienteId: String(cliente.ID),
        quantidade: String(quantidade),
        stripePriceId: priceObj.id,
        stripeProductId: productId,
      },
      line_items: [
        {
          price: priceObj.id,   // ✅ usa o Price do Stripe
          quantity: quantidade, // ✅ recebe só quantidade
        },
      ],
    });

    await prisma.compra_credito.create({
      data: {
        ID_CLIENTE: cliente.ID,
        QUANTIDADE: quantidade,
        VALOR_UNITARIO: valorUnit,
        VALOR_TOTAL: valorTotal,
        STATUS: "PENDENTE",
        STRIPE_SESSION_ID: session.id,
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao criar checkout de créditos." });
  }
}
