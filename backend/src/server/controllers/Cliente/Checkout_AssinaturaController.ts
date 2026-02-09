// src/controllers/assinaturaController.ts
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { stripe } from "../../../lib/stripe";

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

function toPositiveInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function mapStripeSubStatusToDb(status: string) {
  const s = upper(status);
  if (s === "ACTIVE" || s === "TRIALING") return "ATIVA";
  if (s === "PAST_DUE" || s === "UNPAID") return "INADIMPLENTE";
  if (s === "CANCELED") return "CANCELADA";
  if (s === "INCOMPLETE" || s === "INCOMPLETE_EXPIRED") return "PENDENTE";
  return "PENDENTE";
}

function getIdFromExpandable(x: any): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object" && typeof x.id === "string") return x.id;
  return null;
}

// ====== Helpers de resposta/reuso de sessão ======

async function buildCheckoutResponse(params: {
  uiMode: "embedded" | "hosted";
  assinaturaId: number;
  sessionId: string;
}) {
  const sess: any = await stripe.checkout.sessions.retrieve(params.sessionId);

  if (params.uiMode === "embedded") {
    // em embedded precisamos de client_secret
    if (!sess?.client_secret) {
      // pode ocorrer se sessão for hosted; vamos falhar claramente
      return {
        ok: false as const,
        error: "Sessão Stripe existente não retornou client_secret (verifique uiMode).",
      };
    }
    return {
      ok: true as const,
      payload: {
        assinaturaId: params.assinaturaId,
        sessionId: params.sessionId,
        clientSecret: sess.client_secret,
      },
    };
  }

  // hosted -> url
  if (!sess?.url) {
    return {
      ok: false as const,
      error: "Sessão Stripe existente não retornou url (hosted).",
    };
  }

  return {
    ok: true as const,
    payload: {
      assinaturaId: params.assinaturaId,
      sessionId: params.sessionId,
      url: sess.url,
    },
  };
}

/**
 * POST /api/assinatura/checkout
 * body: { planoId: number, uiMode?: "embedded" | "hosted" }
 * Retorna:
 *  - embedded: { assinaturaId, sessionId, clientSecret }
 *  - hosted:   { assinaturaId, sessionId, url }
 *
 * ✅ Corrige duplicidade:
 * - trava o cliente com SELECT ... FOR UPDATE
 * - reaproveita assinatura pendente existente
 * - reaproveita checkout session existente
 */
