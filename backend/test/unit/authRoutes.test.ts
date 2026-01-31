import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { authRoutes } from "../../src/routes/auth.routes";

// mocks
jest.mock("../../src/services/googleOAuth.service", () => ({
  buildGoogleAuthUrl: jest.fn(() => "https://google.test/auth"),
  exchangeCodeForAccessToken: jest.fn(async () => "access_token_test"),
  fetchGoogleUserInfo: jest.fn(async () => ({
    sub: "sub_test",
    email: "user@test.com",
    name: "User Test",
    picture: "pic",
    locale: "pt-BR",
    email_verified: true,
  })),
}));

jest.mock("../../src/services/token.service", () => ({
  signAuthToken: jest.fn(() => "jwt_test_token"),
  verifyAuthToken: jest.fn(() => ({
    sub: "sub_test",
    email: "user@test.com",
    clienteId: 1,
    name: "User Test",
  })),
}));

const upsertMock = jest.fn();
const findUniqueMock = jest.fn();

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    cliente: {
      upsert: (...args: any[]) => upsertMock(...args),
      findUnique: (...args: any[]) => findUniqueMock(...args),
    },
  },
}));

describe("auth routes", () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(authRoutes);

  beforeEach(() => {
    upsertMock.mockReset();
    findUniqueMock.mockReset();
  });

  test("GET /oauth sem code -> 400", async () => {
    const res = await request(app).get("/oauth");
    expect(res.status).toBe(400);
  });

  test("GET /oauth com code -> cria/atualiza cliente, seta cookie e redireciona /app", async () => {
    upsertMock.mockResolvedValueOnce({
      ID: 1,
      EMAIL: "user@test.com",
      NOME: "User Test",
      SALDO: 0,
      ID_ASSINATURA: null,
      ID_EMPRESA: null,
      COMPRA_NO_SISTEMA: false,
    });

    const res = await request(app).get("/oauth?code=abc");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:5173/app");

    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("cb_token=jwt_test_token");
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  test("GET /me sem token -> 401", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });

  test("GET /me com cookie -> 200 e retorna user + cliente", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ID: 1,
      EMAIL: "user@test.com",
      NOME: "User Test",
      SALDO: 0,
      ID_ASSINATURA: null,
      ID_EMPRESA: null,
      COMPRA_NO_SISTEMA: false,
    });

    const res = await request(app)
      .get("/me")
      .set("Cookie", ["cb_token=jwt_test_token"]);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("user@test.com");
    expect(res.body.cliente.EMAIL).toBe("user@test.com");
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });
});
