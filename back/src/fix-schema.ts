import { db } from "./modules/database/connection";
import { sql } from "drizzle-orm";

async function fixSchema() {
  try {
    // Supprime les colonnes notion si elles existent
    await db.execute(sql`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS notion_access_token,
      DROP COLUMN IF EXISTS notion_refresh_token;
    `);

    console.log("✅ Schema fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing schema:", error);
  } finally {
    process.exit(0);
  }
}

fixSchema();
