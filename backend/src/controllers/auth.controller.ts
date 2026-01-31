import type { Request, Response } from "express";
import { buildGoogleAuthUrl, exchangeCodeForAccessToken, fetchGoogleUserInfo } from "../services/googleOAuth.service";
import { signAuthToken, verifyAuthToken } from "../services/token.service";
import { prisma } from "../lib/prisma";

function frontendOrigin() {
  // use FRONTEND_ORIGIN (o nome que você já tem no .env)
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

    // ✅ UPSERT NO BANCO: se não existir, cria; se existir, só retorna
    const cliente = await prisma.cliente.upsert({
      where: { EMAIL: user.email },
      update: {
        // opcional: manter nome atualizado se mudar no Google
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
    // axios pode ter err.response?.data
    console.error(err?.response?.data || err);
    return res.status(500).send("Erro no OAuth");
  }
}

export async function me(req: Request, res: Response) {
  const cookieToken = (req as any).cookies?.cb_token as string | undefined;

  const auth = req.headers.authorization || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = verifyAuthToken(token);

    // pega dados do cliente no banco
    const cliente = await prisma.cliente.findUnique({
      where: { EMAIL: decoded.email },
    });

    return res.json({ user: decoded, cliente });
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("cb_token", { path: "/" });
  res.json({ ok: true });
}
