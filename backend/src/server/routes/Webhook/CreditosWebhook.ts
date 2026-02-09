import { Router } from "express";
import { stripeWebhook } from "../../controllers/Webhook/Creditos_Webhook";

export const stripeCreditosWebhookRoutes = Router();

// NÃO muda o endereço da rota:
stripeCreditosWebhookRoutes.post("/stripe/webhook", stripeWebhook);
