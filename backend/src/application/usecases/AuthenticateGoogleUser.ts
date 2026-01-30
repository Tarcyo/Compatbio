import type { SignOptions } from "jsonwebtoken";
import { UserRepository } from "../../domain/user/UerRepository";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
};

export interface GoogleOAuthPort {
  getAuthUrl(state: string): string;
  fetchUserInfoFromCode(code: string): Promise<GoogleUserInfo>;
}

export interface TokenService {
  sign(payload: object, expiresIn: SignOptions["expiresIn"]): string;
  verify<T>(token: string): T;
}

export class AuthenticateGoogleUser {
  constructor(
    private readonly google: GoogleOAuthPort,
    private readonly users: UserRepository,
    private readonly tokens: TokenService
  ) {}

  async execute(input: { code: string }) {
    const googleUser = await this.google.fetchUserInfoFromCode(input.code);

    const email = googleUser.email;
    const name =
      googleUser.name ||
      [googleUser.given_name, googleUser.family_name].filter(Boolean).join(" ") ||
      "Usuário";

    const user = await this.users.upsertByEmail({ email, name });

    const jwt = this.tokens.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        googleSub: googleUser.sub,
        email_verified: googleUser.email_verified ?? false,
        picture: googleUser.picture,
        locale: googleUser.locale,
      },
      "2h"
    );

    return { user, jwt };
  }
}
