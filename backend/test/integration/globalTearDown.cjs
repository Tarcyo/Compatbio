require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

module.exports = async () => {
  const base = requireEnv("TEST_DATABASE_URL_BASE");
  const file = path.join(__dirname, ".testdb.json");
  const { dbName } = JSON.parse(fs.readFileSync(file, "utf-8"));

  const baseUrl = new URL(base);
  const conn = await mysql.createConnection({
    host: baseUrl.hostname,
    port: Number(baseUrl.port || 3306),
    user: decodeURIComponent(baseUrl.username),
    password: decodeURIComponent(baseUrl.password),
    multipleStatements: true,
  });

  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
  await conn.end();

  fs.unlinkSync(file);
};
