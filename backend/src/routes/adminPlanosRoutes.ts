import { Router } from "express";
import { adminAtualizarPlano, adminCriarPlano, adminListarPlanos, adminRemoverPlano } from "../controllers/AdminPlanoController";

export const adminPlanosRoutes = Router();

adminPlanosRoutes.get("/planos", adminListarPlanos);
adminPlanosRoutes.post("/planos", adminCriarPlano);
adminPlanosRoutes.put("/planos/:id", adminAtualizarPlano);
adminPlanosRoutes.delete("/planos/:id", adminRemoverPlano);
