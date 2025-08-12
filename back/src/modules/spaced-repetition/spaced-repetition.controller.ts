import { Context } from "hono";
import { SpacedRepetitionService } from "./spaced-repetition.service";
import type { ReviewResult } from "./spaced-repetition.types";

export class SpacedRepetitionController {
  private spacedRepetitionService: SpacedRepetitionService;

  constructor() {
    // Le service n'a plus besoin de token Notion au constructeur
    this.spacedRepetitionService = new SpacedRepetitionService();
  }

  // Créer des cartes de révision à partir des pages Notion stockées
  async createCardsFromPages(c: Context) {
    try {
      const userId = c.req.param("userId");
      const { databaseIds } = await c.req.json();

      if (!userId) {
        return c.json({ error: "User ID requis" }, 400);
      }

      const cards =
        await this.spacedRepetitionService.createCardsFromStoredPages(
          userId,
          databaseIds
        );

      return c.json({
        message: "Cartes créées à partir des pages stockées",
        cardsCount: cards.length,
        cards,
      });
    } catch (error) {
      console.error("Erreur lors de la création des cartes:", error);
      return c.json(
        {
          error: "Erreur lors de la création des cartes",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        },
        500
      );
    }
  }

  // Synchroniser les cartes depuis Notion (méthode legacy - désactivée)
  async syncCards(c: Context) {
    try {
      const userId = c.req.param("userId");
      const { databaseIds } = await c.req.json();

      if (!userId) {
        return c.json({ error: "User ID requis" }, 400);
      }

      // Rediriger vers la nouvelle méthode
      const cards =
        await this.spacedRepetitionService.createCardsFromStoredPages(
          userId,
          databaseIds
        );

      return c.json({
        message: "Cartes récupérées depuis les pages stockées",
        cardsCount: cards.length,
        cards,
      });
    } catch (error) {
      console.error("Erreur lors de la synchronisation:", error);
      return c.json(
        {
          error: "Erreur lors de la synchronisation",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        },
        500
      );
    }
  }

  // Obtenir les cartes à réviser aujourd'hui
  async getTodayCards(c: Context) {
    try {
      const userId = Number(c.req.param("userId"));

      const reviewCards =
        await this.spacedRepetitionService.getTodayReviewCards(userId);
      const settings =
        await this.spacedRepetitionService.getUserSettings(userId);

      // Limiter selon les paramètres utilisateur
      const newCards = await this.spacedRepetitionService.getNewCards(
        userId,
        Math.max(0, (settings?.cardsPerDay ?? 0) - reviewCards.length)
      );

      const allCards = [...reviewCards, ...newCards].slice(
        0,
        settings?.maxReviewsPerDay ?? 0
      );

      return c.json({
        cards: allCards,
        reviewCards: reviewCards.length,
        newCards: newCards.length,
        totalToday: allCards.length,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des cartes:", error);
      return c.json(
        { error: "Erreur lors de la récupération des cartes" },
        500
      );
    }
  }

  // Soumettre une révision
  async submitReview(c: Context) {
    try {
      const userId = Number(c.req.param("userId"));
      const cardId = Number(c.req.param("cardId"));
      const reviewResult: ReviewResult = await c.req.json();

      if (reviewResult.quality < 0 || reviewResult.quality > 5) {
        return c.json({ error: "La qualité doit être entre 0 et 5" }, 400);
      }

      const review = await this.spacedRepetitionService.submitReview(
        cardId,
        userId,
        reviewResult
      );

      return c.json({
        message: "Révision enregistrée",
        review,
        nextReviewDate: review.nextReviewDate,
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la révision:", error);
      return c.json({ error: "Erreur lors de l'enregistrement" }, 500);
    }
  }

  // Obtenir les paramètres utilisateur
  async getSettings(c: Context) {
    try {
      const userId = Number(c.req.param("userId"));
      const settings =
        await this.spacedRepetitionService.getUserSettings(userId);

      return c.json({ settings });
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres:", error);
      return c.json(
        { error: "Erreur lors de la récupération des paramètres" },
        500
      );
    }
  }

  // Obtenir les statistiques
  async getStats(c: Context) {
    try {
      const userId = Number(c.req.param("userId"));
      const dateParam = c.req.query("date");
      const date = dateParam ? new Date(dateParam) : new Date();

      const stats = await this.spacedRepetitionService.getDailyStats(
        userId,
        date
      );

      return c.json({ stats });
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      return c.json(
        { error: "Erreur lors de la récupération des statistiques" },
        500
      );
    }
  }
}

export const spacedRepetitionController = new SpacedRepetitionController();
