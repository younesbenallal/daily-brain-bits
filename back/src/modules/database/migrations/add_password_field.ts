import { db } from "../connection";
import { sql } from "drizzle-orm";

async function addPasswordColumn() {
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';`
    );
    console.log("Password column added successfully");
  } catch (error) {
    console.error("Error adding password column:", error);
  } finally {
    process.exit(0);
  }
}

addPasswordColumn();
