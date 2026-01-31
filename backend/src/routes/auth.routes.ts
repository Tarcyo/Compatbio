import { Router } from "express";
import { login, oauthCallback, me, logout } from "../controllers/auth.controller";

export const authRoutes = Router();

authRoutes.get("/login", login);
authRoutes.get("/oauth", oauthCallback);
authRoutes.get("/me", me);
authRoutes.post("/logout", logout);
