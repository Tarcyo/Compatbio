// src/routes/precoCreditosRoutes.ts
import { Router } from "express";
import { getPrecoCreditoAtual } from "../../controllers/Cliente/Preco_Credito_Cliente_Controller";

const precoCreditoRoutes = Router();

precoCreditoRoutes.get("/preco-credito", getPrecoCreditoAtual);

export default precoCreditoRoutes;
