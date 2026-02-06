import { Router } from "express";
import { adminAuthRequired } from "../middleware/AdminMiddleware";
import { adminSolicitacoesRoutes } from "./AdminSolicitacaoRoutes";
import { adminSolicitacaoAdicaoProdutoRoutes } from "./adicaoProdutosRoutes";
import { adminProdutosRoutes } from "./AdminProdutosRoutes";
import { adminEmpresasRoutes } from "./adminEmpresaRoutes";
import { adminPlanosRoutes } from "./adminPlanosRoutes";
import { adminDashboardRoutes } from "./AdminDashboardRoutes";
import adminResultadoCatalogadoRoutes from "./resultadoCatalogoAdminRoutes";
import { adminRefundRequestsRoutes } from "./AdminReembolso";

export const adminPrivateRoutes = Router();

// tudo aqui exige admin logado
adminPrivateRoutes.use(adminAuthRequired);

// (opcional) health-check
adminPrivateRoutes.get("/health-admin", (req, res) => {
  return res.json({ ok: true, admin: req.adminAuth });
});

// ✅ novas rotas admin
adminPrivateRoutes.use(adminSolicitacoesRoutes);
adminPrivateRoutes.use(adminProdutosRoutes);
adminPrivateRoutes.use(adminSolicitacaoAdicaoProdutoRoutes);
adminPrivateRoutes.use(adminEmpresasRoutes); // ✅ ADD
adminPrivateRoutes.use(adminPlanosRoutes); // ✅ ADD
adminPrivateRoutes.use(adminDashboardRoutes);
adminPrivateRoutes.use(adminResultadoCatalogadoRoutes);
adminPrivateRoutes.use(adminRefundRequestsRoutes);
