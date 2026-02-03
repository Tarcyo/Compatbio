import { Router } from "express";
import { adminAtualizarEmpresa, adminCriarEmpresa, adminListarEmpresas, adminRemoverEmpresa } from "../controllers/adminEmpresaController";


export const adminEmpresasRoutes = Router();

// GET /admin/api/empresas
adminEmpresasRoutes.get("/empresas", adminListarEmpresas);

// POST /admin/api/empresas
adminEmpresasRoutes.post("/empresas", adminCriarEmpresa);

// PUT /admin/api/empresas/:id
adminEmpresasRoutes.put("/empresas/:id", adminAtualizarEmpresa);

// DELETE /admin/api/empresas/:id
adminEmpresasRoutes.delete("/empresas/:id", adminRemoverEmpresa);
