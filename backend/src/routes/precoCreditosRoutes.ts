// src/routes/precoCreditosRoutes.ts
import { Router } from "express";
import { getPrecoCreditoAtual } from "../controllers/precoCréditoController";

const precoCreditoRoutes = Router();

precoCreditoRoutes.get("/preco-credito", getPrecoCreditoAtual);

export default precoCreditoRoutes;
