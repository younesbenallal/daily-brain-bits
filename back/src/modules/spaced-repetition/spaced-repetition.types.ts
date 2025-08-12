import { Card } from "./spaced-repetition.types";

export interface NotionCard {
  id: string;
  title: string;
  content: string;
  databaseId: string;
  properties?: Record<string, any>;
  createdTime: string;
  lastEditedTime: string;
}

export interface ReviewResult {
  quality: number; // 0-5
  timeSpent?: number; // en secondes
  notes?: string;
}

export interface ReviewSession {
  userId: number;
  cards: Card[];
  completedCards: number;
  totalCards: number;
  sessionStarted: Date;
}

export interface SpacedRepetitionAlgorithm {
  calculateNextReview(
    quality: number,
    repetition: number,
    easinessFactor: number,
    interval: number
  ): {
    newInterval: number;
    newRepetition: number;
    newEasinessFactor: number;
    nextReviewDate: Date;
  };
}

export interface DailyStats {
  date: Date;
  newCards: number;
  reviewedCards: number;
  correctAnswers: number;
  averageQuality: number;
  timeSpent: number;
}

// Import des types de schéma
export type {
  Card,
  NewCard,
  UpdateCard,
} from "../database/schemas/spaced-repetition.schema";
export type {
  Review,
  NewReview,
  UpdateReview,
} from "../database/schemas/spaced-repetition.schema";
export type {
  SpacedRepetitionSettings,
  NewSpacedRepetitionSettings,
  UpdateSpacedRepetitionSettings,
} from "../database/schemas/spaced-repetition.schema";
