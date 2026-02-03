import jwt from "jsonwebtoken";

export type AdminTokenPayload = {
  role: "admin";
  adminId: number;
  email: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export function signAdminToken(email: string, adminId: number) {
  const payload: AdminTokenPayload = {
    role: "admin",
    adminId,
    email,
  };

  return jwt.sign(payload, requireEnv("JWT_ADMIN_SECRET"), { expiresIn: "2h" });
}

export function verifyAdminToken(token: string) {
  const decoded = jwt.verify(token, requireEnv("JWT_ADMIN_SECRET")) as AdminTokenPayload;

  // validação extra
  if (decoded.role !== "admin" || !decoded.adminId || !decoded.email) {
    throw new Error("Token admin inválido");
  }

  return decoded;
}
