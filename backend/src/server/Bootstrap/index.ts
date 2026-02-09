import { Router } from "express";
import { authRoutes as clienteAuthRoutes } from "../routes/Cliente/Clliente_Login_Routes";
import { root } from "../controllers/Cliente/Cliente_Auth_Controller";
import { privateRoutes } from "../routes/DivisaoAutenticacao/Cliente_Private_Routes";
import { adminAuthRoutes } from "../routes/Admin/Login_Admin_Routes";
import { adminProvisionRoutes as adminCreationRoutes } from "../routes/Admin/Criacao_Admin_Routes";
import { adminPrivateRoutes } from "../routes/DivisaoAutenticacao/Admin_Private_Routes";
import { stripeCreditosWebhookRoutes } from "../routes/Webhook/CreditosWebhook";
import { stripeAssinaturaWebhookRoutes } from "../routes/Webhook/AssinaturaWebhook";


export const routes = Router();

routes.get("/", root);

// ✅ Webhooks públicos (rotas em arquivos separados; ENDEREÇO NÃO MUDA)
routes.use(stripeCreditosWebhookRoutes);
routes.use(stripeAssinaturaWebhookRoutes);

// cliente OAuth
routes.use(clienteAuthRoutes);

// admin: públicas
routes.use(adminAuthRoutes);
routes.use(adminCreationRoutes);

// admin: protegidas
routes.use("/admin/api", adminPrivateRoutes);

// cliente: protegido
routes.use("/api", privateRoutes);
