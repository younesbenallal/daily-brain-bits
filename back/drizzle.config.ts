import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/modules/database/schemas/*",
  out: "./src/modules/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "daily_brain_bits",
    port: parseInt(process.env.DB_PORT || "5432"),
    ssl: false, // Désactive SSL
  },
  verbose: true,
  strict: true,
});
