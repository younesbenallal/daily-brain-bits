import { db } from "../database/connection";
import { eq, and } from "drizzle-orm";
import { integrations } from "../../db/schemas/integrations.schema";
import { notionDatabases } from "../../db/schemas/notion-databases.schema";
import type {
  NotionDatabase,
  NewNotionDatabase,
} from "../../db/schemas/notion-databases.schema";

export class NotionDatabaseService {
  // Sauvegarder les bases de données Notion sélectionnées
  async saveNotionDatabases(
    userId: string,
    databaseIds: { id: string; label: string }[]
  ): Promise<NotionDatabase[]> {
    try {
      // 1. Récupérer l'intégration Notion de l'utilisateur
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, "notion"),
            eq(integrations.isActive, true)
          )
        )
        .limit(1);

      if (!integration) {
        throw new Error("No active Notion integration found for user");
      }

      // 2. Récupérer les bases de données existantes
      const existingDatabases = await db
        .select()
        .from(notionDatabases)
        .where(eq(notionDatabases.integrationId, integration.id));

      // 3. Identifier les bases de données à ajouter, mettre à jour ou supprimer
      const existingIds = new Set(existingDatabases.map((db) => db.databaseId));
      const newIds = new Set(databaseIds.map((db) => db.id));

      // Bases de données à supprimer (celles qui n'existent plus dans la nouvelle sélection)
      const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));
      if (idsToDelete.length > 0) {
        await db.delete(notionDatabases).where(
          and(
            eq(notionDatabases.integrationId, integration.id),
            eq(notionDatabases.databaseId, idsToDelete[0]) // Pour le premier ID
          )
        );

        // Supprimer les autres IDs un par un
        for (let i = 1; i < idsToDelete.length; i++) {
          await db
            .delete(notionDatabases)
            .where(
              and(
                eq(notionDatabases.integrationId, integration.id),
                eq(notionDatabases.databaseId, idsToDelete[i])
              )
            );
        }
      }

      // Bases de données à ajouter (nouvelles sélections)
      const databasesToAdd = databaseIds.filter(
        (db) => !existingIds.has(db.id)
      );
      if (databasesToAdd.length > 0) {
        const newDatabases: NewNotionDatabase[] = databasesToAdd.map((db) => ({
          integrationId: integration.id,
          databaseId: db.id,
          databaseTitle: db.label,
        }));

        await db.insert(notionDatabases).values(newDatabases);
      }

      // Bases de données à mettre à jour (titres potentiellement modifiés)
      const databasesToUpdate = databaseIds.filter((db) =>
        existingIds.has(db.id)
      );
      for (const dbToUpdate of databasesToUpdate) {
        await db
          .update(notionDatabases)
          .set({ databaseTitle: dbToUpdate.label })
          .where(
            and(
              eq(notionDatabases.integrationId, integration.id),
              eq(notionDatabases.databaseId, dbToUpdate.id)
            )
          );
      }

      // 4. Récupérer toutes les bases de données mises à jour
      const updatedDatabases = await db
        .select()
        .from(notionDatabases)
        .where(eq(notionDatabases.integrationId, integration.id));

      console.log(`✅ Updated Notion databases for user ${userId}:
        - Deleted: ${idsToDelete.length}
        - Added: ${databasesToAdd.length}
        - Updated: ${databasesToUpdate.length}
        - Total: ${updatedDatabases.length}`);

      return updatedDatabases;
    } catch (error) {
      console.error("❌ Error saving Notion databases:", error);
      throw error;
    }
  }

  // Récupérer les bases de données Notion d'un utilisateur
  async getUserNotionDatabases(userId: string): Promise<NotionDatabase[]> {
    try {
      const databases = await db
        .select({
          id: notionDatabases.id,
          integrationId: notionDatabases.integrationId,
          databaseId: notionDatabases.databaseId,
          databaseTitle: notionDatabases.databaseTitle,
          createdAt: notionDatabases.createdAt,
          updatedAt: notionDatabases.updatedAt,
        })
        .from(notionDatabases)
        .innerJoin(
          integrations,
          eq(notionDatabases.integrationId, integrations.id)
        )
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, "notion"),
            eq(integrations.isActive, true)
          )
        );

      return databases;
    } catch (error) {
      console.error("❌ Error fetching user Notion databases:", error);
      throw error;
    }
  }

  async getNotionDatabasesByIntegrationId(
    integrationId: string
  ): Promise<NotionDatabase[]> {
    try {
      const databases = await db
        .select()
        .from(notionDatabases)
        .where(eq(notionDatabases.integrationId, integrationId));

      return databases;
    } catch (error) {
      console.error(
        "❌ Error fetching Notion databases by integration ID:",
        error
      );
      throw error;
    }
  }

  // Supprimer toutes les bases de données Notion d'un utilisateur
  async deleteUserNotionDatabases(userId: string): Promise<void> {
    try {
      // Récupérer l'intégration Notion de l'utilisateur
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, "notion"),
            eq(integrations.isActive, true)
          )
        )
        .limit(1);

      if (!integration) {
        return; // Pas d'intégration, rien à supprimer
      }

      await db
        .delete(notionDatabases)
        .where(eq(notionDatabases.integrationId, integration.id));

      console.log(`✅ Deleted all Notion databases for user ${userId}`);
    } catch (error) {
      console.error("❌ Error deleting user Notion databases:", error);
      throw error;
    }
  }
}

export const notionDatabaseService = new NotionDatabaseService();
