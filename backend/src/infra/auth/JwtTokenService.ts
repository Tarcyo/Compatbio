import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";
import type { TokenService } from "../../application/usecases/AuthenticateGoogleUser.js";

export class JwtTokenService implements TokenService {
  constructor(private readonly secret: Secret) {}

  sign(payload: object, expiresIn: StringValue | number): string {
    const options: SignOptions = { expiresIn };
    return jwt.sign(payload, this.secret, options);
  }

  verify<T>(token: string): T {
    return jwt.verify(token, this.secret) as T;
  }
}
