import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../services/AdminAuth";

/**
 * Lê token do cookie httpOnly (cb_admin_token) OU Authorization: Bearer ...
 * Se válido, preenche req.adminAuth e continua.
 */
export function adminAuthRequired(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.cb_admin_token as string | undefined;

  const auth = req.headers.authorization || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ error: "Token admin ausente" });

  try {
    const decoded = verifyAdminToken(token);
    req.adminAuth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Token admin inválido" });
  }
}
