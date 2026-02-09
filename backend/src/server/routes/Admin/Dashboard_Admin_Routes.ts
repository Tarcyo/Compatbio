import { Router } from "express";
import { adminDashboard } from "../../controllers/Admin/Dashboard_Admin_Controller";

export const adminDashboardRoutes = Router();

// GET /admin/api/dashboard?months=6
adminDashboardRoutes.get("/dashboard", adminDashboard);
