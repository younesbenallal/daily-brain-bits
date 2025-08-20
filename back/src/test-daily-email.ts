import { DailyEmailService } from "./modules/spaced-repetition/daily-email.service";

async function testDailyEmailSystem() {
  const databaseId = process.argv[2];

  if (!databaseId) {
    console.error(
      "❌ Usage: bun run src/test-daily-email.ts <NOTION_DATABASE_ID>"
    );
    console.error("💡 Votre Database ID: 1d5fb477920c803d8d73e7ce190ba375");
    process.exit(1);
  }

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("❌ NOTION_TOKEN manquant dans .env");
    process.exit(1);
  }

  const dailyEmailService = new DailyEmailService(notionToken);
  const userId = 1; // Utilisateur admin

  console.log("📧 SYSTÈME D'EMAIL QUOTIDIEN - TESTS");
  console.log("=".repeat(60));
  console.log("");

  try {
    // Test 1: Carte du jour
    console.log("🎯 TEST 1: Carte du jour");
    console.log("-".repeat(30));

    const todayCard = await dailyEmailService.getTodayEmailCard(userId);

    if (todayCard) {
      console.log(`📧 Email d'aujourd'hui:`);
      console.log(`   📝 Titre: "${todayCard.card.title}"`);
      console.log(`   🏷️  Raison: ${getReasonLabel(todayCard.reason)}`);
      console.log(
        `   📄 Contenu: ${
          todayCard.card.content?.substring(0, 100) || "Pas de contenu"
        }...`
      );
      console.log(`   🆔 Notion ID: ${todayCard.card.notionPageId}`);
    } else {
      console.log("📭 Aucun email aujourd'hui");
    }

    console.log("");

    console.log("📅 TEST 2: Planification de la semaine");
    console.log("-".repeat(30));

    const weekPlan = await dailyEmailService.planNextWeekEmails(userId);

    weekPlan.forEach((plan, index) => {
      console.log(
        `${getDayEmoji(plan.date)} ${plan.date.toLocaleDateString("fr-FR")}`
      );
      if (plan.totalCards > 0) {
        const card = plan.cards[0];
        console.log(
          `   📧 "${card.card.title}" (${getReasonLabel(card.reason)})`
        );
      } else {
        console.log(`   📭 Aucun email`);
      }
    });

    console.log("");

    // Test 3: Simulation d'apprentissage sur 14 jours
    console.log("🚀 TEST 3: Simulation d'apprentissage (14 jours)");
    console.log("-".repeat(30));

    await dailyEmailService.simulateLearningJourney(userId, databaseId, 14);

    console.log("");

    // Test 4: Statistiques
    console.log("📊 TEST 4: Statistiques d'apprentissage");
    console.log("-".repeat(30));

    const stats = await dailyEmailService.getLearningStats(userId);

    console.log(`📚 Total des cartes: ${stats.totalCards}`);
    console.log(`🆕 Nouvelles cartes: ${stats.newCards}`);
    console.log(`✅ Cartes maîtrisées: ${stats.masteredCards}`);
    console.log(`🚨 Cartes difficiles: ${stats.difficultCards}`);
    console.log(`📈 Intervalle moyen: ${stats.averageInterval} jours`);
  } catch (error) {
    console.error("❌ Erreur pendant les tests:", error);
  }

  console.log("");
  console.log("🏁 TESTS TERMINÉS");
  console.log("=".repeat(60));
}

// Helpers pour l'affichage
function getReasonLabel(reason: "new" | "review" | "difficult"): string {
  switch (reason) {
    case "new":
      return "🆕 Nouvelle leçon";
    case "review":
      return "🔄 Révision programmée";
    case "difficult":
      return "🚨 Renforcement";
  }
}

function getDayEmoji(date: Date): string {
  const day = date.getDay();
  const emojis = ["🔴", "🔵", "🟢", "🟡", "🟠", "🟣", "⚫"];
  return emojis[day];
}

// Script interactif pour tester différents scénarios
async function interactiveTest() {
  const databaseId = process.argv[2];

  if (!databaseId) {
    console.error("❌ Usage: bun run src/test-daily-email.ts <DATABASE_ID>");
    process.exit(1);
  }

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("❌ NOTION_TOKEN manquant");
    process.exit(1);
  }

  const dailyEmailService = new DailyEmailService(notionToken);
  const userId = 1;

  console.log("🎮 MODE INTERACTIF - Simulation d'emails quotidiens");
  console.log("=".repeat(60));
  console.log("");

  // Simuler différents scénarios de qualité
  const scenarios = [
    { name: "🌟 Apprenant exemplaire", qualities: [5, 4, 5, 4, 5] },
    { name: "📚 Apprenant moyen", qualities: [4, 3, 4, 3, 4] },
    { name: "😅 Apprenant en difficulté", qualities: [3, 2, 3, 2, 4] },
    { name: "🎢 Apprenant irrégulier", qualities: [5, 2, 4, 1, 5] },
  ];

  for (const scenario of scenarios) {
    console.log(`\n${scenario.name}`);
    console.log("-".repeat(30));

    for (let day = 1; day <= scenario.qualities.length; day++) {
      const todayCard = await dailyEmailService.getTodayEmailCard(userId);

      if (todayCard) {
        console.log(`📅 Jour ${day}: "${todayCard.card.title}"`);
        const quality = scenario.qualities[day - 1];
        await dailyEmailService.simulateCardReview(
          todayCard.card.id,
          userId,
          quality
        );
      } else {
        console.log(`📅 Jour ${day}: Aucune carte disponible`);
      }
      console.log("");
    }
  }
}

// Exécuter le test principal
testDailyEmailSystem()
  .then(() => process.exit(0))
  .catch(console.error);
