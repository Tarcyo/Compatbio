import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authRequired } from "../middleware/middleware";
import { produtoRoutes } from "./produto.routes";
import { solicitacaoAnaliseRoutes } from "./requireRputes";
import { assinaturaRoutes } from "./assinaturaRoutes";
import { planoRoutes } from "./planoRoutes";
import { empresaRoutes } from "./empresaRoutes";
import { solicitacaoAdicaoProdutoClienteRoutes } from "./SolicitaçãoProdutoCliente";
import  getPrecoCreditoAtualRoute   from "./precoCreditosRoutes";
import { creditosRoutes } from "./compraCreditosRoutes";

// ...

export const privateRoutes = Router();

// Tudo aqui exige login
privateRoutes.use(authRequired);
privateRoutes.use(produtoRoutes);
privateRoutes.use(solicitacaoAnaliseRoutes);
privateRoutes.use(assinaturaRoutes);
privateRoutes.use(planoRoutes); // ✅ ADD
privateRoutes.use(empresaRoutes);
privateRoutes.use(solicitacaoAdicaoProdutoClienteRoutes);
privateRoutes.use(getPrecoCreditoAtualRoute)
privateRoutes.use(creditosRoutes);

/**
 * Exemplo: rota interna que retorna o cliente logado (com empresa).
 * Você pode usar isso no front pra buscar dados do "perfil do sistema".
 */
privateRoutes.get("/cliente/me", async (req, res) => {
  const email = req.auth!.email;

  const cliente = await prisma.cliente.findUnique({
    where: { EMAIL: email },
    include: { empresa: true },
  });

  return res.json({ cliente });
});

/**
 * Exemplo: rota interna só pra testar se está protegido
 */
privateRoutes.get("/health-private", async (req, res) => {
  return res.json({ ok: true, auth: req.auth });
});
