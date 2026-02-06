// privateRoutes.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authRequired } from "../middleware/middleware";
import { produtoRoutes } from "./produto.routes";
import { solicitacaoAnaliseRoutes } from "./requireRputes";
import { assinaturaRoutes } from "./assinaturaRoutes";
import { assinaturaStripeRoutes } from "./assinaturaStripeRoutes"; // ✅ ADD
import { planoRoutes } from "./planoRoutes";
import { empresaRoutes } from "./empresaRoutes";
import { solicitacaoAdicaoProdutoClienteRoutes } from "./SolicitaçãoProdutoCliente";
import getPrecoCreditoAtualRoute from "./precoCreditosRoutes";
import { creditosRoutes } from "./compraCreditosRoutes";
import { creditoHistoricoRoutes } from "./historicoRoutes";
import { creditRefundRequestRoutes } from "./solicitacaoDerembolso";
import { cancelarAssinatura, criarCheckoutAssinatura } from "../controllers/AssinaturaStripeController";
import adminCreditoReembolsoRoutes from "./reembolsoRoutes";
import { assinaturaHistoricoReembolsoRoutes } from "./usuarioAssinaturaRoutes";

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
