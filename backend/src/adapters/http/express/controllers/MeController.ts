import type { Request, Response } from "express";
import { GetMe } from "../../../../application/usecases/GetMe.js";

export class MeController {
  constructor(private readonly getMe: GetMe) {}

  handle = (req: Request, res: Response) => {
    const cookieToken = req.cookies?.cb_token as string | undefined;

    const auth = (req.headers.authorization || "") as string;
    const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

    const token = cookieToken || bearerToken;
    if (!token) return res.status(401).json({ error: "Token ausente" });

    try {
      const decoded = this.getMe.execute({ token });
      return res.json({ user: decoded });
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
}
