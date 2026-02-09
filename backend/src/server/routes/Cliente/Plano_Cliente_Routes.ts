import { Router } from "express";
import { listarPlanos } from "../../controllers/Cliente/Plano_Cliente_Controller";

export const planoRoutes = Router();

// GET /api/planos
planoRoutes.get("/planos", listarPlanos);
