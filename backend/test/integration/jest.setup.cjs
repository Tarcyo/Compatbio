const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, ".testdb.json");
const { databaseUrl, dbName } = JSON.parse(fs.readFileSync(file, "utf-8"));

process.env.DATABASE_URL = databaseUrl;
process.env.TEST_DB_NAME = dbName;

process.env.JWT_SECRET = process.env.JWT_SECRET || "jwt_test_secret";
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
