import { Router } from "express";
import { adminLogin, adminLogout, adminMe } from "../../controllers/Admin/Auth_Admin_Controller";
import { adminAuthRequired } from "../../../middleware/AdminMiddleware";


export const adminAuthRoutes = Router();

// pública (login por email/senha)
adminAuthRoutes.post("/admin/login", adminLogin);

// protegidas (sessão admin)
adminAuthRoutes.get("/admin/me", adminAuthRequired, adminMe);
adminAuthRoutes.post("/admin/logout", adminAuthRequired, adminLogout);
