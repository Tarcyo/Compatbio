import { Router } from "express";
import { createAdmin } from "../controllers/AdminProvision";

export const adminProvisionRoutes = Router();

// pública mas exige token especial no header
adminProvisionRoutes.post("/admin/create", createAdmin);
