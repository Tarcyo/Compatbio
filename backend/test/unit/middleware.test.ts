import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { authRequired } from "../../src/middleware/middleware";

jest.mock("../../src/services/token.service", () => ({
  verifyAuthToken: jest.fn((token: string) => {
    if (token === "ok") return { sub: "1", email: "a@b.com", clienteId: 10 };
    throw new Error("invalid");
  }),
}));

describe("authRequired middleware", () => {
  const app = express();
  app.use(cookieParser());

  app.get("/private", authRequired, (req, res) => {
    // @ts-ignore
    res.json({ ok: true, auth: req.auth });
  });

  test("sem token -> 401", async () => {
    const res = await request(app).get("/private");
    expect(res.status).toBe(401);
  });

  test("com bearer -> 200", async () => {
    const res = await request(app)
      .get("/private")
      .set("Authorization", "Bearer ok");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.auth.email).toBe("a@b.com");
  });

  test("com cookie -> 200", async () => {
    const res = await request(app)
      .get("/private")
      .set("Cookie", ["cb_token=ok"]);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("token inválido -> 401", async () => {
    const res = await request(app)
      .get("/private")
      .set("Authorization", "Bearer nope");

    expect(res.status).toBe(401);
  });
});
