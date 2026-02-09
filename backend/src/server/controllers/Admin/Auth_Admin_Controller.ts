import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { signAdminToken } from "../../../services/AdminAuth";

function setAdminAuthCookie(res: Response, token: string) {
  res.cookie("cb_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2h
    path: "/",
  });
}

export async function adminLogin(req: Request, res: Response) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Informe email e password." });
  }

  const admin = await prisma.admin.findUnique({
    where: { EMAIL: email },
    select: { ID: true, EMAIL: true, SENHA: true },
  });

  // resposta genérica por segurança
  if (!admin) return res.status(401).json({ error: "Credenciais inválidas." });

  const ok = await bcrypt.compare(password, admin.SENHA);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = signAdminToken(admin.EMAIL, admin.ID);
  setAdminAuthCookie(res, token);

  return res.json({
    ok: true,
    admin: { ID: admin.ID, EMAIL: admin.EMAIL },
  });
}

export async function adminMe(req: Request, res: Response) {
  // aqui req.adminAuth já foi preenchido pelo middleware
  return res.json({ ok: true, admin: req.adminAuth });
}

export async function adminLogout(_req: Request, res: Response) {
  res.clearCookie("cb_admin_token", { path: "/" });
  return res.json({ ok: true });
}
