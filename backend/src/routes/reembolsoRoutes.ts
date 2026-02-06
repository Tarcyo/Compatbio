import { Router } from "express";
import { solicitarReembolsoCredito } from "../controllers/solicitacaoDeRembolso";

const adminCreditoReembolsoRoutes = Router();

/**
 * POST /admin/api/creditos/reembolso
 * body: { compraId }
 * Admin-only (protegido por adminAuthRequired no AdminPrivateRoutes)
 */
adminCreditoReembolsoRoutes.post("/creditos/reembolso", solicitarReembolsoCredito);

export default adminCreditoReembolsoRoutes;
