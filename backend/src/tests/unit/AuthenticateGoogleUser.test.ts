import { describe, it, expect, vi } from "vitest";
import { AuthenticateGoogleUser } from "../../application/usecases/AuthenticateGoogleUser.js";
import type {
  GoogleOAuthPort,
  TokenService,
} from "../../application/usecases/AuthenticateGoogleUser.js";
import { UserRepository } from "../../domain/user/UerRepository.js";

describe("AuthenticateGoogleUser (unit)", () => {
  it("deve criar (upsert) o usuário e retornar jwt", async () => {
    const google: GoogleOAuthPort = {
      getAuthUrl: vi.fn(() => "http://google-auth"),
      fetchUserInfoFromCode: vi.fn(async () => ({
        sub: "google-sub-1",
        email: "teste@exemplo.com",
        email_verified: true,
        name: "Teste Nome",
      })),
    };

    const users: UserRepository = {
      findByEmail: vi.fn(async () => null),
      upsertByEmail: vi.fn(async ({ email, name }) => ({
        id: 123,
        email,
        name,
      })),
    };

    const tokens: TokenService = {
      sign: vi.fn(() => "jwt_mock"),
      verify: vi.fn(),
    };

    const usecase = new AuthenticateGoogleUser(google, users, tokens);

    const result = await usecase.execute({ code: "any_code" });

    expect(google.fetchUserInfoFromCode).toHaveBeenCalledWith("any_code");
    expect(users.upsertByEmail).toHaveBeenCalledWith({
      email: "teste@exemplo.com",
      name: "Teste Nome",
    });
    expect(tokens.sign).toHaveBeenCalled();
    expect(result.jwt).toBe("jwt_mock");
    expect(result.user).toEqual({
      id: 123,
      email: "teste@exemplo.com",
      name: "Teste Nome",
    });
  });

  it("deve montar nome usando given_name + family_name se name não vier", async () => {
    const google: GoogleOAuthPort = {
      getAuthUrl: vi.fn(() => "http://google-auth"),
      fetchUserInfoFromCode: vi.fn(async () => ({
        sub: "google-sub-2",
        email: "x@exemplo.com",
        given_name: "Ana",
        family_name: "Silva",
      })),
    };

    const users: UserRepository = {
      findByEmail: vi.fn(async () => null),
      upsertByEmail: vi.fn(async ({ email, name }) => ({
        id: 1,
        email,
        name,
      })),
    };

    const tokens: TokenService = {
      sign: vi.fn(() => "jwt_mock"),
      verify: vi.fn(),
    };

    const usecase = new AuthenticateGoogleUser(google, users, tokens);

    const result = await usecase.execute({ code: "code" });

    expect(users.upsertByEmail).toHaveBeenCalledWith({
      email: "x@exemplo.com",
      name: "Ana Silva",
    });
    expect(result.user.name).toBe("Ana Silva");
  });
});
