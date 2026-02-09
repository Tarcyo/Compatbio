import { Router } from "express";
import { adminAuthRequired } from "../../../middleware/AdminMiddleware";
import { adminSolicitacoesRoutes } from "../Admin/Solicitacao_Analise_Admin_Routes[";
import { adminSolicitacaoAdicaoProdutoRoutes } from "../Admin/Solicitacao_adicao_Produto_Admin_Routes";
import { adminProdutosRoutes } from "../Admin/Produtos_Admin_Routes";
import { adminEmpresasRoutes } from "../Admin/Empresa_Admin_Routes";
import { adminPlanosRoutes } from "../Admin/Plano_Admin_Routes";
import { adminDashboardRoutes } from "../Admin/Dashboard_Admin_Routes";
import adminResultadoCatalogadoRoutes from "../Admin/Resultado_Catalogo_Admin_Routes";
import { adminRefundRequestsRoutes } from "../Admin/Reembolso_Admin";

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
