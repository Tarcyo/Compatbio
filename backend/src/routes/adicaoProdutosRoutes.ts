import { Router } from "express";
import { aprovarSolicitacaoAdicaoProduto, listarSolicitacoesAdicaoProduto, recusarSolicitacaoAdicaoProduto } from "../controllers/AdicaoDeProdutosController";


export const adminSolicitacaoAdicaoProdutoRoutes = Router();

adminSolicitacaoAdicaoProdutoRoutes.get("/solicitacoes/adicao-produto", listarSolicitacoesAdicaoProduto);
adminSolicitacaoAdicaoProdutoRoutes.post("/solicitacoes/adicao-produto/aprovar", aprovarSolicitacaoAdicaoProduto);
adminSolicitacaoAdicaoProdutoRoutes.post("/solicitacoes/adicao-produto/recusar", recusarSolicitacaoAdicaoProduto);
