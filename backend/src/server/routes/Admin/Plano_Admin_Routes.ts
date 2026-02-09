import { Router } from "express";
import {
  adminAtualizarPlano,
  adminCriarPlano,
  adminListarPlanos,
  adminRemoverPlano,
} from "../../controllers/Admin/Plano_Admin_Controller";

export const adminPlanosRoutes = Router();

adminPlanosRoutes.get("/planos", adminListarPlanos);
adminPlanosRoutes.post("/planos", adminCriarPlano);
adminPlanosRoutes.put("/planos/:id", adminAtualizarPlano);
adminPlanosRoutes.delete("/planos/:id", adminRemoverPlano);
