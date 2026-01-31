import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { root } from "../controllers/auth.controller";

export const routes = Router();

routes.get("/", root);
routes.use(authRoutes);
