import { Router } from "express";
import {
  listarEmpresas,
  listarEmpresasResumo,
  atualizarMinhaEmpresa,
} from "../../controllers/Cliente/Empresa_Cliente_Controller";

export const empresaRoutes = Router();

// GET /api/empresas
empresaRoutes.get("/empresas", listarEmpresas);

// GET /api/empresas/resumo
empresaRoutes.get("/empresas/resumo", listarEmpresasResumo);

// POST /api/cliente/empresa
empresaRoutes.post("/cliente/empresa", atualizarMinhaEmpresa);
