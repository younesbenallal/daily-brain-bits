import { Client } from "@notionhq/client";
import { db } from "../database/connection";
import {
  cards,
  reviews,
  spacedRepetitionSettings,
} from "../database/schemas/spaced-repetition.schema";
import { integrations } from "../../db/schemas/integrations.schema";
import { notionDatabases } from "../../db/schemas/notion-databases.schema";
import { notionPages } from "../../db/schemas/notion-page.schema";
import { eq, and, lte, desc, asc, sql, inArray } from "drizzle-orm";
import type {
  Card,
  NewCard,
  Review,
  NewReview,
  SpacedRepetitionSettings,
  NotionCard,
  ReviewResult,
  ReviewSession,
  SpacedRepetitionAlgorithm,
  DailyStats,
} from "./spaced-repetition.types";

export class SpacedRepetitionService implements SpacedRepetitionAlgorithm {
  private notion: Client | null = null;

  constructor(notionToken?: string) {
    if (notionToken) {
      this.notion = new Client({ auth: notionToken });
    }
  }

  // Initialiser le client Notion avec le token de l'utilisateur
  private async initializeNotionClient(userId: string): Promise<Client> {
    if (this.notion) {
      return this.notion;
    }

    // Récupérer l'intégration Notion de l'utilisateur
    const integration = await db
      .select()
      .from(integrations)
      .where(
        and(eq(integrations.userId, userId), eq(integrations.type, "notion"))
      )
      .limit(1);

    if (!integration.length || !integration[0].accessToken) {
      throw new Error("Notion integration not found for user");
    }

    this.notion = new Client({ auth: integration[0].accessToken });
    return this.notion;
  }

