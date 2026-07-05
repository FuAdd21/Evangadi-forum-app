import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { buildPoolConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  // multipleStatements must be true here since schema.sql contains many
  // CREATE TABLE statements separated by semicolons. This is intentionally
  // NOT enabled on the main app pool (db/config.js) for security reasons.
  const connectionConfig = {
    ...buildPoolConfig(),
    multipleStatements: true,
  };

  console.log("Connecting to database...");
  const connection = await mysql.createConnection(connectionConfig);

  try {
    console.log("Running schema.sql...");
    await connection.query(schemaSql);
    console.log(" All tables created successfully.");

    const [rows] = await connection.query("SHOW TABLES;");
    console.log("Tables now in database:");
    rows.forEach((row) => console.log(" -", Object.values(row)[0]));
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
});