import { Client } from "@notionhq/client";
import { db } from "../database/connection";
import { eq, and, inArray } from "drizzle-orm";
import { integrations } from "../../db/schemas/integrations.schema";
import { notionDatabases } from "../../db/schemas/notion-databases.schema";
import { notionPages } from "../../db/schemas/notion-page.schema";
import type {
  NotionPage,
  NewNotionPage,
} from "../../db/schemas/notion-page.schema";

export interface NotionPageData {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
}

export class NotionPageService {
  async fetchAllNotes(
    integrationId: string,
    databaseIds: string[]
  ): Promise<NotionPageData[]> {
    console.log("🔍 fetchAllNotes", integrationId, databaseIds);

    try {
      // 1. Récupérer l'intégration pour obtenir le token Notion
      const integration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      const notionToken = integration[0].accessToken;
      if (!notionToken) {
        throw new Error("Notion token not found");
      }

      console.log("✅ Found integration with token");

      // 2. Récupérer les pages de chaque base de données
      const allPages: NotionPageData[] = [];
      const notion = new Client({ auth: notionToken });

      for (const databaseId of databaseIds) {
        console.log(`📖 Fetching pages from database: ${databaseId}`);

        try {
          const response = await notion.databases.query({
            database_id: databaseId,
          });

          console.log(
            `✅ Found ${response.results.length} pages in database ${databaseId}`
          );

          // 3. Transformer les pages en format simplifié
          const pages = response.results.map((page) => {
            const pageData = page as any;

            // Extraire le titre de la page
            let title = "Untitled";
            if (pageData.properties) {
              // Chercher une propriété de type title
              const titleProperty = Object.values(pageData.properties).find(
                (prop: any) => prop.type === "title"
              ) as any;

              if (
                titleProperty &&
                titleProperty.title &&
                titleProperty.title.length > 0
              ) {
                title = titleProperty.title
                  .map((t: any) => t.plain_text)
                  .join("");
              }
            }

            return {
              id: pageData.id,
              title: title,
              url: pageData.url,
              created_time: pageData.created_time,
              last_edited_time: pageData.last_edited_time,
              properties: pageData.properties || {},
            };
          });

          // 4. Sauvegarder les pages en base de données
          for (const pageData of pages) {
            const newPage: NewNotionPage = {
              integrationId: integrationId,
              databaseId: databaseId,
              pageId: pageData.id,
              pageTitle: pageData.title,
              pageUrl: pageData.url,
              updatedAt: new Date(),
            };

            // Utiliser upsert pour éviter les doublons
            await db
              .insert(notionPages)
              .values(newPage)
              .onConflictDoUpdate({
                target: notionPages.pageId,
                set: {
                  pageTitle: newPage.pageTitle,
                  pageUrl: newPage.pageUrl,
                  updatedAt: newPage.updatedAt,
                },
              });
          }

          allPages.push(...pages);
        } catch (error) {
          console.error(
            `❌ Error fetching pages from database ${databaseId}:`,
            error
          );
          // Continue avec les autres bases de données même si une échoue
        }
      }

      console.log(`✅ Total pages fetched: ${allPages.length}`);
      return allPages;
    } catch (error) {
      console.error("❌ Error in fetchAllNotes:", error);
      throw new Error(`Failed to fetch notes: ${error}`);
    }
  }

  // Méthode pour récupérer les pages sauvegardées depuis la base de données
  async getSavedPages(
    integrationId: string,
    databaseIds?: string[]
  ): Promise<NotionPage[]> {
    try {
      let whereCondition = eq(notionPages.integrationId, integrationId);

      if (databaseIds && databaseIds.length > 0) {
        whereCondition = and(
          eq(notionPages.integrationId, integrationId),
          inArray(notionPages.databaseId, databaseIds)
        )!;
      }

      const savedPages = await db
        .select()
        .from(notionPages)
        .where(whereCondition);

      console.log(`✅ Found ${savedPages.length} saved pages`);

      return savedPages;
    } catch (error) {
      console.error("❌ Error getting saved pages:", error);
      throw new Error(`Failed to get saved pages: ${error}`);
    }
  }
}

export const notionPageService = new NotionPageService();
