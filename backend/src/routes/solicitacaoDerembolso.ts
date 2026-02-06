import { Router } from "express";
import { solicitarReembolsoCredito } from "../controllers/solicitacaoDeRembolso";

const creditRefundRequestRoutes = Router();

// como isso roda dentro de /api (privateRoutes), já fica protegido pelo seu auth middleware
creditRefundRequestRoutes.post("/creditos/reembolso/solicitar", solicitarReembolsoCredito);

export { creditRefundRequestRoutes };
