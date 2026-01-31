import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { routes } from "./routes";

const app = express();

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");

app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(routes);

export default app;
