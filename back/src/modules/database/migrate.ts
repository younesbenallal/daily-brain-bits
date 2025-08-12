import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, client } from "./connection";

async function runMigrations() {
  console.log("🚀 Starting database migration...");

  try {
    await migrate(db, {
      migrationsFolder: "./src/modules/database/migrations",
    });
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  await client.end();
}

runMigrations();
