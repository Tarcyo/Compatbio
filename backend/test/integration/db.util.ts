import crypto from "crypto";

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export function makeTestDbName() {
  const rand = crypto.randomBytes(6).toString("hex");
  return `compatbio_test_${Date.now()}_${rand}`;
}

export function makeDbUrl(baseUrl: string, dbName: string) {
  return `${baseUrl}/${dbName}`;
}
