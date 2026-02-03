import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { root } from "../controllers/auth.controller";
import { privateRoutes } from "./privateRoutes";
import { adminAuthRoutes } from "./AdminRoutes";
import { adminProvisionRoutes } from "./AdinCreationRoute";
import { adminPrivateRoutes } from "./AdminPrivateRoutes";


export const routes = Router();

routes.get("/", root);

// cliente OAuth
routes.use(authRoutes);

// admin: públicas
routes.use(adminAuthRoutes);
routes.use(adminProvisionRoutes);

// admin: protegidas (tudo em /admin/api exige adminAuthRequired)
routes.use("/admin/api", adminPrivateRoutes);

// cliente: tudo em /api protegido
routes.use("/api", privateRoutes);
