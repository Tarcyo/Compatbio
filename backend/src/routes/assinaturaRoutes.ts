import { Router } from "express";
import { getAssinaturaAtual, removerClienteDaMinhaAssinatura, transferirCreditosParaVinculado, vincularClienteNaMinhaAssinatura } from "../controllers/assinaturaController";

export const assinaturaRoutes = Router();

// GET /api/assinatura/atual
assinaturaRoutes.get("/assinatura/atual", getAssinaturaAtual);
assinaturaRoutes.post("/assinatura/vincular-cliente", vincularClienteNaMinhaAssinatura);
assinaturaRoutes.post("/assinatura/remover-cliente", removerClienteDaMinhaAssinatura);
assinaturaRoutes.post("/assinatura/transferir-creditos", transferirCreditosParaVinculado);