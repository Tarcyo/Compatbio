import jwt from "jsonwebtoken";
import type { GoogleUserInfo } from "./googleOAuth.service";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  locale?: string;
  clienteId: number; // <- importante pra linkar com o banco
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export function signAuthToken(user: GoogleUserInfo, clienteId: number) {
  const payload: AuthTokenPayload = {
    sub: user.sub,
    email: user.email,
    email_verified: user.email_verified,
    name: user.name,
    picture: user.picture,
    locale: user.locale,
    clienteId,
  };

  return jwt.sign(payload, requireEnv("JWT_SECRET"), { expiresIn: "2h" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, requireEnv("JWT_SECRET")) as AuthTokenPayload;
}
