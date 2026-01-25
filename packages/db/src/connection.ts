import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as auth from "./schemas/auth";
import * as core from "./schemas/core";
import * as emailSequences from "./schemas/email-sequences";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);

export const db = drizzle(client, { schema: { ...core, ...auth, ...emailSequences } });
