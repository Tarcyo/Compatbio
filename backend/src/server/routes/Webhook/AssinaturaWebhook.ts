import { Router } from "express";
import { stripeWebhookAssinatura } from "../../controllers/Webhook/Assinatura_Webhook";

export const stripeAssinaturaWebhookRoutes = Router();

// NÃO muda o endereço da rota:
stripeAssinaturaWebhookRoutes.post("/stripe/webhook-assinatura", stripeWebhookAssinatura);
