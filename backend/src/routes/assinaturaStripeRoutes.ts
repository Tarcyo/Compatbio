import { Router } from "express";
import { cancelarAssinatura, criarCheckoutAssinatura } from "../controllers/AssinaturaStripeController";

export const assinaturaStripeRoutes = Router();

assinaturaStripeRoutes.post("/assinatura/checkout", criarCheckoutAssinatura);
assinaturaStripeRoutes.post("/assinatura/cancelar", cancelarAssinatura);
