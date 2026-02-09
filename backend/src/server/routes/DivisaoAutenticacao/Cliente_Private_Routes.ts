// privateRoutes.ts
import { Router } from "express";
import { prisma } from "../../../lib/prisma";
import { authRequired } from "../../../middleware/middleware";
import { produtoRoutes } from "../Cliente/Produto_Cliente_Routes";
import { solicitacaoAnaliseRoutes } from "../Cliente/Cliente_Solictacao_Analise_Routes";
import { assinaturaRoutes } from "../Cliente/Assinatura_Cliente_Controller";
import { assinaturaStripeRoutes } from "../Cliente/Assinatura_Checkout_Routes"; // ✅ ADD
import { planoRoutes } from "../Cliente/Plano_Cliente_Routes";
import { empresaRoutes } from "../Cliente/Empresa_Cliente_Routes";
import { solicitacaoAdicaoProdutoClienteRoutes } from "../Cliente/Solicitacao_Produto_Cliente_Routes";
import getPrecoCreditoAtualRoute from "../Cliente/Preco_Credito_Cliente_Routes";
import { creditosRoutes } from "../Cliente/Creditos_Checkout_Routes";
import { creditoHistoricoRoutes } from "../Cliente/Historico_Cliente_Routes";
import { creditRefundRequestRoutes } from "../Cliente/Solicitacao_De_Reenbolso_Cliente_Routes";
import { cancelarAssinatura, criarCheckoutAssinatura } from "../../controllers/Cliente/Checkout_AssinaturaController";
import adminCreditoReembolsoRoutes from "../Cliente/Cliente_Reenbolso_Routes";
import { assinaturaHistoricoReembolsoRoutes } from "../Cliente/Assinatura_Reembolso_Cliente_Routes";

export const privateRoutes = Router();

privateRoutes.use(authRequired);

privateRoutes.use(produtoRoutes);
privateRoutes.use(solicitacaoAnaliseRoutes);

// ✅ rotas antigas (assinatura/atual, vincular, remover, etc.)
privateRoutes.use(assinaturaRoutes);

// ✅ rotas Stripe (checkout/cancelar)
privateRoutes.use(assinaturaStripeRoutes);
privateRoutes.use(assinaturaHistoricoReembolsoRoutes);

privateRoutes.use(planoRoutes);
privateRoutes.use(empresaRoutes);
privateRoutes.use(solicitacaoAdicaoProdutoClienteRoutes);
privateRoutes.use(getPrecoCreditoAtualRoute);
privateRoutes.use(creditosRoutes);
privateRoutes.use(creditoHistoricoRoutes);
privateRoutes.use(creditRefundRequestRoutes);
privateRoutes.use(adminCreditoReembolsoRoutes)


assinaturaStripeRoutes.post("/assinaturas/checkout", criarCheckoutAssinatura);
assinaturaStripeRoutes.post("/assinaturas/cancelar", cancelarAssinatura);

privateRoutes.get("/cliente/me", async (req, res) => {
  const email = req.auth!.email;

  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: email },
    include: { empresa: true },
  });

  return res.json({ cliente });
});

privateRoutes.get("/health-private", async (req, res) => {
  return res.json({ ok: true, auth: req.auth });
});
