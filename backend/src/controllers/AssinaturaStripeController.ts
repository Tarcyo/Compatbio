// src/controllers/assinaturaController.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function mapStripeSubStatusToDb(status: string) {
  const s = upper(status);
  if (s === "ACTIVE" || s === "TRIALING") return "ATIVA";
  if (s === "PAST_DUE" || s === "UNPAID") return "INADIMPLENTE";
  if (s === "CANCELED") return "CANCELADA";
  if (s === "INCOMPLETE" || s === "INCOMPLETE_EXPIRED") return "PENDENTE";
  return "PENDENTE";
}

/**
 * POST /api/assinatura/checkout
 * body: { planoId: number, uiMode?: "embedded" | "hosted" }
 * Retorna { assinaturaId, sessionId, clientSecret? , url? }
 *
 * ✅ FIX:
 * - return_url só pode ser usado com ui_mode: embedded
 * - hosted deve usar success_url + cancel_url (e NÃO return_url)
 */
export async function criarCheckoutAssinatura(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const planoId = toPositiveInt(req.body?.planoId);
  const uiMode = String(req.body?.uiMode || "hosted").toLowerCase(); // default = hosted (Opção A)

  if (!planoId) return res.status(400).json({ error: "planoId inválido." });
  if (uiMode !== "embedded" && uiMode !== "hosted") {
    return res.status(400).json({ error: "uiMode inválido (embedded | hosted)." });
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true, STRIPE_CUSTOMER_ID: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    // se já existe assinatura ativa/pendente, bloqueia
    if (cliente.ID_ASSINATURA) {
      const atual = await prisma.assinatura.findUnique({
        where: { ID: cliente.ID_ASSINATURA },
        select: { ID: true, STATUS: true },
      });
      const st = upper(atual?.STATUS);
      if (st && ["ATIVA", "PENDENTE", "INADIMPLENTE"].includes(st)) {
        return res
          .status(409)
          .json({ error: "Você já possui uma assinatura ativa/pendente. Cancele antes de criar outra." });
      }
    }

    const plano = await prisma.plano.findUnique({
      where: { ID: planoId },
      select: { ID: true, NOME: true, ID_STRIPE: true },
    });
    if (!plano) return res.status(404).json({ error: "Plano não encontrado." });

    const priceId = String(plano.ID_STRIPE || "").trim();
    if (!priceId) return res.status(500).json({ error: "Plano sem ID_STRIPE (price) configurado." });

    // garante customer
    let customerId = cliente.STRIPE_CUSTOMER_ID;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: cliente.EMAIL,
        name: cliente.NOME,
        metadata: { clienteId: String(cliente.ID) },
      });
      customerId = customer.id;

      await prisma.cliente.update({
        where: { ID: cliente.ID },
        data: { STRIPE_CUSTOMER_ID: customerId },
      });
    }

    const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");

    // ✅ Embedded usa return_url (obrigatório/permitido)
    const returnUrl =
      process.env.STRIPE_ASSINATURA_RETURN_URL ||
      `${FRONTEND_ORIGIN}/app/planos-creditos?session_id={CHECKOUT_SESSION_ID}`;

    // ✅ Hosted usa success_url + cancel_url
    const successUrl =
      process.env.STRIPE_ASSINATURA_SUCCESS_URL ||
      `${FRONTEND_ORIGIN}/app/planos-creditos/sucesso?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      process.env.STRIPE_ASSINATURA_CANCEL_URL ||
      `${FRONTEND_ORIGIN}/app/planos-creditos/cancelado`;

    // cria registro PENDENTE no BD (vamos “selar” pelo metadata + session id)
    const assinatura = await prisma.assinatura.create({
      data: {
        ID_PLANO: plano.ID,
        NOME: plano.NOME,
        STATUS: "PENDENTE",
        ID_CLIENTE_ADMIN_DA_ASSINATURA: cliente.ID,
        STRIPE_CUSTOMER_ID: customerId,
      },
      select: { ID: true },
    });

    // Monta payload do Stripe de forma condicional (sem enviar parâmetros incompatíveis)
    const commonParams: any = {
      mode: "subscription",
      customer: customerId,
      client_reference_id: String(cliente.ID),
      line_items: [{ price: priceId, quantity: 1 }],

      // trava extra pro webhook reconhecer
      metadata: {
        tipo: "ASSINATURA",
        assinaturaId: String(assinatura.ID),
        clienteId: String(cliente.ID),
        planoId: String(plano.ID),
      },
      subscription_data: {
        metadata: {
          tipo: "ASSINATURA",
          assinaturaId: String(assinatura.ID),
          clienteId: String(cliente.ID),
          planoId: String(plano.ID),
        },
      },
    };

    const session =
      uiMode === "embedded"
        ? await stripe.checkout.sessions.create({
            ...commonParams,
            ui_mode: "embedded",
            return_url: returnUrl, // ✅ permitido apenas no embedded
          })
        : await stripe.checkout.sessions.create({
            ...commonParams,
            // ui_mode default é hosted; pode omitir para evitar incompatibilidade
            // ui_mode: "hosted",
            success_url: successUrl, // ✅ hosted
            cancel_url: cancelUrl, // ✅ hosted
          });

    await prisma.assinatura.update({
      where: { ID: assinatura.ID },
      data: { STRIPE_CHECKOUT_SESSION_ID: session.id },
    });

    // opcional: vincula imediatamente no cliente (como “assinatura em criação”)
    await prisma.cliente.update({
      where: { ID: cliente.ID },
      data: { ID_ASSINATURA: assinatura.ID },
    });

    if (uiMode === "embedded") {
      if (!session.client_secret) {
        return res.status(500).json({ error: "Stripe não retornou client_secret para embedded." });
      }
      return res.json({ assinaturaId: assinatura.ID, sessionId: session.id, clientSecret: session.client_secret });
    }

    // hosted
    return res.json({ assinaturaId: assinatura.ID, sessionId: session.id, url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar checkout de assinatura." });
  }
}



function getIdFromExpandable(x: any): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object" && typeof x.id === "string") return x.id;
  return null;
}

/**
 * POST /api/assinatura/cancelar
 * Cancela IMEDIATO no Stripe + marca CANCELADA no DB + desvincula todos os clientes.
 *
 * Regras:
 * - somente o DONO/ADMIN (ID_CLIENTE_ADMIN_DA_ASSINATURA) pode cancelar
 */
export async function cancelarAssinatura(req: Request, res: Response) {
  const email = req.auth?.email;
  const clienteIdAuth = req.auth?.clienteId;

  if (!email && !clienteIdAuth) return res.status(401).json({ error: "Não autenticado." });

  try {
    // 1) cliente logado
    const cliente = await prisma.cliente.findUnique({
      where: clienteIdAuth ? { ID: clienteIdAuth } : { EMAIL: email! },
      select: { ID: true, EMAIL: true, ID_ASSINATURA: true },
    });

    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });
    if (!cliente.ID_ASSINATURA) {
      return res.status(404).json({ error: "Cliente não possui assinatura vinculada." });
    }

    // 2) assinatura do cliente
    const assinatura = await prisma.assinatura.findUnique({
      where: { ID: cliente.ID_ASSINATURA },
      select: {
        ID: true,
        STATUS: true,
        ID_CLIENTE_ADMIN_DA_ASSINATURA: true,
        STRIPE_SUBSCRIPTION_ID: true,
        STRIPE_CHECKOUT_SESSION_ID: true,
        ID_VINCULO_STRIPE: true, // fallback antigo
      },
    });

    if (!assinatura) {
      // vínculo quebrado -> limpa e sai
      await prisma.cliente.updateMany({
        where: { ID: cliente.ID, ID_ASSINATURA: cliente.ID_ASSINATURA },
        data: { ID_ASSINATURA: null },
      });
      return res.json({ ok: true, message: "Vínculo inválido removido.", assinaturaId: null });
    }

    // ✅ só o dono/admin cancela
    if (assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA !== cliente.ID) {
      return res.status(403).json({ error: "Apenas o administrador (dono) da assinatura pode cancelar." });
    }

    // 3) resolve subscriptionId (com fallbacks)
    let subscriptionId: string | null = assinatura.STRIPE_SUBSCRIPTION_ID ?? null;

    if (!subscriptionId && assinatura.STRIPE_CHECKOUT_SESSION_ID) {
      try {
        const sess: any = await stripe.checkout.sessions.retrieve(assinatura.STRIPE_CHECKOUT_SESSION_ID, {
          expand: ["subscription"],
        } as any);
        subscriptionId = getIdFromExpandable(sess?.subscription);
      } catch {
        // ignora, vamos tentar outros fallbacks
      }
    }

    if (!subscriptionId && assinatura.ID_VINCULO_STRIPE) {
      // ⚠️ se no seu legado ID_VINCULO_STRIPE guardava o subscription id, isso resolve
      subscriptionId = String(assinatura.ID_VINCULO_STRIPE || "").trim() || null;
    }

    // 4) cancela IMEDIATO no Stripe (se houver subscription)
    //    (se não tiver subscriptionId, ainda assim vamos cancelar no DB e desvincular)
    let stripeCancelInfo: any = null;

    if (subscriptionId) {
      try {
        // busca estado atual
        const current: any = await (stripe.subscriptions as any).retrieve(subscriptionId);

        const alreadyCanceled =
          String(current?.status || "").toLowerCase() === "canceled" || !!current?.canceled_at;

        if (!alreadyCanceled) {
          // ✅ cancela IMEDIATO (não agenda)
          // stripe-node pode ter cancel() ou del() dependendo da versão
          if (typeof (stripe.subscriptions as any).cancel === "function") {
            stripeCancelInfo = await (stripe.subscriptions as any).cancel(subscriptionId, {
              invoice_now: false,
              prorate: false,
            });
          } else {
            stripeCancelInfo = await (stripe.subscriptions as any).del(subscriptionId, {
              invoice_now: false,
              prorate: false,
            });
          }
        } else {
          stripeCancelInfo = current;
        }
      } catch (e: any) {
        // se o recurso não existir no Stripe, ainda assim vamos cancelar no DB
        console.error("[cancelarAssinatura] Stripe cancel error:", e?.message || e);
      }
    }

    // 5) DB: marca CANCELADA + desvincula TODOS clientes (inclusive o dono)
    await prisma.$transaction(async (tx) => {
      // marca assinatura cancelada (idempotente)
      await tx.assinatura.updateMany({
        where: { ID: assinatura.ID, STATUS: { not: "CANCELADA" } },
        data: {
          STATUS: "CANCELADA",
          CANCEL_AT_PERIOD_END: false,
          DATA_CANCELAMENTO: new Date(),
          PERIODO_ATUAL_FIM: new Date(),
        },
      });

      // desvincula todos os clientes dessa assinatura
      await tx.cliente.updateMany({
        where: { ID_ASSINATURA: assinatura.ID },
        data: { ID_ASSINATURA: null },
      });
    });

    return res.json({
      ok: true,
      assinaturaId: assinatura.ID,
      statusDb: "CANCELADA",
      stripe: {
        subscriptionId: subscriptionId,
        status: stripeCancelInfo?.status ?? null,
        canceled_at: stripeCancelInfo?.canceled_at ?? null,
      },
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao cancelar assinatura." });
  }
}
