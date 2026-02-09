import type { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

function safeEqual(a: string, b: string) {
  // evita timing attack
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function getProvisionToken(req: Request) {
  // header padronizado:
  // x-admin-provision-token: <token>
  return (req.header("x-admin-provision-token") || "").trim();
}

/**
 * POST /admin/create
 * Headers: x-admin-provision-token: <ADMIN_PROVISION_TOKEN>
 * Body: { email, password }
 */
export async function createAdmin(req: Request, res: Response) {
  const provided = getProvisionToken(req);
  const expected = requireEnv("ADMIN_PROVISION_TOKEN");

  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: "Token de provisionamento inválido." });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Informe email e password." });
  }

  // validações simples (UI-friendly)
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Email inválido." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.admin.create({
      data: {
        EMAIL: email,
        SENHA: hash,
      },
      select: { ID: true, EMAIL: true },
    });

    return res.status(201).json({ ok: true, admin });
  } catch (e: any) {
    // Email duplicado
    if (String(e?.code) === "P2002") {
      return res.status(409).json({ error: "Já existe um admin com esse email." });
    }

    console.error(e);
    return res.status(500).json({ error: "Erro ao criar admin." });
  }
}
