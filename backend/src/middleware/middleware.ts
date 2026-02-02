import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../services/token.service";

/**
 * Lê token do cookie httpOnly (cb_token) ou do header Authorization: Bearer ...
 * Se válido, preenche req.auth e continua.
 */
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.cb_token as string | undefined;

  const auth = req.headers.authorization || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = verifyAuthToken(token);
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}
