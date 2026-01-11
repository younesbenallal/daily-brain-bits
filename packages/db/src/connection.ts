import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schemas/core";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const connectionString = process.env.DATABASE_URL;
const client = new SQL(connectionString);

export const db = drizzle({ client, schema });
