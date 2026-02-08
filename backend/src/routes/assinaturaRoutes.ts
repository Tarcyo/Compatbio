// src/routes/assinatura.routes.ts
import { Router } from "express";
import {
  getAssinaturaAtual,
  removerClienteDaMinhaAssinatura,
  transferirCreditosParaVinculado,
  vincularClienteNaMinhaAssinatura,
  sairDaAssinatura,
} from "../controllers/assinaturaController";

export const assinaturaRoutes = Router();

// GET /api/assinatura/atual
assinaturaRoutes.get("/assinatura/atual", getAssinaturaAtual);

// Admin gerencia membros
assinaturaRoutes.post("/assinatura/vincular-cliente", vincularClienteNaMinhaAssinatura);
assinaturaRoutes.post("/assinatura/remover-cliente", removerClienteDaMinhaAssinatura);
assinaturaRoutes.post("/assinatura/transferir-creditos", transferirCreditosParaVinculado);

// ✅ membro sai da assinatura
assinaturaRoutes.post("/assinatura/sair", sairDaAssinatura);