  // Algorithme SM-2 pour calculer la prochaine révision (VERSION ADAPTÉE EMAIL)
  calculateNextReview(
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

    // 🔥 LIMITATION POUR EMAIL : Maximum 6 mois (180 jours)
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

  // Récupérer les cartes depuis les pages stockées
  async fetchStoredNotionCards(
    userId: string,
    databaseIds?: string[]
  ): Promise<NotionCard[]> {
    try {
      console.log("🔄 Récupération des pages stockées...");

      // Récupérer l'intégration de l'utilisateur
      const integration = await db
        .select()
        .from(integrations)
        .where(
          and(eq(integrations.userId, userId), eq(integrations.type, "notion"))
        )
        .limit(1);

      if (!integration.length) {
        throw new Error("Notion integration not found for user");
      }

      // Construire la requête pour récupérer les pages
      let query = db
        .select()
        .from(notionPages)
        .where(eq(notionPages.integrationId, integration[0].id));

      // Filtrer par bases de données spécifiques si fourni
      if (databaseIds && databaseIds.length > 0) {
        const whereCondition = and(
          eq(notionPages.integrationId, integration[0].id),
          inArray(notionPages.databaseId, databaseIds)
        );
        query = db.select().from(notionPages).where(whereCondition!);
      }

      const storedPages = await query;

      console.log(`📄 ${storedPages.length} page(s) trouvée(s) dans la base`);

      return storedPages.map((page) => ({
        id: page.pageId,
        title: page.pageTitle || "Sans titre",
        content: "", // Le contenu n'est pas stocké pour l'instant
        databaseId: page.databaseId,
        properties: {}, // Pas de propriétés stockées pour l'instant
        createdTime: page.createdAt.toISOString(),
        lastEditedTime: page.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des cartes stockées:",
        error
      );
      throw error;
    }
  }

  // Récupérer les cartes depuis Notion directement (pour synchronisation)
  async fetchNotionCards(
    databaseId: string,
    userId: string
  ): Promise<NotionCard[]> {
    try {
      console.log("🔄 Récupération des pages depuis Notion...");

      const notion = await this.initializeNotionClient(userId);

      const response = await notion.databases.query({
        database_id: databaseId,
        // Pas de filtre pour l'instant - récupère toutes les pages
      });

      console.log(`📄 ${response.results.length} page(s) trouvée(s)`);

      return response.results.map((page: any) => ({
        id: page.id,
        title: this.extractTitle(page.properties),
        content: this.extractContent(page.properties),
        databaseId,
        properties: page.properties,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des cartes Notion:", error);
      throw error;
    }
  }

  // Helper pour extraire le titre
  private extractTitle(properties: any): string {
    // Essayer différents noms de propriété pour le titre
    const titleProps = ["Title", "Name", "Titre", "title", "name"];

    for (const prop of titleProps) {
      if (properties[prop]?.title?.[0]?.plain_text) {
        return properties[prop].title[0].plain_text;
      }
    }

    return "Sans titre";
  }

  // Helper pour extraire le contenu
  private extractContent(properties: any): string {
    // Essayer différents noms de propriété pour le contenu
    const contentProps = [
      "Content",
      "Description",
      "Summary",
      "Contenu",
      "content",
    ];

    for (const prop of contentProps) {
      if (properties[prop]?.rich_text?.[0]?.plain_text) {
        return properties[prop].rich_text[0].plain_text;
      }
    }

    return "";
  }

  // Créer des cartes de révision à partir des pages Notion stockées
  async createCardsFromStoredPages(
    userId: string,
    databaseIds?: string[]
  ): Promise<NotionCard[]> {
    try {
      console.log("🔄 Création des cartes à partir des pages stockées...");

      const notionCards = await this.fetchStoredNotionCards(
        userId,
        databaseIds
      );

      console.log(
        `✅ ${notionCards.length} carte(s) récupérée(s) pour l'utilisateur ${userId}`
      );

      return notionCards;
    } catch (error) {
      console.error("Erreur lors de la création des cartes:", error);
      throw error;
    }
  }

  // Synchroniser les cartes Notion avec la base de données (méthode legacy)
  async syncNotionCards(
    userId: string,
    databaseIds?: string[]
  ): Promise<Card[]> {
    // Cette méthode est conservée pour la compatibilité mais utilise la nouvelle logique
    const notionCards = await this.fetchStoredNotionCards(userId, databaseIds);
    const syncedCards: Card[] = [];

    // Pour l'instant, on retourne les cartes sous format compatible
    // TODO: Adapter le schéma pour utiliser des UUIDs au lieu d'integers
    console.log(
      `📋 ${notionCards.length} cartes synchronisées (format legacy)`
    );

    return syncedCards;
  }

  // Obtenir les cartes à réviser pour aujourd'hui
  async getTodayReviewCards(userId: number): Promise<Card[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const reviewCards = await db
      .select({
        id: cards.id,
        userId: cards.userId,
        notionPageId: cards.notionPageId,
        notionDatabaseId: cards.notionDatabaseId,
        title: cards.title,
        content: cards.content,
        tags: cards.tags,
        difficulty: cards.difficulty,
        isActive: cards.isActive,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt,
      })
      .from(cards)
      .leftJoin(reviews, eq(cards.id, reviews.cardId))
      .where(
        and(
          eq(cards.userId, userId),
          eq(cards.isActive, true),
          sql`(${reviews.nextReviewDate} IS NULL OR ${reviews.nextReviewDate} <= ${today})`
        )
      )
      .orderBy(asc(reviews.nextReviewDate));

    return reviewCards;
  }

  // Obtenir de nouvelles cartes à apprendre
  async getNewCards(userId: number, limit: number = 10): Promise<Card[]> {
    const newCards = await db
      .select()
      .from(cards)
      .leftJoin(reviews, eq(cards.id, reviews.cardId))
      .where(
        and(
          eq(cards.userId, userId),
          eq(cards.isActive, true),
          sql`${reviews.cardId} IS NULL`
        )
      )
      .limit(limit)
      .orderBy(asc(cards.createdAt));

    return newCards.map((row) => row.cards);
  }

  // Soumettre une révision
  async submitReview(
    cardId: number,
    userId: number,
    reviewResult: ReviewResult
  ): Promise<Review> {
    // Récupérer la dernière révision de cette carte
    const lastReview = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.cardId, cardId), eq(reviews.userId, userId)))
      .orderBy(desc(reviews.reviewedAt))
      .limit(1);

    let repetition = 0;
    let easinessFactor = 2.5;
    let interval = 1;

    if (lastReview.length > 0) {
      repetition = lastReview[0].repetition ?? 0;
      easinessFactor = lastReview[0].easinessFactor ?? 2.5;
      interval = lastReview[0].interval ?? 1;
    }

    const nextReview = this.calculateNextReview(
      reviewResult.quality,
      repetition,
      easinessFactor,
      interval
    );

    const newReview: NewReview = {
      cardId,
      userId,
      quality: reviewResult.quality,
      easinessFactor: nextReview.newEasinessFactor,
      interval: nextReview.newInterval,
      repetition: nextReview.newRepetition,
      nextReviewDate: nextReview.nextReviewDate,
    };

    const [createdReview] = await db
      .insert(reviews)
      .values(newReview)
      .returning();
    return createdReview;
  }

  // Obtenir les paramètres de l'utilisateur
  async getUserSettings(userId: number): Promise<SpacedRepetitionSettings> {
    const settings = await db
      .select()
      .from(spacedRepetitionSettings)
      .where(eq(spacedRepetitionSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      // Créer des paramètres par défaut
      const [newSettings] = await db
        .insert(spacedRepetitionSettings)
        .values({ userId })
        .returning();
      return newSettings;
    }

    return settings[0];
  }

  // Obtenir les statistiques quotidiennes
  async getDailyStats(userId: number, date: Date): Promise<DailyStats> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await db
      .select({
        reviewedCards: sql<number>`count(*)`,
        correctAnswers: sql<number>`count(case when ${reviews.quality} >= 3 then 1 end)`,
        averageQuality: sql<number>`avg(${reviews.quality})`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          sql`${reviews.reviewedAt} >= ${startOfDay}`,
          sql`${reviews.reviewedAt} <= ${endOfDay}`
        )
      );

    const newCardsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(
        and(
          eq(cards.userId, userId),
          sql`${cards.createdAt} >= ${startOfDay}`,
          sql`${cards.createdAt} <= ${endOfDay}`
        )
      );

    return {
      date,
      newCards: newCardsCount[0]?.count || 0,
      reviewedCards: stats[0]?.reviewedCards || 0,
      correctAnswers: stats[0]?.correctAnswers || 0,
      averageQuality: stats[0]?.averageQuality || 0,
      timeSpent: 0, // À implémenter si nécessaire
    };
  }
}
