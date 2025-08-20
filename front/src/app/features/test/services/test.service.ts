export interface Integration {
  id: string;
  userId: string;
  type: string;
  name: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  metadata: {
    botId: string;
    owner: {
      type: string;
      user: {
        id: string;
        name: string;
        type: string;
        object: string;
        person: {
          email: string;
        };
        avatar_url: string;
      };
    };
    request_id: string;
    workspaceId: string;
    workspaceIcon: string;
    workspaceName: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  id: string;
  integrationId: string;
  databaseId: string;
  databaseTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCard {
  id: string;
  title: string;
  databaseTitle: string;
  quality: number;
  repetition: number;
  easinessFactor: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate?: Date;
}

export interface DailyTestResult {
  date: Date;
  cardsReviewed: number;
  newCards: number;
  averageQuality: number;
  totalCards: number;
  cards: TestCard[];
}

export interface TestSimulationResult {
  totalDays: number;
  totalCardsReviewed: number;
  totalNewCards: number;
  averageQuality: number;
  dailyResults: DailyTestResult[];
  finalCards: TestCard[];
  summary: {
    bestDay: DailyTestResult;
    worstDay: DailyTestResult;
    averageCardsPerDay: number;
    retentionRate: number;
  };
}

export class TestService {
  private static readonly BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Simule l'algorithme SM-2 pour calculer la prochaine révision
  private calculateNextReview(
    quality: number,
    repetition: number,
    easinessFactor: number,
    interval: number
  ) {
    let newEasinessFactor = easinessFactor;
    let newRepetition = repetition;
    let newInterval = interval;

    if (quality >= 3) {
      if (repetition === 0) {
        newInterval = 1; // Revoir demain
      } else if (repetition === 1) {
        newInterval = 6; // Revoir dans 6 jours
      } else {
        newInterval = Math.round(interval * easinessFactor);
      }
      newRepetition = repetition + 1;
    } else {
      newRepetition = 0;
      newInterval = 1; // Recommencer demain
    }

    newEasinessFactor =
      easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEasinessFactor = Math.max(1.3, newEasinessFactor);

    // Maximum 6 mois (180 jours)
    newInterval = Math.min(newInterval, 180);

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      newInterval,
      newRepetition,
      newEasinessFactor,
      nextReviewDate,
    };
  }

  // Génère une qualité de révision aléatoire (simulant les réponses de l'utilisateur)
  private generateRandomQuality(): number {
    // Distribution plus réaliste :
    // 70% de bonnes réponses (4-5)
    // 20% de réponses moyennes (3)
    // 10% de mauvaises réponses (1-2)
    const rand = Math.random();
    if (rand < 0.7) {
      return Math.random() < 0.6 ? 4 : 5; // Bonnes réponses
    } else if (rand < 0.9) {
      return 3; // Réponses moyennes
    } else {
      return Math.random() < 0.5 ? 1 : 2; // Mauvaises réponses
    }
  }

  // Récupère les pages depuis l'API backend
  async fetchNotionPages(
    integrationId: string,
    databaseIds: string[]
  ): Promise<any[]> {
    try {
      // D'abord essayer de récupérer les pages sauvegardées
      const params = new URLSearchParams({
        integrationId,
        databaseIds: JSON.stringify(databaseIds),
      });

      let response = await fetch(
        `${TestService.BASE_URL}/notion-page/saved-notes?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          return result.data;
        }
      }

      response = await fetch(`${TestService.BASE_URL}/notion-page/all-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationId,
          databaseIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching Notion pages:", error);
      throw error;
    }
  }

  // Simule 3 mois d'utilisation quotidienne
  async simulate3MonthsDailyUsage(
    integration: Integration,
    databases: Database[]
  ): Promise<TestSimulationResult> {
    try {
      // 1. Récupérer toutes les pages des bases de données
      const databaseIds = databases.map((db) => db.databaseId);
      const pages = await this.fetchNotionPages(integration.id, databaseIds);

      if (pages.length === 0) {
        throw new Error(
          "Aucune page trouvée dans les bases de données sélectionnées"
        );
      }

      // 2. Créer les cartes initiales
      const initialCards: TestCard[] = pages.map((page, index) => {
        const database = databases.find(
          (db) => db.databaseId === page.databaseId
        );
        return {
          id: page.id,
          title: page.title || `Page ${index + 1}`,
          databaseTitle: database?.databaseTitle || "Unknown Database",
          quality: 0,
          repetition: 0,
          easinessFactor: 2.5,
          interval: 0,
          nextReviewDate: new Date(), // Disponible immédiatement
        };
      });

      // 3. Simuler 90 jours d'utilisation
      const dailyResults: DailyTestResult[] = [];
      let cards = [...initialCards];
      const startDate = new Date();

      // Étaler les cartes initiales sur les premiers jours (2-3 nouvelles cartes par jour)
      cards.forEach((card, index) => {
        const dayOffset = Math.floor(index / 3); // 3 nouvelles cartes par jour max
        const initialDate = new Date(startDate);
        initialDate.setDate(startDate.getDate() + dayOffset);
        card.nextReviewDate = initialDate;
      });

      let totalCardsReviewed = 0;
      let totalNewCards = 0;
      let totalQuality = 0;
      let totalQualityCount = 0;

      for (let day = 0; day < 90; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);

        // Cartes à réviser aujourd'hui
        const cardsToReview = cards.filter((card) => {
          const cardDate = new Date(card.nextReviewDate);
          const currentDateOnly = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          );
          const cardDateOnly = new Date(
            cardDate.getFullYear(),
            cardDate.getMonth(),
            cardDate.getDate()
          );
          return cardDateOnly <= currentDateOnly;
        });

        // Simuler les révisions (max 10 cartes par jour pour être réaliste)
        const dailyReviewLimit = Math.min(10, cardsToReview.length);
        const reviewedCards = cardsToReview.slice(0, dailyReviewLimit);

        let dailyQualitySum = 0;
        let newCardsCount = 0;

        // Traiter chaque carte
        reviewedCards.forEach((card) => {
          const quality = this.generateRandomQuality();
          const isNewCard = card.repetition === 0;

          if (isNewCard) newCardsCount++;

          // Calculer la prochaine révision
          const nextReview = this.calculateNextReview(
            quality,
            card.repetition,
            card.easinessFactor,
            card.interval
          );

          // Mettre à jour la carte
          card.quality = quality;
          card.repetition = nextReview.newRepetition;
          card.easinessFactor = nextReview.newEasinessFactor;
          card.interval = nextReview.newInterval;

          // Calculer la prochaine date de révision à partir de la date actuelle
          const nextReviewDate = new Date(currentDate);
          nextReviewDate.setDate(
            currentDate.getDate() + nextReview.newInterval
          );
          card.nextReviewDate = nextReviewDate;
          card.lastReviewDate = new Date(currentDate);

          dailyQualitySum += quality;
          totalQuality += quality;
          totalQualityCount++;
        });

        const averageQuality =
          reviewedCards.length > 0 ? dailyQualitySum / reviewedCards.length : 0;

        const dailyResult: DailyTestResult = {
          date: new Date(currentDate),
          cardsReviewed: reviewedCards.length,
          newCards: newCardsCount,
          averageQuality,
          totalCards: cards.length,
          cards: [...reviewedCards],
        };

        dailyResults.push(dailyResult);

        totalCardsReviewed += reviewedCards.length;
        totalNewCards += newCardsCount;
      }

      // 4. Calculer les statistiques finales
      const averageQuality =
        totalQualityCount > 0 ? totalQuality / totalQualityCount : 0;
      const averageCardsPerDay = totalCardsReviewed / 90;

      // Trouver le meilleur et le pire jour (seulement parmi les jours avec des révisions)
      const daysWithReviews = dailyResults.filter(
        (day) => day.cardsReviewed > 0
      );
      const bestDay =
        daysWithReviews.length > 0
          ? daysWithReviews.reduce((best, current) =>
              current.averageQuality > best.averageQuality ? current : best
            )
          : dailyResults[0];

      const worstDay =
        daysWithReviews.length > 0
          ? daysWithReviews.reduce((worst, current) =>
              current.averageQuality < worst.averageQuality ? current : worst
            )
          : dailyResults[0];

      // Calculer le taux de rétention basé sur les cartes qui ont été révisées au moins une fois
      // et qui ont un facteur de facilité >= 2.5 (considérées comme bien apprises)
      const reviewedCards = cards.filter((card) => card.repetition > 0);
      const retainedCards = reviewedCards.filter(
        (card) => card.easinessFactor >= 2.5
      );
      const retentionRate =
        reviewedCards.length > 0
          ? (retainedCards.length / reviewedCards.length) * 100
          : 0;

      return {
        totalDays: 90,
        totalCardsReviewed,
        totalNewCards,
        averageQuality,
        dailyResults,
        finalCards: cards,
        summary: {
          bestDay,
          worstDay,
          averageCardsPerDay,
          retentionRate,
        },
      };
    } catch (error) {
      console.error("Error in simulation:", error);
      throw error;
    }
  }

  async sendNotesByMail(
    integration: Integration,
    databases: Database[],
    userEmail: string
  ) {
    const params = new URLSearchParams({
      integrationId: integration.id,
      databaseIds: JSON.stringify(databases.map((db) => db.databaseId)),
      userEmail: userEmail,
    });

    let response = await fetch(
      `${TestService.BASE_URL}/notion-page/send-notes?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      const error = await response.json();
      throw new Error(error.message || "Failed to send email");
    }
  }
}

export const testService = new TestService();
