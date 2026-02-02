import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { root } from "../controllers/auth.controller";
import { privateRoutes } from "./privateRoutes";

export const routes = Router();

routes.get("/", root);

// públicas / auth
routes.use(authRoutes);

// ✅ tudo em /api é interno e protegido
routes.use("/api", privateRoutes);
