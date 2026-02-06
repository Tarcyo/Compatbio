import { Router } from "express";
import {
  listarSolicitacoesConcluidas,
  listarSolicitacoesPendentes,
  responderSolicitacaoAnalise,
  marcarSolicitacaoEmAnalise, // ✅ NOVO
} from "../controllers/AdminSolicitaçãoAnaliseController";

export const adminSolicitacoesRoutes = Router();

// GET /admin/api/solicitacoes/analise/pendentes
adminSolicitacoesRoutes.get("/solicitacoes/analise/pendentes", listarSolicitacoesPendentes);

// GET /admin/api/solicitacoes/analise/concluidas
adminSolicitacoesRoutes.get("/solicitacoes/analise/concluidas", listarSolicitacoesConcluidas);

// POST /admin/api/solicitacoes/analise/responder
adminSolicitacoesRoutes.post("/solicitacoes/analise/responder", responderSolicitacaoAnalise);

// ✅ POST /admin/api/solicitacoes/analise/marcar-em-analise
adminSolicitacoesRoutes.post("/solicitacoes/analise/marcar-em-analise", marcarSolicitacaoEmAnalise);
