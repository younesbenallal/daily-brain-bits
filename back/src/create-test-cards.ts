import { db } from "../src/modules/database/connection";
import { cards } from "../src/modules/database/schemas";

async function createTestCards() {
  console.log("🃏 Création de cartes de test...");

  try {
    const testCards = await db
      .insert(cards)
      .values([
        {
          userId: 1,
          notionPageId: "test-page-1",
          notionDatabaseId: "test-db-1",
          title: "Qu'est-ce que TypeScript ?",
          content:
            "TypeScript est un sur-ensemble de JavaScript qui ajoute des types statiques.",
          tags: ["programmation", "typescript"],
        },
        {
          userId: 1,
          notionPageId: "test-page-2",
          notionDatabaseId: "test-db-1",
          title: "Algorithme de répétition espacée SM-2",
          content:
            "L'algorithme SM-2 utilise un facteur de facilité pour calculer les intervalles de révision.",
          tags: ["apprentissage", "algorithme"],
        },
        {
          userId: 1,
          notionPageId: "test-page-3",
          notionDatabaseId: "test-db-1",
          title: "Qu'est-ce que PostgreSQL ?",
          content:
            "PostgreSQL est un système de gestion de base de données relationnelle open source.",
          tags: ["base-de-données", "postgresql"],
        },
      ])
      .returning();

    console.log(`✅ ${testCards.length} cartes de test créées !`);
    testCards.forEach((card) => {
      console.log(`  - ${card.id}: ${card.title}`);
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création des cartes de test:", error);
  }
}

createTestCards().then(() => process.exit(0));
