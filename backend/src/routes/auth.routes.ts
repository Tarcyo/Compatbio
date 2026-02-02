import { Router } from "express";
import { login, oauthCallback, me, logout } from "../controllers/auth.controller";
import { authRequired } from "../middleware/middleware";

export const authRoutes = Router();

authRoutes.get("/login", login);
authRoutes.get("/oauth", oauthCallback);

// ✅ protegidas
authRoutes.get("/me", authRequired, me);
authRoutes.post("/logout", authRequired, logout);
