import { Router } from "express";
import { atualizarProdutoAdmin, listBiologicos, listQuimicos } from "../../controllers/Cliente/Produto_Cliente_Controller";

export const produtoRoutes = Router();

// GET /api/produtos/quimicos?q=...
produtoRoutes.get("/produtos/quimicos", listQuimicos);

// GET /api/produtos/biologicos?q=...
produtoRoutes.get("/produtos/biologicos", listBiologicos);
produtoRoutes.put("/produtos/:id", atualizarProdutoAdmin);
