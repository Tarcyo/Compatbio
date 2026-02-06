import { Router } from "express";
import { stripeWebhook } from "../controllers/stripeWebhookController";

export const stripeWebhookRoutes = Router();

stripeWebhookRoutes.post("/stripe/webhook", stripeWebhook);
