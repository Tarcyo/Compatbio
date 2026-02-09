import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

export async function getAssinaturaAtual(req: Request, res: Response) {
  const email = req.auth?.email;
  if (!email) return res.status(401).json({ error: "Não autenticado" });

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      select: {
        ID: true,
        EMAIL: true,
        NOME: true,
        ID_ASSINATURA: true,
      },
    });

    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

    if (!cliente.ID_ASSINATURA) {
      return res.json({
        cliente,
        assinatura: null,
        plano: null,
        dono: null,
        clientesVinculados: [],
      });
    }

    const assinatura = await prisma.assinatura.findUnique({
      where: { ID: cliente.ID_ASSINATURA },
      include: {
        plano: true,
        cliente_assinatura_ID_CLIENTE_ADMIN_DA_ASSINATURATocliente: {
          select: {
            ID: true,
            EMAIL: true,
            NOME: true,
            SALDO: true,
            COMPRA_NO_SISTEMA: true,
            ID_EMPRESA: true,
          },
        },
      },
    });

    if (!assinatura) {
      await prisma.cliente.updateMany({
        where: { ID: cliente.ID, ID_ASSINATURA: cliente.ID_ASSINATURA },
        data: { ID_ASSINATURA: null },
      });

      return res.json({
        cliente: { ...cliente, ID_ASSINATURA: null },
        assinatura: null,
        plano: null,
        dono: null,
        clientesVinculados: [],
      });
    }

    if (upper(assinatura.STATUS) === "CANCELADA") {
      await prisma.cliente.updateMany({
        where: { ID_ASSINATURA: assinatura.ID },
        data: { ID_ASSINATURA: null },
      });

      return res.json({
        cliente: { ...cliente, ID_ASSINATURA: null },
        assinatura: null,
        plano: null,
        dono: null,
        clientesVinculados: [],
      });
    }

    const clientesVinculados = await prisma.cliente.findMany({
      where: { ID_ASSINATURA: assinatura.ID },
      orderBy: { ID: "asc" },
      select: {
        ID: true,
        EMAIL: true,
        NOME: true,
        SALDO: true,
        COMPRA_NO_SISTEMA: true,
        ID_EMPRESA: true,
        ID_ASSINATURA: true,
      },
    });

    return res.json({
      cliente,
      assinatura: {
        ID: assinatura.ID,
        NOME: assinatura.NOME,
        STATUS: assinatura.STATUS,
        DATA_ASSINATURA: assinatura.DATA_ASSINATURA,
        ID_PLANO: assinatura.ID_PLANO,
        ID_CLIENTE_ADMIN_DA_ASSINATURA: assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA,
        ID_VINCULO_STRIPE: assinatura.ID_VINCULO_STRIPE,

        STRIPE_SUBSCRIPTION_ID: assinatura.STRIPE_SUBSCRIPTION_ID,
        STRIPE_CHECKOUT_SESSION_ID: assinatura.STRIPE_CHECKOUT_SESSION_ID,
        CANCEL_AT_PERIOD_END: assinatura.CANCEL_AT_PERIOD_END,
        PERIODO_ATUAL_INICIO: assinatura.PERIODO_ATUAL_INICIO,
        PERIODO_ATUAL_FIM: assinatura.PERIODO_ATUAL_FIM,
        DATA_CANCELAMENTO: assinatura.DATA_CANCELAMENTO,
      },
      plano: assinatura.plano,
      dono: assinatura.cliente_assinatura_ID_CLIENTE_ADMIN_DA_ASSINATURATocliente,
      clientesVinculados,
    });
  } catch (e: any) {
    console.error(e);
    return res
      .status(500)
      .json({ error: e?.message || "Erro ao buscar assinatura atual." });
  }
}

function toPositiveInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n <= 0) return null;
  return n;
}

function toPositiveMoney(v: any): number | null {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim().replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0) return null;
  return rounded;
}

async function getClienteLogadoOr401(req: Request, res: Response) {
  const clienteId = req.auth?.clienteId;
  if (!clienteId) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { ID: clienteId },
    select: { ID: true, EMAIL: true, NOME: true, SALDO: true, ID_ASSINATURA: true },
  });

  if (!cliente) {
    res.status(401).json({ error: "Cliente inválido" });
    return null;
  }

  return cliente;
}

async function getAssinaturaAdministradaOr403(clienteId: number, res: Response) {
  const assinatura = await prisma.assinatura.findFirst({
    where: { ID_CLIENTE_ADMIN_DA_ASSINATURA: clienteId, STATUS: { not: "CANCELADA" } },
    select: {
      ID: true,
      ID_CLIENTE_ADMIN_DA_ASSINATURA: true,
      STATUS: true,
      ID_PLANO: true,
      plano: { select: { MAX_USUARIOS_DEPENDENTES: true } },
    },
  });

  if (!assinatura) {
    res.status(403).json({ error: "Você não é admin de nenhuma assinatura ativa." });
    return null;
  }

  return assinatura;
}

