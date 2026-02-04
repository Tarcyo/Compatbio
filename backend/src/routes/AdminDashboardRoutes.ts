import { Router } from "express";
import { adminDashboard } from "../controllers/adminDashboardControllers";

export const adminDashboardRoutes = Router();

// GET /admin/api/dashboard?months=6
adminDashboardRoutes.get("/dashboard", adminDashboard);
