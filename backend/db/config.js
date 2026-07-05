import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import mysql from "mysql2/promise";

const isTruthy = (value) => value === "true" || value === "1";

const buildSslConfig = () => {
  if (!isTruthy(process.env.DB_SSL)) {
    return undefined;
  }

  const sslConfig = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };

  if (process.env.DB_SSL_CA) {
    sslConfig.ca = process.env.DB_SSL_CA;
  } else if (process.env.DB_SSL_CA_PATH) {
    sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8");
  }

  return sslConfig;
};

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306, // Changed from 3307 to 3306
  ssl: buildSslConfig(),
});

const ensureParams = (params) => {
  if (params === undefined || params === null) {
    throw new Error("SQL parameters are required");
  }
  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === "object";
  if (!isArray && !isObject) {
    throw new Error("SQL parameters must be an array or object");
  }
};

export const safeExecute = async (sql, params) => {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error("SQL query must be a non-empty string");
  }
  ensureParams(params);
  const [result] = await db.execute(sql, params);
  return result;
};
