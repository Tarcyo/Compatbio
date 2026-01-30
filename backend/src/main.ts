import "dotenv/config";
import { createApp } from "./adapters/http/express/app.js";


import { AuthController } from "./adapters/http/express/controllers/AuthController.js";
import { MeController } from "./adapters/http/express/controllers/MeController.js";
import { GoogleOAuthClient } from "./infra/auth/GoogleOAuthClient.js";
import { JwtTokenService } from "./infra/auth/JwtTokenService.js";
import { AuthenticateGoogleUser } from "./application/usecases/AuthenticateGoogleUser.js";
import { GetMe } from "./application/usecases/GetMe.js";
import { PrismaUserRepository } from "./infra/db/PrismaUserRepository.js";

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

// Ports/Adapters
const usersRepo = new PrismaUserRepository();
const google = new GoogleOAuthClient({
  clientId: requireEnv("GOOGLE_CLIENT_ID"),
  clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  redirectUri: requireEnv("GOOGLE_REDIRECT_URI"),
});
const tokens = new JwtTokenService(requireEnv("JWT_SECRET"));

// Use cases
const authGoogle = new AuthenticateGoogleUser(google, usersRepo, tokens);
const getMe = new GetMe(tokens);

// Controllers
const authController = new AuthController(google, authGoogle, FRONTEND_URL);
const meController = new MeController(getMe);

// HTTP app
const app = createApp({
  frontendUrl: FRONTEND_URL,
  authController,
  meController,
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});
