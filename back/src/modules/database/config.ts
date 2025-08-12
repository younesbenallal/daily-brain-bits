import * as dotenv from "dotenv";

dotenv.config();

export const databaseConfig = {
  connectionString: process.env.DATABASE_URL!,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "daily_brain_bits",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
};

if (!databaseConfig.connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}
