import { Router } from "express";
import { listBiologicos, listQuimicos } from "../controllers/produtoController";

export const produtoRoutes = Router();

// GET /api/produtos/quimicos?q=...
produtoRoutes.get("/produtos/quimicos", listQuimicos);

// GET /api/produtos/biologicos?q=...
produtoRoutes.get("/produtos/biologicos", listBiologicos);
