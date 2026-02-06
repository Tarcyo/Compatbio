import { Router } from "express";
import { getHistoricoAssinatura, solicitarReembolsoAssinatura } from "../controllers/assinaturaRebolsoSolicitarController";

export const assinaturaHistoricoReembolsoRoutes = Router();

// GET histórico (faturas)
assinaturaHistoricoReembolsoRoutes.get("/assinatura/historico", getHistoricoAssinatura);

// POST solicitar reembolso (por invoice)
assinaturaHistoricoReembolsoRoutes.post("/assinatura/reembolso/solicitar", solicitarReembolsoAssinatura);
