import { Router } from "express";
import { listarPlanos } from "../controllers/planoController";

export const planoRoutes = Router();

// GET /api/planos
planoRoutes.get("/planos", listarPlanos);
