import { SpacedRepetitionService } from "./spaced-repetition.service";
import type { Card, Review } from "./spaced-repetition.types";

export interface DailyEmailCard {
  card: Card;
  reason: "new" | "review" | "difficult";
  lastReview?: Review;
  daysUntilNextReview?: number;
}

export interface DailyEmailPlan {
  date: Date;
  cards: DailyEmailCard[];
  totalCards: number;
  newCards: number;
  reviewCards: number;
  difficultCards: number;
}

export class DailyEmailService {
  private spacedRepetitionService: SpacedRepetitionService;

  constructor(notionToken: string) {
    this.spacedRepetitionService = new SpacedRepetitionService(notionToken);
  }

  // 🎯 Obtenir la carte du jour pour l'email
  async getTodayEmailCard(userId: number): Promise<DailyEmailCard | null> {
    try {
      // 1. Prioriser les cartes difficiles (répétées récemment)
      const difficultCards = await this.getDifficultCards(userId);
      if (difficultCards.length > 0) {
        return {
          card: difficultCards[0],
          reason: "difficult",
          lastReview: await this.getLastReview(difficultCards[0].id, userId),
        };
      }

      // 2. Ensuite les cartes à réviser aujourd'hui
      const reviewCards =
        await this.spacedRepetitionService.getTodayReviewCards(userId);
      if (reviewCards.length > 0) {
        return {
          card: reviewCards[0],
          reason: "review",
          lastReview: await this.getLastReview(reviewCards[0].id, userId),
        };
      }

      // 3. Enfin une nouvelle carte
      const newCards = await this.spacedRepetitionService.getNewCards(
        userId,
        1
      );
      if (newCards.length > 0) {
        return {
          card: newCards[0],
          reason: "new",
        };
      }

      return null; // Aucune carte disponible
    } catch (error) {
      console.error("Erreur lors de la sélection de la carte du jour:", error);
      throw error;
    }
  }

  // 🔄 Planifier les emails pour les 7 prochains jours
  async planNextWeekEmails(userId: number): Promise<DailyEmailPlan[]> {
    const plans: DailyEmailPlan[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const todayCard = await this.getTodayEmailCard(userId);
      const cards = todayCard ? [todayCard] : [];

      const plan: DailyEmailPlan = {
        date,
        cards,
        totalCards: cards.length,
        newCards: cards.filter((c) => c.reason === "new").length,
        reviewCards: cards.filter((c) => c.reason === "review").length,
        difficultCards: cards.filter((c) => c.reason === "difficult").length,
      };

      plans.push(plan);
    }

    return plans;
  }

  // 📊 Simuler la révision d'une carte (pour les tests)
  async simulateCardReview(
    cardId: number,
    userId: number,
    quality: number
  ): Promise<Review> {
    const review = await this.spacedRepetitionService.submitReview(
      cardId,
      userId,
      { quality }
    );

    console.log(`📝 Carte révisée (qualité: ${quality}/5)`);
    console.log(
      `   📅 Prochaine révision: ${review.nextReviewDate.toLocaleDateString(
        "fr-FR"
      )}`
    );
    console.log(`   ⏱️  Intervalle: ${review.interval} jour(s)`);
    console.log(
      `   🎯 Facteur de facilité: ${review.easinessFactor?.toFixed(2) || "N/A"}`
    );

    return review;
  }

  // 📈 Obtenir les statistiques d'apprentissage
  async getLearningStats(userId: number): Promise<{
    totalCards: number;
    masteredCards: number; // Cartes avec intervalle > 30 jours
    difficultCards: number;
    newCards: number;
    averageInterval: number;
  }> {
    // Cette méthode nécessiterait des requêtes SQL personnalisées
    // Pour l'instant, version simplifiée
    const todayCards = await this.spacedRepetitionService.getTodayReviewCards(
      userId
    );
    const newCards = await this.spacedRepetitionService.getNewCards(
      userId,
      100
    );

    return {
      totalCards: todayCards.length + newCards.length,
      masteredCards: 0, // À implémenter
      difficultCards: 0, // À implémenter
      newCards: newCards.length,
      averageInterval: 0, // À implémenter
    };
  }

  // 🚨 Obtenir les cartes difficiles (scores faibles récents)
  private async getDifficultCards(userId: number): Promise<Card[]> {
    // Pour l'instant, version simplifiée
    // Dans une vraie implémentation, on rechercherait les cartes avec:
    // - Qualité < 3 dans les dernières révisions
    // - Intervalles courts répétés
    return [];
  }

  // 📝 Obtenir la dernière révision d'une carte
  private async getLastReview(
    cardId: number,
    userId: number
  ): Promise<Review | undefined> {
    // Cette méthode nécessiterait une requête SQL personnalisée
    // Pour l'instant, version simplifiée
    return undefined;
  }

  // 🧪 Mode test : simuler plusieurs jours d'apprentissage
  async simulateLearningJourney(
    userId: number,
    databaseId: string,
    days: number = 14
  ): Promise<void> {
    console.log(`🚀 Simulation d'apprentissage sur ${days} jours`);
    console.log("=".repeat(60));

    // Synchroniser avec Notion
    await this.spacedRepetitionService.syncNotionCards(userId, databaseId);

    for (let day = 1; day <= days; day++) {
      console.log(`\n📅 JOUR ${day}`);
      console.log("-".repeat(20));

      const todayCard = await this.getTodayEmailCard(userId);

      if (todayCard) {
        console.log(`📧 Email du jour: "${todayCard.card.title}"`);
        console.log(`🏷️  Raison: ${this.getReasonLabel(todayCard.reason)}`);

        // Simuler une réponse aléatoire (3-5 pour des bonnes réponses)
        const quality = Math.floor(Math.random() * 3) + 3; // 3, 4, ou 5

        await this.simulateCardReview(todayCard.card.id, userId, quality);
      } else {
        console.log(
          "📭 Aucun email aujourd'hui (toutes les cartes maîtrisées !)"
        );
      }
    }

    console.log("\n🎉 Simulation terminée !");
  }

  private getReasonLabel(reason: "new" | "review" | "difficult"): string {
    switch (reason) {
      case "new":
        return "🆕 Nouvelle leçon";
      case "review":
        return "🔄 Révision programmée";
      case "difficult":
        return "🚨 Renforcement (difficulté)";
    }
  }
}
