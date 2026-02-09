import { Router } from "express";
import { cancelarAssinatura, criarCheckoutAssinatura } from "../../controllers/Cliente/Checkout_AssinaturaController";

export const assinaturaStripeRoutes = Router();

assinaturaStripeRoutes.post("/assinatura/checkout", criarCheckoutAssinatura);
assinaturaStripeRoutes.post("/assinatura/cancelar", cancelarAssinatura);
