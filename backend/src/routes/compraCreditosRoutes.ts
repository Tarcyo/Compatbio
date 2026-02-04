import { Router } from "express";
import { criarCheckoutCreditos } from "../controllers/stripeCreditoController";

export const creditosRoutes = Router();

creditosRoutes.post("/creditos/checkout", criarCheckoutCreditos);
