import { SpacedRepetitionService } from "./src/modules/spaced-repetition/spaced-repetition.service";

async function quickTest() {
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.argv[2];

  if (!notionToken || !databaseId) {
    console.error(
      "❌ Usage: NOTION_TOKEN=xxx bun run src/quick-test.ts <DATABASE_ID>"
    );
    process.exit(1);
  }

  const service = new SpacedRepetitionService(notionToken);
  const userId = 1;

  try {
    // Sync Notion
    console.log("🔄 Synchronisation avec Notion...");
    const cards = await service.syncNotionCards(userId, databaseId);
    console.log(`✅ ${cards.length} cartes synchronisées`);

    if (cards.length > 0) {
      const firstCard = cards[0];
      console.log(`\n🃏 Test avec: "${firstCard.title}"`);

      // Premier test: qualité 4
      console.log("\n📝 Révision 1 (qualité: 4/5)");
      const review1 = await service.submitReview(firstCard.id, userId, {
        quality: 4,
      });
      console.log(
        `   Prochaine révision: ${review1.nextReviewDate.toLocaleDateString()}`
      );
      console.log(`   Intervalle: ${review1.interval} jour(s)`);

      // Deuxième test: qualité 5
      console.log("\n📝 Révision 2 (qualité: 5/5)");
      const review2 = await service.submitReview(firstCard.id, userId, {
        quality: 5,
      });
      console.log(
        `   Prochaine révision: ${review2.nextReviewDate.toLocaleDateString()}`
      );
      console.log(`   Intervalle: ${review2.interval} jour(s)`);

      // Cartes du jour
      console.log("\n📋 Cartes disponibles aujourd'hui:");
      const todayCards = await service.getTodayReviewCards(userId);
      console.log(`   ${todayCards.length} carte(s) à réviser`);
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

quickTest();
