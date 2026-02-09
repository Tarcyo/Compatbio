import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { routes } from ".";

const app = express();

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");

app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// ✅ RAW body só nos endpoints de webhook (precisa ser ANTES do express.json)
app.use("/stripe/webhook", express.raw({ type: "application/json" }));
app.use("/stripe/webhook-assinatura", express.raw({ type: "application/json" }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(routes);

export default app;