/**
 * POST /api/assinatura/sair
 * Regra:
 * - precisa estar autenticado
 * - se for ADMIN da assinatura -> não pode sair (deve cancelar)
 * - se for membro -> desvincula (ID_ASSINATURA = null)
 */
export async function sairDaAssinatura(req: Request, res: Response) {
  try {
    const cliente = await getClienteLogadoOr401(req, res);
    if (!cliente) return;

    if (!cliente.ID_ASSINATURA) {
      return res.status(400).json({ error: "Você não está vinculado a nenhuma assinatura." });
    }

    const assinaturaId = cliente.ID_ASSINATURA;

    const assinatura = await prisma.assinatura.findUnique({
      where: { ID: assinaturaId },
      select: { ID: true, ID_CLIENTE_ADMIN_DA_ASSINATURA: true, STATUS: true },
    });

    // vínculo quebrado: limpa e retorna ok
    if (!assinatura) {
      await prisma.cliente.updateMany({
        where: { ID: cliente.ID, ID_ASSINATURA: assinaturaId },
        data: { ID_ASSINATURA: null },
      });
      return res.json({ ok: true, message: "Você saiu da assinatura." });
    }

    // admin não pode sair
    if (assinatura.ID_CLIENTE_ADMIN_DA_ASSINATURA === cliente.ID) {
      return res.status(400).json({
        error:
          "O administrador não pode sair da assinatura. Para encerrar, cancele a assinatura.",
      });
    }

    const updated = await prisma.cliente.updateMany({
      where: { ID: cliente.ID, ID_ASSINATURA: assinatura.ID },
      data: { ID_ASSINATURA: null },
    });

    if (updated.count === 0) {
      return res.status(409).json({ error: "Não foi possível sair (estado mudou)." });
    }

    return res.json({ ok: true, assinaturaId: assinatura.ID, message: "Você saiu da assinatura." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao sair da assinatura." });
  }
}

/**
 * POST /api/assinatura/vincular-cliente
 */
export async function vincularClienteNaMinhaAssinatura(req: Request, res: Response) {
  try {
    const adminCliente = await getClienteLogadoOr401(req, res);
    if (!adminCliente) return;

    const assinatura = await getAssinaturaAdministradaOr403(adminCliente.ID, res);
    if (!assinatura) return;

    const idCliente = toPositiveInt(req.body?.idCliente);
    const emailCliente =
      typeof req.body?.emailCliente === "string" ? req.body.emailCliente.trim() : "";

    if (!idCliente && !emailCliente) {
      return res.status(400).json({ error: "Informe idCliente ou emailCliente." });
    }

    const alvo = await prisma.cliente.findUnique({
      where: idCliente ? { ID: idCliente } : { EMAIL: emailCliente },
      select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true },
    });

    if (!alvo) {
      return res.status(404).json({ error: "Cliente alvo não encontrado." });
    }

    if (alvo.ID_ASSINATURA) {
      return res.status(409).json({
        error: "Este cliente já está vinculado a uma assinatura.",
        idAssinaturaAtual: alvo.ID_ASSINATURA,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ✅ limite de usuários do plano (inclui o admin)
      const max = assinatura?.plano?.MAX_USUARIOS_DEPENDENTES ?? null;
      if (typeof max === "number" && max > 0) {
        const atuais = await tx.cliente.count({ where: { ID_ASSINATURA: assinatura.ID } });
        if (atuais >= max) {
          return { ok: false as const, reason: "LIMIT_REACHED" as const, atuais, max };
        }
      }

      const updated = await tx.cliente.updateMany({
        where: { ID: alvo.ID, ID_ASSINATURA: null },
        data: { ID_ASSINATURA: assinatura.ID },
      });

      if (updated.count === 0) {
        return { ok: false as const, reason: "ALREADY_LINKED" as const };
      }

      const alvoAtualizado = await tx.cliente.findUnique({
        where: { ID: alvo.ID },
        select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true },
      });

      return { ok: true as const, alvo: alvoAtualizado };
    });

    if (!result.ok) {
      if (result.reason === "LIMIT_REACHED") {
        return res.status(409).json({
          error: `Limite de usuários do plano atingido (${result.atuais} de ${result.max}).`,
          atuais: result.atuais,
          max: result.max,
        });
      }

      return res.status(409).json({ error: "Este cliente já foi vinculado por outra operação." });
    }

    return res.json({
      ok: true,
      assinaturaId: assinatura.ID,
      clienteVinculado: result.alvo,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao vincular cliente na assinatura." });
  }
}

/**
 * POST /api/assinatura/remover-cliente
 */
export async function removerClienteDaMinhaAssinatura(req: Request, res: Response) {
  try {
    const adminCliente = await getClienteLogadoOr401(req, res);
    if (!adminCliente) return;

    const assinatura = await getAssinaturaAdministradaOr403(adminCliente.ID, res);
    if (!assinatura) return;

    const idCliente = toPositiveInt(req.body?.idCliente);
    const emailCliente =
      typeof req.body?.emailCliente === "string" ? req.body.emailCliente.trim() : "";

    if (!idCliente && !emailCliente) {
      return res.status(400).json({ error: "Informe idCliente ou emailCliente." });
    }

    const alvo = await prisma.cliente.findUnique({
      where: idCliente ? { ID: idCliente } : { EMAIL: emailCliente },
      select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true },
    });

    if (!alvo) {
      return res.status(404).json({ error: "Cliente alvo não encontrado." });
    }

    if (alvo.ID === adminCliente.ID) {
      return res.status(400).json({ error: "O admin não pode remover a si mesmo da assinatura." });
    }

    if (alvo.ID_ASSINATURA !== assinatura.ID) {
      return res.status(403).json({
        error: "Este cliente não está vinculado à sua assinatura.",
      });
    }

    const updated = await prisma.cliente.updateMany({
      where: { ID: alvo.ID, ID_ASSINATURA: assinatura.ID },
      data: { ID_ASSINATURA: null },
    });

    if (updated.count === 0) {
      return res.status(409).json({ error: "Não foi possível remover (estado mudou)." });
    }

    return res.json({
      ok: true,
      assinaturaId: assinatura.ID,
      clienteRemovido: { ID: alvo.ID, EMAIL: alvo.EMAIL, NOME: alvo.NOME },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao remover cliente da assinatura." });
  }
}

/**
 * POST /api/assinatura/transferir-creditos
 */
export async function transferirCreditosParaVinculado(req: Request, res: Response) {
  try {
    const adminCliente = await getClienteLogadoOr401(req, res);
    if (!adminCliente) return;

    const assinatura = await getAssinaturaAdministradaOr403(adminCliente.ID, res);
    if (!assinatura) return;

    const valor = toPositiveMoney(req.body?.valor);
    if (!valor) {
      return res.status(400).json({ error: "Informe um valor positivo em 'valor'." });
    }

    const idClienteDestino = toPositiveInt(req.body?.idClienteDestino);
    const emailClienteDestino =
      typeof req.body?.emailClienteDestino === "string"
        ? req.body.emailClienteDestino.trim()
        : "";

    if (!idClienteDestino && !emailClienteDestino) {
      return res.status(400).json({ error: "Informe idClienteDestino ou emailClienteDestino." });
    }

    const destino = await prisma.cliente.findUnique({
      where: idClienteDestino ? { ID: idClienteDestino } : { EMAIL: emailClienteDestino },
      select: { ID: true, EMAIL: true, NOME: true, ID_ASSINATURA: true },
    });

    if (!destino) {
      return res.status(404).json({ error: "Cliente destino não encontrado." });
    }

    if (destino.ID === adminCliente.ID) {
      return res.status(400).json({ error: "Não faz sentido transferir créditos para si mesmo." });
    }

    if (destino.ID_ASSINATURA !== assinatura.ID) {
      return res.status(403).json({ error: "O destino não está vinculado à sua assinatura." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const debit = await tx.cliente.updateMany({
        where: { ID: adminCliente.ID, SALDO: { gte: valor } },
        data: { SALDO: { decrement: valor } },
      });

      if (debit.count === 0) {
        return { ok: false as const, reason: "NO_CREDITS" as const };
      }

      const credit = await tx.cliente.updateMany({
        where: { ID: destino.ID, ID_ASSINATURA: assinatura.ID },
        data: { SALDO: { increment: valor } },
      });

      if (credit.count === 0) {
        throw new Error("DESTINO_NAO_VINCULADO");
      }

      const [adminAfter, destAfter] = await Promise.all([
        tx.cliente.findUnique({ where: { ID: adminCliente.ID }, select: { ID: true, SALDO: true } }),
        tx.cliente.findUnique({ where: { ID: destino.ID }, select: { ID: true, SALDO: true } }),
      ]);

      return {
        ok: true as const,
        valor,
        from: adminAfter,
        to: destAfter,
      };
    });

    if (!result.ok) {
      return res.status(403).json({ error: "Créditos insuficientes para transferir.", valor });
    }

    return res.json({
      ok: true,
      assinaturaId: assinatura.ID,
      valor: result.valor,
      from: result.from,
      to: result.to,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao transferir créditos." });
  }
}
