import type { AuthTokenPayload } from "../services/token.service";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export {};
