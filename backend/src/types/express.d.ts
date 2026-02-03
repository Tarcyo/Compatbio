import type { AuthTokenPayload } from "../services/token.service";
import type { AdminTokenPayload } from "../services/adminToken.service";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      adminAuth?: AdminTokenPayload; // ✅ novo
    }
  }
}

export {};
