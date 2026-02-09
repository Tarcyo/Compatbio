import { Router } from "express";
import { getHistoricoCreditos } from "../../controllers/Cliente/Historico_Credito_Cliente_Controller";

export const creditoHistoricoRoutes = Router();

/**
 * GET /api/creditos/historico
 * (protegido por authRequired no privateRoutes)
 */
creditoHistoricoRoutes.get("/creditos/historico", getHistoricoCreditos);
