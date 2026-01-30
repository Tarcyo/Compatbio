import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { buildRoutes } from "./routes.js";
import type { AuthController } from "./controllers/AuthController.js";
import type { MeController } from "./controllers/MeController.js";

export function createApp(config: {
  frontendUrl: string;
  authController: AuthController;
  meController: MeController;
}) {
  const app = express();

  app.use(cookieParser());
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(buildRoutes({ auth: config.authController, me: config.meController }));

  return app;
}
