import { Router } from "express";
import {
  criarSolicitacaoAnalise,
  listarMinhasSolicitacoes,
  reembolsarSolicitacaoPendente,
} from "../controllers/requireController";

export const solicitacaoAnaliseRoutes = Router();

// POST /api/solicitacoes/analise
solicitacaoAnaliseRoutes.post("/solicitacoes/analise", criarSolicitacaoAnalise);

// GET /api/solicitacoes/analise/minhas
solicitacaoAnaliseRoutes.get("/solicitacoes/analise/minhas", listarMinhasSolicitacoes);

// ✅ POST /api/solicitacoes/analise/reembolsar
solicitacaoAnaliseRoutes.post("/solicitacoes/analise/reembolsar", reembolsarSolicitacaoPendente);
