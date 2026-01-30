import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "../../infra/db/PrismaClient";
import { PrismaUserRepository } from "../../infra/db/PrismaUserRepository";
import { JwtTokenService } from "../../infra/auth/JwtTokenService";
import { AuthenticateGoogleUser, GoogleOAuthPort } from "../../application/usecases/AuthenticateGoogleUser";
import { GetMe } from "../../application/usecases/GetMe";
import { AuthController } from "../../adapters/http/express/controllers/AuthController";
import { MeController } from "../../adapters/http/express/controllers/MeController";
import { createApp } from "../../adapters/http/express/app";


console.log("TEST DATABASE_URL =", process.env.DATABASE_URL);

type SetCookieHeader = string | string[] | undefined;

function normalizeSetCookie(h: SetCookieHeader): string[] {
  if (!h) return [];
  return Array.isArray(h) ? h : [h];
}
function extractCookie(setCookieHeader: SetCookieHeader, cookieName: string) {
  const list = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const raw = list.find((c) => c.startsWith(`${cookieName}=`));
  return raw ? raw.split(";")[0] : null; // "cb_token=...."
}
describe("Auth flow (integration)", () => {
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  function buildTestApp(googleUser: { email: string; name: string; sub?: string }) {
    const google: GoogleOAuthPort = {
      getAuthUrl: () => "http://fake-google-auth",
      fetchUserInfoFromCode: async () => ({
        sub: googleUser.sub ?? "sub-test",
        email: googleUser.email,
        name: googleUser.name,
        email_verified: true,
      }),
    };

    const usersRepo = new PrismaUserRepository();
    const tokens = new JwtTokenService(process.env.JWT_SECRET || "test_secret");

    const authGoogle = new AuthenticateGoogleUser(google, usersRepo, tokens);
    const getMe = new GetMe(tokens);

    const authController = new AuthController(google, authGoogle, FRONTEND_URL);
    const meController = new MeController(getMe);

    return createApp({
      frontendUrl: FRONTEND_URL,
      authController,
      meController,
    });
  }

  it("deve retornar 400 se state não bater com cookie (anti-CSRF)", async () => {
    const app = buildTestApp({ email: "a@a.com", name: "A" });

    const res = await request(app)
      .get("/auth/google/callback?code=abc&state=STATE_DIFERENTE")
      .set("Cookie", ["cb_oauth_state=STATE_COOKIE"]);

    expect(res.status).toBe(400);
    expect(String(res.text)).toMatch(/State inválido/i);
  });

  it("deve criar usuário no DB (se não existir), setar cb_token e redirecionar", async () => {
    const app = buildTestApp({ email: "novo@exemplo.com", name: "Novo Usuário" });

    const res = await request(app)
      .get("/auth/google/callback?code=abc&state=OK")
      .set("Cookie", ["cb_oauth_state=OK"]);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND_URL}/app`);

    const cbTokenCookie = extractCookie(res.headers["set-cookie"], "cb_token");
    expect(cbTokenCookie).toBeTruthy();

    const users = await prisma.user.findMany();
    expect(users.length).toBe(1);
    expect(users[0].email).toBe("novo@exemplo.com");
    expect(users[0].name).toBe("Novo Usuário");
  });

  it("deve atualizar nome do usuário se já existir (upsert update)", async () => {
    // cria antes
    await prisma.user.create({
      data: { email: "existente@exemplo.com", name: "Nome Antigo" },
    });

    const app = buildTestApp({ email: "existente@exemplo.com", name: "Nome Novo" });

    const res = await request(app)
      .get("/auth/google/callback?code=abc&state=OK")
      .set("Cookie", ["cb_oauth_state=OK"]);

    expect(res.status).toBe(302);

    const user = await prisma.user.findUnique({
      where: { email: "existente@exemplo.com" },
    });

    expect(user?.name).toBe("Nome Novo");
  });

  it("GET /me deve retornar usuário decodificado quando cb_token cookie existe", async () => {
    const app = buildTestApp({ email: "me@exemplo.com", name: "User Me" });

    const callback = await request(app)
      .get("/auth/google/callback?code=abc&state=OK")
      .set("Cookie", ["cb_oauth_state=OK"]);

    const cbTokenCookie = extractCookie(callback.headers["set-cookie"], "cb_token");
    expect(cbTokenCookie).toBeTruthy();

    const me = await request(app).get("/me").set("Cookie", [cbTokenCookie!]);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("me@exemplo.com");
    expect(me.body.user.name).toBe("User Me");
    expect(me.body.user.userId).toBeTypeOf("number");
  });

  it("POST /logout deve limpar cookie", async () => {
    const app = buildTestApp({ email: "x@x.com", name: "X" });

    const res = await request(app).post("/logout");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // deve ter header Set-Cookie limpando cb_token (varia por implementação, mas geralmente aparece)
   const setCookie = normalizeSetCookie(res.headers["set-cookie"]);
const cleared = setCookie.some((c) => c.startsWith("cb_token="));
expect(cleared).toBe(true)
  });
});
