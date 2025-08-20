import { SpacedRepetitionService } from "../spaced-repetition/spaced-repetition.service";
import type {
  Card,
  Review,
} from "../spaced-repetition/spaced-repetition.types";

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

  async getTodayEmailCard(userId: number): Promise<DailyEmailCard | null> {
    try {
      const difficultCards = await this.getDifficultCards(userId);
      if (difficultCards.length > 0) {
        return {
          card: difficultCards[0],
          reason: "difficult",
          lastReview: await this.getLastReview(difficultCards[0].id, userId),
        };
      }

      const reviewCards =
        await this.spacedRepetitionService.getTodayReviewCards(userId);
      if (reviewCards.length > 0) {
        return {
          card: reviewCards[0],
          reason: "review",
          lastReview: await this.getLastReview(reviewCards[0].id, userId),
        };
      }

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

      return null;
    } catch (error) {
      console.error("Erreur lors de la sélection de la carte du jour:", error);
      throw error;
    }
  }

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
    return review;
  }

  async getLearningStats(userId: number): Promise<{
    totalCards: number;
    masteredCards: number;
    difficultCards: number;
    newCards: number;
    averageInterval: number;
  }> {
    const todayCards =
      await this.spacedRepetitionService.getTodayReviewCards(userId);
    const newCards = await this.spacedRepetitionService.getNewCards(
      userId,
      100
    );

    return {
      totalCards: todayCards.length + newCards.length,
      masteredCards: 0,
      difficultCards: 0,
      newCards: newCards.length,
      averageInterval: 0,
    };
  }

  private async getDifficultCards(userId: number): Promise<Card[]> {
    return [];
  }

  private async getLastReview(
    cardId: number,
    userId: number
  ): Promise<Review | undefined> {
    return undefined;
  }

  async simulateLearningJourney(
    userId: number,
    databaseId: string,
    days: number = 14
  ): Promise<void> {
    await this.spacedRepetitionService.syncNotionCards(userId, databaseId);
    for (let day = 1; day <= days; day++) {
      const todayCard = await this.getTodayEmailCard(userId);
      if (todayCard) {
        const quality = Math.floor(Math.random() * 3) + 3;
        await this.simulateCardReview(todayCard.card.id, userId, quality);
      } else {
      }
    }
  }
}
