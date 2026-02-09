import type { Request, Response } from "express";
import {
  buildGoogleAuthUrl,
  exchangeCodeForAccessToken,
  fetchGoogleUserInfo,
} from "../../../services/googleOAuth.service";
import { signAuthToken } from "../../../services/token.service";
import { prisma } from "../../../lib/prisma";

function frontendOrigin() {
  const raw = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  return raw.replace(/\/+$/, "");
}

function setAuthCookie(res: Response, token: string) {
  res.cookie("cb_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000,
    path: "/",
  });
}

export async function root(_req: Request, res: Response) {
  res.send("Backend CompatBio rodando 🚀");
}

export async function login(_req: Request, res: Response) {
  const url = buildGoogleAuthUrl();
  return res.redirect(url);
}

export async function oauthCallback(req: Request, res: Response) {
  const code = req.query.code ? String(req.query.code) : "";
  if (!code) return res.status(400).send("Código OAuth ausente");

  try {
    const accessToken = await exchangeCodeForAccessToken(code);
    const user = await fetchGoogleUserInfo(accessToken);

    const cliente = await prisma.cliente.upsert({
      where: { EMAIL: user.email },
      update: {
        NOME: user.name || "Sem nome",
      },
      create: {
        EMAIL: user.email,
        NOME: user.name || "Sem nome",
        SALDO: "0.00",
        ID_ASSINATURA: null,
        ID_EMPRESA: null,
        COMPRA_NO_SISTEMA: false,
      },
    });

    const jwtToken = signAuthToken(user, cliente.ID);
    setAuthCookie(res, jwtToken);

    return res.redirect(`${frontendOrigin()}/app`);
  } catch (err: any) {
    console.error(err?.response?.data || err);
    return res.status(500).send("Erro no OAuth");
  }
}

/**
 * ✅ Agora /me é protegido por middleware (authRequired).
 * Então aqui o token já foi validado e req.auth existe.
 */
export async function me(req: Request, res: Response) {
  const decoded = req.auth!;

  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: decoded.email },
    include: { empresa: true },
  });

  if (!cliente) {
    return res.status(404).json({ error: "Cliente não encontrado" });
  }

  // Decimal -> número (ou string). Aqui eu mando como number, mas preservo segurança:
  const saldoNumber = Number(cliente.SALDO);

  return res.json({
    user: decoded,
    cliente,
    saldo: Number.isFinite(saldoNumber) ? saldoNumber : String(cliente.SALDO),
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("cb_token", { path: "/" });
  res.json({ ok: true });
}
