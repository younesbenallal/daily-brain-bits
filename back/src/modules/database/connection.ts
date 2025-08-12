import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseConfig } from "./config";
import * as schema from "./schemas";

// Configuration de la connexion PostgreSQL
const client = postgres(databaseConfig.connectionString, {
  prepare: false,
  max: 10,
});

// Instance Drizzle avec schémas
export const db = drizzle(client, { schema });

// Client PostgreSQL pour les opérations directes si nécessaire
export { client };

// Test de connexion
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
