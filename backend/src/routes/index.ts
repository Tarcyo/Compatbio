import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { root } from "../controllers/auth.controller";
import { privateRoutes } from "./privateRoutes";
import { adminAuthRoutes } from "./AdminRoutes";
import { adminProvisionRoutes } from "./AdinCreationRoute";
import { adminPrivateRoutes } from "./AdminPrivateRoutes";

import { stripeWebhook } from "../controllers/stripeWebhookController"; // créditos (seu)
import { stripeWebhookAssinatura } from "../controllers/webhookAssinatura";

export const routes = Router();

routes.get("/", root);

// ✅ Webhooks públicos
routes.post("/stripe/webhook", stripeWebhook); // créditos (seu)
routes.post("/stripe/webhook-assinatura", stripeWebhookAssinatura); // ✅ assinatura (novo)

// cliente OAuth
routes.use(authRoutes);

// admin: públicas
routes.use(adminAuthRoutes);
routes.use(adminProvisionRoutes);

// admin: protegidas
routes.use("/admin/api", adminPrivateRoutes);

// cliente: protegido
routes.use("/api", privateRoutes);
