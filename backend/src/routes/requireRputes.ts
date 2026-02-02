import { Router } from "express";
import { criarSolicitacaoAnalise, listarMinhasSolicitacoes } from "../controllers/requireController";

export const solicitacaoAnaliseRoutes = Router();

// POST /api/solicitacoes/analise
solicitacaoAnaliseRoutes.post("/solicitacoes/analise", criarSolicitacaoAnalise);
solicitacaoAnaliseRoutes.get("/solicitacoes/analise/minhas", listarMinhasSolicitacoes)