export async function criarCheckoutAssinatura(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado." });

  const planoId = toPositiveInt(req.body?.planoId);
  const uiMode = String(req.body?.uiMode || "hosted").toLowerCase(); // default hosted

  if (!planoId) return res.status(400).json({ error: "planoId inválido." });
  if (uiMode !== "embedded" && uiMode !== "hosted") {
    return res.status(400).json({ error: "uiMode inválido (embedded | hosted)." });
  }

  try {
    // 1) cliente
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true, STRIPE_CUSTOMER_ID: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    // 2) plano
    const plano = await prisma.plano.findUnique({
      where: { ID: planoId },
      select: { ID: true, NOME: true, ID_STRIPE: true },
    });
    if (!plano) return res.status(404).json({ error: "Plano não encontrado." });

    const priceId = String(plano.ID_STRIPE || "").trim();
    if (!priceId) return res.status(500).json({ error: "Plano sem ID_STRIPE (price) configurado." });

    // 3) garante customer
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

    // embedded usa return_url
    const returnUrl =
      process.env.STRIPE_ASSINATURA_RETURN_URL ||
      `${FRONTEND_ORIGIN}/app/planos-creditos?session_id={CHECKOUT_SESSION_ID}`;

    // hosted usa success_url + cancel_url
    const successUrl =
      process.env.STRIPE_ASSINATURA_SUCCESS_URL ||
      `${FRONTEND_ORIGIN}/app/planos-creditos/sucesso?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      process.env.STRIPE_ASSINATURA_CANCEL_URL || `${FRONTEND_ORIGIN}/app/planos-creditos/cancelado`;

    /**
     * 4) Transaction: trava o cliente + decide se cria ou reaproveita assinatura
     *    Importante: NÃO chamar Stripe dentro da transaction.
     */
    const decision = await prisma.$transaction(async (tx) => {
      // trava a linha do cliente (evita corrida de duas requisições)
      await tx.$queryRaw`SELECT ID FROM cliente WHERE ID = ${cliente.ID} FOR UPDATE`;

      const lockedCliente = await tx.cliente.findUnique({
        where: { ID: cliente.ID },
        select: { ID: true, ID_ASSINATURA: true },
      });
      if (!lockedCliente) throw new Error("Cliente desapareceu durante a transação.");

      if (lockedCliente.ID_ASSINATURA) {
        const atual = await tx.assinatura.findUnique({
          where: { ID: lockedCliente.ID_ASSINATURA },
          select: {
            ID: true,
            STATUS: true,
            ID_PLANO: true,
            STRIPE_CHECKOUT_SESSION_ID: true,
          },
        });

        // vínculo quebrado: limpa e segue criando nova
        if (!atual) {
          await tx.cliente.update({
            where: { ID: lockedCliente.ID },
            data: { ID_ASSINATURA: null },
          });
        } else {
          const st = upper(atual.STATUS);

          // se cancelada, limpa vínculo e permite criar nova
          if (st === "CANCELADA") {
            await tx.cliente.update({
              where: { ID: lockedCliente.ID },
              data: { ID_ASSINATURA: null },
            });
          } else if (st === "ATIVA" || st === "INADIMPLENTE") {
            // já tem assinatura válida
            return {
              action: "BLOCK" as const,
              message: "Você já possui uma assinatura ativa/inadimplente. Cancele antes de criar outra.",
            };
          } else if (st === "PENDENTE") {
            // reaproveita pendente existente (não cria outra)
            if (atual.ID_PLANO !== planoId) {
              return {
                action: "BLOCK" as const,
                message:
                  "Você já possui uma assinatura pendente de outro plano. Conclua ou cancele antes de iniciar outra.",
              };
            }

            return {
              action: "REUSE" as const,
              assinaturaId: atual.ID,
              stripeSessionId: atual.STRIPE_CHECKOUT_SESSION_ID || null,
            };
          } else {
            // qualquer outro status não previsto -> por segurança bloqueia
            return {
              action: "BLOCK" as const,
              message: `Assinatura em estado inválido: ${atual.STATUS}`,
            };
          }
        }
      }

      // cria nova assinatura PENDENTE e vincula ao cliente (atômico)
      const nova = await tx.assinatura.create({
        data: {
          ID_PLANO: plano.ID,
          NOME: plano.NOME,
          STATUS: "PENDENTE",
          ID_CLIENTE_ADMIN_DA_ASSINATURA: cliente.ID,
          STRIPE_CUSTOMER_ID: customerId,
        },
        select: { ID: true },
      });

      await tx.cliente.update({
        where: { ID: cliente.ID },
        data: { ID_ASSINATURA: nova.ID },
      });

      return {
        action: "CREATE" as const,
        assinaturaId: nova.ID,
        stripeSessionId: null as string | null,
      };
    });

    if (decision.action === "BLOCK") {
      return res.status(409).json({ error: decision.message });
    }

    const assinaturaId = decision.assinaturaId;

    // 5) Se já existe Stripe session, reaproveita
    if (decision.stripeSessionId) {
      const reused = await buildCheckoutResponse({
        uiMode: uiMode as "embedded" | "hosted",
        assinaturaId,
        sessionId: decision.stripeSessionId,
      });

      if (!reused.ok) {
        return res.status(500).json({ error: reused.error });
      }

      return res.json(reused.payload);
    }

    // 6) Cria checkout session na Stripe (idempotente por assinatura)
    const commonParams: any = {
      mode: "subscription",
      customer: customerId,
      client_reference_id: String(cliente.ID),
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        tipo: "ASSINATURA",
        assinaturaId: String(assinaturaId),
        clienteId: String(cliente.ID),
        planoId: String(plano.ID),
      },
      subscription_data: {
        metadata: {
          tipo: "ASSINATURA",
          assinaturaId: String(assinaturaId),
          clienteId: String(cliente.ID),
          planoId: String(plano.ID),
        },
      },
    };

    let session: any;
    try {
      session =
        uiMode === "embedded"
          ? await stripe.checkout.sessions.create(
              {
                ...commonParams,
                ui_mode: "embedded",
                return_url: returnUrl,
              },
              { idempotencyKey: `compatbio_assinatura_${assinaturaId}_embedded` }
            )
          : await stripe.checkout.sessions.create(
              {
                ...commonParams,
                success_url: successUrl,
                cancel_url: cancelUrl,
              },
              { idempotencyKey: `compatbio_assinatura_${assinaturaId}_hosted` }
            );
    } catch (e: any) {
      // ✅ auto-heal: se Stripe falhar, cancela no DB e desvincula o cliente (não deixa preso em PENDENTE)
      await prisma.$transaction(async (tx) => {
        await tx.assinatura.updateMany({
          where: { ID: assinaturaId, STATUS: "PENDENTE" },
          data: {
            STATUS: "CANCELADA",
            DATA_CANCELAMENTO: new Date(),
            PERIODO_ATUAL_FIM: new Date(),
            CANCEL_AT_PERIOD_END: false,
          },
        });

        await tx.cliente.updateMany({
          where: { ID_ASSINATURA: assinaturaId },
          data: { ID_ASSINATURA: null },
        });
      });

      console.error("[criarCheckoutAssinatura] Stripe create session error:", e?.message || e);
      return res.status(500).json({ error: "Erro ao criar checkout na Stripe. Tente novamente." });
    }

    // 7) Salva session id
    await prisma.assinatura.update({
      where: { ID: assinaturaId },
      data: { STRIPE_CHECKOUT_SESSION_ID: session.id },
    });

    // 8) Resposta
    if (uiMode === "embedded") {
      if (!session.client_secret) {
        return res.status(500).json({ error: "Stripe não retornou client_secret para embedded." });
      }
      return res.json({ assinaturaId, sessionId: session.id, clientSecret: session.client_secret });
    }

    if (!session.url) {
      return res.status(500).json({ error: "Stripe não retornou url para hosted." });
    }

    return res.json({ assinaturaId, sessionId: session.id, url: session.url });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao criar checkout de assinatura." });
  }
}

/**
 * POST /api/assinatura/cancelar
 * Cancela IMEDIATO no Stripe + marca CANCELADA no DB + desvincula todos os clientes.
 *
 * Regras:
 * - somente o DONO/ADMIN (ID_CLIENTE_ADMIN_DA_ASSINATURA) pode cancelar
 * - ao cancelar, TODOS clientes vinculados devem ser automaticamente desvinculados
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

    const assinaturaIdVinculada = cliente.ID_ASSINATURA;

    // 2) assinatura do cliente
    const assinatura = await prisma.assinatura.findUnique({
      where: { ID: assinaturaIdVinculada },
      select: {
        ID: true,
        STATUS: true,
        ID_CLIENTE_ADMIN_DA_ASSINATURA: true,
        STRIPE_SUBSCRIPTION_ID: true,
        STRIPE_CHECKOUT_SESSION_ID: true,
        ID_VINCULO_STRIPE: true,
      },
    });

    // vínculo quebrado -> limpa todos que apontam para o ID
    if (!assinatura) {
      await prisma.cliente.updateMany({
        where: { ID_ASSINATURA: assinaturaIdVinculada },
        data: { ID_ASSINATURA: null },
      });

      return res.json({ ok: true, message: "Vínculo inválido removido.", assinaturaId: null });
    }

    // só o dono/admin cancela
    if (assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA !== cliente.ID) {
      return res.status(403).json({ error: "Apenas o administrador (dono) da assinatura pode cancelar." });
    }

    // idempotência: se já cancelada, garante desvinculação
    if (upper(assinatura.STATUS) === "CANCELADA") {
      await prisma.cliente.updateMany({
        where: { ID_ASSINATURA: assinatura.ID },
        data: { ID_ASSINATURA: null },
      });

      return res.json({
        ok: true,
        assinaturaId: assinatura.ID,
        statusDb: "CANCELADA",
        stripe: null,
      });
    }

    // resolve subscriptionId (com fallbacks)
    let subscriptionId: string | null = assinatura.STRIPE_SUBSCRIPTION_ID ?? null;

    if (!subscriptionId && assinatura.STRIPE_CHECKOUT_SESSION_ID) {
      try {
        const sess: any = await stripe.checkout.sessions.retrieve(assinatura.STRIPE_CHECKOUT_SESSION_ID, {
          expand: ["subscription"],
        } as any);
        subscriptionId = getIdFromExpandable(sess?.subscription);
      } catch {
        // ignora
      }
    }

    if (!subscriptionId && assinatura.ID_VINCULO_STRIPE) {
      subscriptionId = String(assinatura.ID_VINCULO_STRIPE || "").trim() || null;
    }

    // cancela no Stripe (se houver subscription)
    let stripeCancelInfo: any = null;

    if (subscriptionId) {
      try {
        const current: any = await (stripe.subscriptions as any).retrieve(subscriptionId);

        const alreadyCanceled =
          String(current?.status || "").toLowerCase() === "canceled" || !!current?.canceled_at;

        if (!alreadyCanceled) {
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
        console.error("[cancelarAssinatura] Stripe cancel error:", e?.message || e);
      }
    }

    // DB: marca CANCELADA + desvincula TODOS
    await prisma.$transaction(async (tx) => {
      await tx.assinatura.updateMany({
        where: { ID: assinatura.ID, STATUS: { not: "CANCELADA" } },
        data: {
          STATUS: "CANCELADA",
          CANCEL_AT_PERIOD_END: false,
          DATA_CANCELAMENTO: new Date(),
          PERIODO_ATUAL_FIM: new Date(),
        },
      });

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
        subscriptionId,
        status: stripeCancelInfo?.status ?? null,
        canceled_at: stripeCancelInfo?.canceled_at ?? null,
      },
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao cancelar assinatura." });
  }
}
