import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

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

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

/**
 * Resolve o preço do produto "Créditos" no Stripe.
 * Preferência:
 * 0) STRIPE_CREDITO_PRICE_ID (se existir)
 * 1) product.default_price (expandido)
 * 2) primeiro price ativo do produto (one_time de preferência)
 */
async function resolveStripePriceForProduct(productId: string): Promise<Stripe.Price> {
  const explicitPriceId = (process.env.STRIPE_CREDITO_PRICE_ID || "").trim();
  if (explicitPriceId) {
    const p = await stripe.prices.retrieve(explicitPriceId, { expand: ["product"] });
    return p;
  }

  // 1) tenta default_price
  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });

  const dp = (product as any).default_price as string | Stripe.Price | null | undefined;
  if (dp && typeof dp !== "string") {
    return dp;
  }
  if (dp && typeof dp === "string") {
    const price = await stripe.prices.retrieve(dp, { expand: ["product"] });
    return price;
  }

  // 2) fallback: lista prices do produto
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
    expand: ["data.product"],
  });

  if (!prices.data.length) {
    throw new Error("Produto Stripe sem preço ativo (Price).");
  }

  // tenta pegar um price "one-time" primeiro
  const oneTime = prices.data.find((p) => !p.recurring);
  return oneTime ?? prices.data[0];
}

function getProductIdFromPrice(price: Stripe.Price): string | null {
  const p: any = price.product;
  if (!p) return null;
  if (typeof p === "string") return p;
  if (typeof p === "object" && typeof p.id === "string") return p.id;
  return null;
}

function parseUiMode(v: any): "hosted" | "embedded" {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "embedded") return "embedded";
  return "hosted";
}

/**
 * POST /api/creditos/checkout
 * body: { quantidade: number, uiMode?: "hosted" | "embedded" }
 *
 * - hosted: retorna { url, sessionId }
 * - embedded: retorna { clientSecret, sessionId }
 *
 * ✅ Alinhado com webhook:
 * - metadata.tipo = "CREDITO"
 * - line_items usa Price do produto STRIPE_CREDITO_PRODUCT_ID
 * - compra_credito salva STRIPE_SESSION_ID
 */
export async function criarCheckoutCreditos(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const quantidade = toPositiveInt(req.body?.quantidade);
  if (!quantidade) return res.status(400).json({ error: "Quantidade inválida." });

  // limite anti-abuso
  if (quantidade > 100000) return res.status(400).json({ error: "Quantidade muito alta." });

  const uiMode = parseUiMode(req.body?.uiMode);

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true, EMAIL: true, NOME: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    const productId = requireEnv("STRIPE_CREDITO_PRODUCT_ID");

    // ✅ pega o PRICE do produto no Stripe
    const priceObj = await resolveStripePriceForProduct(productId);

    if (!priceObj?.id) {
      return res.status(500).json({ error: "Preço Stripe inválido (sem id)." });
    }

    // ✅ garante que esse price pertence ao produto exigido pelo webhook
    const priceProductId = getProductIdFromPrice(priceObj);
    if (priceProductId !== productId) {
      return res.status(500).json({
        error: "Price Stripe não pertence ao produto de créditos configurado (STRIPE_CREDITO_PRODUCT_ID).",
      });
    }

    // ✅ só compra avulsa (one_time)
    if (priceObj.type !== "one_time") {
      return res.status(500).json({ error: "O preço do produto no Stripe não é 'one_time'." });
    }

    // ✅ sanity checks
    if (!priceObj.active) {
      return res.status(500).json({ error: "O preço do produto no Stripe está inativo." });
    }
    if (String(priceObj.currency).toLowerCase() !== "brl") {
      return res.status(500).json({ error: "Moeda do Price no Stripe não é BRL." });
    }

    const unitAmount = priceObj.unit_amount; // centavos
    if (unitAmount == null || !Number.isInteger(unitAmount) || unitAmount <= 0) {
      return res.status(500).json({ error: "Preço Stripe sem unit_amount válido." });
    }

    // ⚠️ BRL tem 2 casas
    const valorUnit = new Prisma.Decimal(unitAmount).div(100);
    const valorTotal = valorUnit.mul(quantidade);

    // ✅ metadata travando o webhook (ele pode exigir tipo === CREDITO)
    const metadata: Record<string, string> = {
      tipo: "CREDITO",
      clienteId: String(cliente.ID),
      quantidade: String(quantidade),
      stripePriceId: priceObj.id,
      stripeProductId: productId,
      uiMode: uiMode,
    };

    let session: Stripe.Checkout.Session;

    if (uiMode === "embedded") {
      // Embedded Checkout: retorna client_secret (não url)
      const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");
      const returnUrl =
        process.env.STRIPE_EMBED_RETURN_URL ||
        `${FRONTEND_ORIGIN}/app/planos-creditos?session_id={CHECKOUT_SESSION_ID}`;

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded",
        return_url: returnUrl,

        // evita redirect automático ao concluir (bom pra modal)
        // (se você quiser suportar métodos que exigem redirect, use "if_required")
        redirect_on_completion: "never",

        customer_email: cliente.EMAIL,
        client_reference_id: String(cliente.ID),
        metadata,
        line_items: [
          {
            price: priceObj.id,
            quantity: quantidade,
          },
        ],
      });

      if (!session.client_secret) {
        return res.status(500).json({ error: "Stripe não retornou client_secret para embedded checkout." });
      }
    } else {
      // Hosted Checkout: retorna url
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: requireEnv("STRIPE_SUCCESS_URL"),
        cancel_url: requireEnv("STRIPE_CANCEL_URL"),
        customer_email: cliente.EMAIL,
        client_reference_id: String(cliente.ID),
        metadata,
        line_items: [
          {
            price: priceObj.id,
            quantity: quantidade,
          },
        ],
      });

      if (!session.url) {
        return res.status(500).json({ error: "Stripe não retornou URL de checkout." });
      }
    }

    // ✅ salva compra no banco (webhook valida sessionId e credita)
    // Se essa criação falhar, o webhook vai ignorar (segurança > crédito indevido).
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

    // resposta por modo
    if (uiMode === "embedded") {
      return res.json({ clientSecret: session.client_secret, sessionId: session.id });
    }

    return res.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao criar checkout de créditos." });
  }
}
