import type { TokenService } from "./AuthenticateGoogleUser.js";

export class GetMe {
  constructor(private readonly tokens: TokenService) {}

  execute(input: { token: string }) {
    return this.tokens.verify<{ userId: number; email: string; name: string }>(input.token);
  }
}
