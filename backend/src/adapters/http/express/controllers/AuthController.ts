import type { Request, Response } from "express";
import crypto from "crypto";
import { AuthenticateGoogleUser, GoogleOAuthPort } from "../../../../application/usecases/AuthenticateGoogleUser.js";


export class AuthController {
  constructor(
    private readonly google: GoogleOAuthPort,
    private readonly authGoogle: AuthenticateGoogleUser,
    private readonly frontendUrl: string
  ) {}

  login = (req: Request, res: Response) => {
    const state = crypto.randomBytes(16).toString("hex");

    res.cookie("cb_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 min
      path: "/",
    });

    return res.redirect(this.google.getAuthUrl(state));
  };

  callback = async (req: Request, res: Response) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const stateCookie = String(req.cookies?.cb_oauth_state || "");

    if (!code) return res.status(400).send("Código OAuth ausente");
    if (!state || state !== stateCookie) return res.status(400).send("State inválido");

    try {
      const { jwt } = await this.authGoogle.execute({ code });

      res.clearCookie("cb_oauth_state", { path: "/" });

      res.cookie("cb_token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
        path: "/",
      });

      return res.redirect(`${this.frontendUrl}/app`);
    } catch (err: any) {
      console.error(err?.response?.data || err);
      return res.status(500).send("Erro no OAuth");
    }
  };

  logout = (req: Request, res: Response) => {
    res.clearCookie("cb_token", { path: "/" });
    res.json({ ok: true });
  };
}
