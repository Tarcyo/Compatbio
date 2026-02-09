import { Router } from "express";
import { atualizarProdutoAdmin, criarProdutoAdmin, listarProdutosAdmin } from "../../controllers/Cliente/Produto_Cliente_Controller";

export const adminProdutosRoutes = Router();

adminProdutosRoutes.get("/produtos", listarProdutosAdmin);
adminProdutosRoutes.post("/produtos", criarProdutoAdmin);
adminProdutosRoutes.put("/produtos/:id", atualizarProdutoAdmin);
