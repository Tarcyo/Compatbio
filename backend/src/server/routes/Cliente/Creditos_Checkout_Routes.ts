import { Router } from "express";
import { criarCheckoutCreditos } from "../../controllers/Cliente/Credito_Checkout_Cliente_Contoller";

export const creditosRoutes = Router();

creditosRoutes.post("/creditos/checkout", criarCheckoutCreditos);
