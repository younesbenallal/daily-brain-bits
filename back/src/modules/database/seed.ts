import { db } from "./connection";
import { users } from "./schemas";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Créer des utilisateurs de test
    const testUsers = await db
      .insert(users)
      .values([
        {
          email: "admin@dailybrainbits.com",
          name: "Admin User",
        },
        {
          email: "test@example.com",
          name: "Test User",
        },
      ])
      .returning();

    console.log(`✅ Created ${testUsers.length} test users`);

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seedDatabase().catch(console.error);
