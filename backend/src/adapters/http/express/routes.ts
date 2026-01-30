import { Router } from "express";
import type { AuthController } from "./controllers/AuthController.js";
import type { MeController } from "./controllers/MeController.js";

export function buildRoutes(deps: { auth: AuthController; me: MeController }) {
  const r = Router();

  r.get("/", (req, res) => res.send("Backend CompatBio rodando 🚀"));

  r.get("/login", deps.auth.login);
r.get("/oauth", deps.auth.callback);

  r.get("/me", deps.me.handle);
  r.post("/logout", deps.auth.logout);

  return r;
}
