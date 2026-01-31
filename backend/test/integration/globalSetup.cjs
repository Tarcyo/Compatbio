require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { execSync } = require("child_process");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

function makeTestDbName() {
  const rand = crypto.randomBytes(6).toString("hex");
  return `compatbio_test_${Date.now()}_${rand}`;
}

module.exports = async () => {
  const base = requireEnv("TEST_DATABASE_URL_BASE");
  const dbName = makeTestDbName();
  const databaseUrl = `${base}/${dbName}`;

  const baseUrl = new URL(base);
  const conn = await mysql.createConnection({
    host: baseUrl.hostname,
    port: Number(baseUrl.port || 3306),
    user: decodeURIComponent(baseUrl.username),
    password: decodeURIComponent(baseUrl.password),
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await conn.end();

  execSync(`npx prisma db push --skip-generate --schema ./prisma/schema.prisma`, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  fs.writeFileSync(
    path.join(__dirname, ".testdb.json"),
    JSON.stringify({ dbName, databaseUrl }, null, 2),
    "utf-8"
  );
};
