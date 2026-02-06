import { Router } from "express";
import {
  adminAprovarSolicitacaoReembolso,
  adminListSolicitacoesReembolso,
  adminNegarSolicitacaoReembolso,
  adminAprovarSolicitacaoReembolsoAssinatura,
  adminNegarSolicitacaoReembolsoAssinatura,
} from "../controllers/AdminReembolso";

export const adminRefundRequestsRoutes = Router();

// GET listar (unificado)
adminRefundRequestsRoutes.get("/reembolsos/solicitacoes", adminListSolicitacoesReembolso);

// CREDITO
adminRefundRequestsRoutes.post("/reembolsos/solicitacoes/:id/aprovar", adminAprovarSolicitacaoReembolso);
adminRefundRequestsRoutes.post("/reembolsos/solicitacoes/:id/negar", adminNegarSolicitacaoReembolso);

// ASSINATURA
adminRefundRequestsRoutes.post(
  "/reembolsos/solicitacoes/assinatura/:id/aprovar",
  adminAprovarSolicitacaoReembolsoAssinatura
);
adminRefundRequestsRoutes.post(
  "/reembolsos/solicitacoes/assinatura/:id/negar",
  adminNegarSolicitacaoReembolsoAssinatura
);
