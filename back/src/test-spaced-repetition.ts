import { SpacedRepetitionService } from "./modules/spaced-repetition/spaced-repetition.service";
import { db } from "./modules/database/connection";
import { cards, reviews } from "./modules/database/schemas";
import { eq } from "drizzle-orm";

class SpacedRepetitionTester {
  private service: SpacedRepetitionService;
  private userId: number = 1; // Utilisateur admin

  constructor() {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
      throw new Error("❌ NOTION_TOKEN manquant dans .env");
    }
    this.service = new SpacedRepetitionService(notionToken);
  }

  // Test 1: Synchronisation avec Notion
  async testNotionSync(databaseId: string) {
    console.log("🔄 Test 1: Synchronisation avec Notion");
    console.log("=".repeat(50));

    try {
      const cards = await this.service.syncNotionCards(this.userId, databaseId);
      console.log(`✅ ${cards.length} cartes synchronisées depuis Notion`);

      cards.forEach((card, index) => {
        console.log(`📝 Carte ${index + 1}:`);
        console.log(`   ID: ${card.id}`);
        console.log(`   Titre: ${card.title}`);
        console.log(`   Contenu: ${card.content?.substring(0, 100)}...`);
        console.log(`   Notion ID: ${card.notionPageId}`);
        console.log("");
      });

      return cards;
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      throw error;
    }
  }

  // Test 2: Simulation de répétition sur plusieurs jours
  async testSpacedRepetitionEvolution(
    cardId: number,
    reviewQualities: number[]
  ) {
    console.log("📈 Test 2: Évolution de la répétition espacée");
    console.log("=".repeat(50));

    // Récupérer la carte
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);
    if (!card) {
      throw new Error(`Carte avec ID ${cardId} non trouvée`);
    }

    console.log(`🃏 Carte testée: "${card.title}"`);
    console.log("");

    let currentDate = new Date();

    for (let i = 0; i < reviewQualities.length; i++) {
      const quality = reviewQualities[i];

      console.log(
        `📅 Jour ${i + 1} (${currentDate.toLocaleDateString("fr-FR")})`
      );
      console.log(
        `   Qualité de réponse: ${quality}/5 ${this.getQualityDescription(
          quality
        )}`
      );

      // Soumettre la révision
      const review = await this.service.submitReview(cardId, this.userId, {
        quality,
      });

      console.log(`   📊 Résultats:`);
      console.log(`     - Répétition: ${review.repetition}`);
      console.log(
        `     - Facteur de facilité: ${review.easinessFactor?.toFixed(2)}`
      );
      console.log(`     - Intervalle: ${review.interval} jour(s)`);
      console.log(
        `     - Prochaine révision: ${review.nextReviewDate.toLocaleDateString(
          "fr-FR"
        )}`
      );

      // Avancer à la prochaine date de révision
      currentDate = new Date(review.nextReviewDate);

      // Simuler le passage du temps en modifiant la date de révision dans le passé
      if (i < reviewQualities.length - 1) {
        await db
          .update(reviews)
          .set({ reviewedAt: currentDate })
          .where(eq(reviews.id, review.id));
      }

      console.log("");
    }
  }

  // Test 3: Obtenir les cartes du jour après évolution
  async testTodayCards() {
    console.log("📋 Test 3: Cartes du jour");
    console.log("=".repeat(50));

    const todayCards = await this.service.getTodayReviewCards(this.userId);
    const newCards = await this.service.getNewCards(this.userId, 5);

    console.log(`🔄 Cartes à réviser: ${todayCards.length}`);
    todayCards.forEach((card) => {
      console.log(`   - ${card.title}`);
    });

    console.log(`🆕 Nouvelles cartes: ${newCards.length}`);
    newCards.forEach((card) => {
      console.log(`   - ${card.title}`);
    });

    return { todayCards, newCards };
  }

  // Test 4: Statistiques quotidiennes
  async testDailyStats() {
    console.log("📊 Test 4: Statistiques quotidiennes");
    console.log("=".repeat(50));

    const today = new Date();
    const stats = await this.service.getDailyStats(this.userId, today);

    console.log(
      `📅 Statistiques pour le ${today.toLocaleDateString("fr-FR")}:`
    );
    console.log(`   🆕 Nouvelles cartes: ${stats.newCards}`);
    console.log(`   🔄 Cartes révisées: ${stats.reviewedCards}`);
    console.log(`   ✅ Réponses correctes: ${stats.correctAnswers}`);
    console.log(`   📈 Qualité moyenne: ${stats.averageQuality.toFixed(2)}/5`);

    return stats;
  }

  // Helper: Description de la qualité
  private getQualityDescription(quality: number): string {
    const descriptions = {
      0: "❌ Échec total",
      1: "❌ Incorrecte",
      2: "❌ Incorrecte avec effort",
      3: "⚠️ Correcte avec difficulté",
      4: "✅ Correcte",
      5: "✅ Parfaite",
    };
    return descriptions[quality] || "Inconnue";
  }

  // Scénario complet de test
  async runFullTest(databaseId: string) {
    console.log("🚀 DÉBUT DES TESTS DE RÉPÉTITION ESPACÉE");
    console.log("=".repeat(60));
    console.log("");

    try {
      // 1. Synchroniser avec Notion
      const syncedCards = await this.testNotionSync(databaseId);

      if (syncedCards.length === 0) {
        console.log("⚠️ Aucune carte trouvée. Assurez-vous que:");
        console.log("   - Votre database Notion contient des pages");
        console.log(
          "   - Ces pages ont une propriété 'Status' = 'Ready for Review'"
        );
        return;
      }

      console.log("");

      // 2. Tester l'évolution avec la première carte
      const firstCard = syncedCards[0];
      console.log(`🎯 Test avec la carte: "${firstCard.title}"`);
      console.log("");

      // Simuler différents scénarios de qualité
      const scenarios = [
        {
          name: "📈 Scénario optimiste (bonnes réponses)",
          qualities: [4, 5, 4, 5, 4],
        },
        {
          name: "📉 Scénario avec difficultés",
          qualities: [3, 2, 4, 3, 5],
        },
        {
          name: "🎲 Scénario mixte",
          qualities: [4, 3, 5, 2, 4, 5],
        },
      ];

      for (const scenario of scenarios) {
        console.log(scenario.name);
        console.log("-".repeat(30));
        await this.testSpacedRepetitionEvolution(
          firstCard.id,
          scenario.qualities
        );
        console.log("");
      }

      // 3. Voir l'état final
      await this.testTodayCards();
      console.log("");

      // 4. Statistiques
      await this.testDailyStats();
    } catch (error) {
      console.error("❌ Erreur pendant les tests:", error);
    }

    console.log("");
    console.log("🏁 TESTS TERMINÉS");
    console.log("=".repeat(60));
  }
}

// Fonction principale
async function runTests() {
  const databaseId = process.argv[2];

  if (!databaseId) {
    console.error(
      "❌ Usage: bun run src/test-spaced-repetition.ts <NOTION_DATABASE_ID>"
    );
    console.error(
      "💡 Trouvez votre Database ID dans l'URL de votre page Notion"
    );
    process.exit(1);
  }

  const tester = new SpacedRepetitionTester();
  await tester.runFullTest(databaseId);
  process.exit(0);
}

runTests().catch(console.error);
