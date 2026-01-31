import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../services/token.service";

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const cookieToken = (req as any).cookies?.cb_token as string | undefined;

  const auth = req.headers.authorization || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = verifyAuthToken(token);
    (req as any).auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}
