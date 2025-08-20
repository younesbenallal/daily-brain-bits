import { Client } from "@notionhq/client";
import { db } from "../database/connection";
import { eq, and, inArray } from "drizzle-orm";
import { integrations } from "../../db/schemas/integrations.schema";
import { notionDatabases } from "../../db/schemas/notion-databases.schema";
import { notionPages } from "../../db/schemas/notion-page.schema";
import { emailService } from "../email/email.service";
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

interface NotionPageSyncData {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  databaseId: string;
  integrationId: string;
}

export class NotionPageService {
  // Initialiser le client Notion avec le token de l'utilisateur
  private async initializeNotionClient(userId: string): Promise<Client> {
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

    return new Client({ auth: integration[0].accessToken });
  }

  async fetchAllNotes(
    integrationId: string,
    databaseIds: string[]
  ): Promise<NotionPageData[]> {
    console.log("🔍 fetchAllNotes", integrationId, databaseIds);

    try {
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

  // Envoyer une page aléatoire par email
  async sendRandomPageByEmail(
    integrationId: string,
    userEmail: string,
    databaseIds?: string[]
  ): Promise<{ page: NotionPage; emailSent: boolean }> {
    try {
      console.log("📧 Preparing to send random page by email...");

      // 1. Récupérer l'intégration pour obtenir l'userId
      const integration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      const userId = integration[0].userId;

      // 2. Récupérer toutes les pages disponibles
      const availablePages = await this.getSavedPages(
        integrationId,
        databaseIds
      );

      if (availablePages.length === 0) {
        throw new Error("No pages found for the specified criteria");
      }

      // 3. Sélectionner une page aléatoire
      const randomIndex = Math.floor(Math.random() * availablePages.length);
      const selectedPage = availablePages[randomIndex];

      console.log(
        `🎲 Selected random page: "${selectedPage.pageTitle}" (${randomIndex + 1}/${availablePages.length})`
      );

      // 4. Préparer le contenu de l'email
      const emailSubject = `📖 Daily Brain Bit: ${selectedPage.pageTitle}`;
      const emailContent = await this.formatPageForEmail(selectedPage, userId);

      // 4. Envoyer l'email avec Resend
      const emailResult = await emailService.sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailContent,
      });

      console.log(
        `✅ Email ${emailResult.success ? "sent" : "failed"} to ${userEmail}`
      );
      if (!emailResult.success) {
        console.error(`❌ Email error: ${emailResult.error}`);
      }

      return {
        page: selectedPage,
        emailSent: emailResult.success,
      };
    } catch (error) {
      console.error("❌ Error sending random page by email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  // Formater la page pour l'email
  private async formatPageForEmail(
    page: NotionPage,
    userId: string
  ): Promise<string> {
    const pageContent = await this.fetchPageContent(page.pageId, userId);
    const content = `
        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">${page.pageTitle || "Untitled Page"}</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${pageContent}
            </p>
        </div>
        <div style="margin: 24px 0; padding: 20px; background: #f0f9ff; border-radius: 12px; border: 1px solid #e0f2fe;">
            <p style="margin: 0 0 12px 0; color: #0369a1; font-weight: 600; font-size: 14px;">📅 ACCÈS RAPIDE</p>
            <div style="display: flex; align-items: center; gap: 12px;">
                <a href="${page.pageUrl || "#"}" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    📖 Ouvrir dans Notion
                </a>
            </div>
        </div>
        <div style="color: #64748b; font-size: 14px; text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">📅 ${new Date(
            page.createdAt
          ).toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
        </div>
    `;

    return this.createMinimalEmailTemplate(content);
  }

  // Récupérer le contenu réel de la page via l'API Notion
  private async fetchPageContent(
    pageId: string,
    userId: string
  ): Promise<string> {
    try {
      console.log(`📄 Fetching content for page: ${pageId}`);

      const notion = await this.initializeNotionClient(userId);

      // Récupérer les blocs de contenu de la page
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 10, // Limiter aux 10 premiers blocs pour les premières lignes
      });

      console.log(`✅ Found ${response.results.length} blocks`);

      // Extraire le texte des blocs
      let content = "";
      let lineCount = 0;
      const maxLines = 5; // Limiter à 4-5 lignes comme demandé

      for (const block of response.results) {
        if (lineCount >= maxLines) break;

        const blockText = this.extractTextFromBlock(block as any);
        if (blockText.trim()) {
          content += blockText.trim() + " ";
          lineCount++;
        }
      }

      // Si pas de contenu trouvé, retourner un message par défaut
      if (!content.trim()) {
        return "Cette page ne contient pas encore de contenu textuel. Cliquez sur le lien pour l'ouvrir dans Notion et découvrir son contenu.";
      }

      // Limiter la longueur totale pour l'email
      const maxLength = 400;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength).trim() + "...";
      }

      console.log(
        `📝 Extracted content (${content.length} chars): ${content.substring(0, 100)}...`
      );
      return content.trim();
    } catch (error) {
      console.error("❌ Error fetching page content:", error);
      // En cas d'erreur, retourner un contenu par défaut
      return "Contenu de cette page Notion. Cliquez sur le lien ci-dessous pour accéder à la page complète et découvrir tous les détails.";
    }
  }

  // Extraire le texte d'un bloc Notion
  private extractTextFromBlock(block: any): string {
    try {
      const blockType = block.type;

      switch (blockType) {
        case "paragraph":
          return this.extractRichText(block.paragraph?.rich_text || []);

        case "heading_1":
        case "heading_2":
        case "heading_3":
          const headingKey = blockType as
            | "heading_1"
            | "heading_2"
            | "heading_3";
          return this.extractRichText(block[headingKey]?.rich_text || []);

        case "bulleted_list_item":
        case "numbered_list_item":
          const listKey = blockType as
            | "bulleted_list_item"
            | "numbered_list_item";
          return "• " + this.extractRichText(block[listKey]?.rich_text || []);

        case "quote":
          return '"' + this.extractRichText(block.quote?.rich_text || []) + '"';

        case "callout":
          return this.extractRichText(block.callout?.rich_text || []);

        case "toggle":
          return this.extractRichText(block.toggle?.rich_text || []);

        default:
          // Pour les autres types de blocs, essayer d'extraire le texte s'il existe
          if (block[blockType]?.rich_text) {
            return this.extractRichText(block[blockType].rich_text);
          }
          return "";
      }
    } catch (error) {
      console.error("❌ Error extracting text from block:", error);
      return "";
    }
  }

  // Extraire le texte d'un tableau rich_text de Notion
  private extractRichText(richTextArray: any[]): string {
    if (!Array.isArray(richTextArray)) {
      return "";
    }

    return richTextArray
      .map((richText) => richText.plain_text || "")
      .join("")
      .trim();
  }

  // Template minimal pour l'email
  private createMinimalEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Brain Bit</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            margin: 0; 
            padding: 20px;
            background: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid #a3a3a3;
        }
        .header {
            background: linear-gradient(135deg, #f16891 0%, #BC76D9 100%);
            padding: 32px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
        }
        .content {
            padding: 32px;
            background: white;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            color: #64748b;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .container { border-radius: 12px; }
            .header { padding: 24px; }
            .content { padding: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📖 Daily Brain Bit</h1>
            <p>Votre dose quotidienne de connaissances</p>
        </div>
        <div class="content">
            ${content}
        </div>
    </div>
    
    <div class="footer">
        <p style="margin: 0;">🧠 Daily Brain Bits - Your daily dose of knowledge</p>
        <p style="margin: 5px 0 0 0;">Keep learning, one page at a time! 🚀</p>
    </div>
</body>
</html>
    `.trim();
  }

  // Synchroniser les pages Notion pour une intégration donnée
  async syncNotionPages(integrationId: string): Promise<{
    added: number;
    updated: number;
    removed: number;
    total: number;
  }> {
    try {
      console.log(
        `🔄 Starting Notion pages sync for integration: ${integrationId}`
      );

      // 1. Récupérer l'intégration et l'userId
      const integration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);

      if (!integration.length) {
        throw new Error("Integration not found");
      }

      const userId = integration[0].userId;
      const accessToken = integration[0].accessToken;

      if (!accessToken) {
        throw new Error("No access token found for integration");
      }

      // 2. Initialiser le client Notion
      const notion = new Client({ auth: accessToken });

      // 3. Récupérer toutes les databases Notion de cette intégration
      const savedDatabases = await db
        .select()
        .from(notionDatabases)
        .where(eq(notionDatabases.integrationId, integrationId));

      console.log(`📚 Found ${savedDatabases.length} databases to sync`);

      let totalAdded = 0;
      let totalUpdated = 0;
      let totalRemoved = 0;
      let totalPages = 0;

      // 4. Pour chaque database, synchroniser les pages
      for (const database of savedDatabases) {
        const syncResult = await this.syncDatabasePages(
          notion,
          integrationId,
          database.databaseId,
          database.databaseTitle
        );

        totalAdded += syncResult.added;
        totalUpdated += syncResult.updated;
        totalRemoved += syncResult.removed;
        totalPages += syncResult.total;
      }

      // 5. Supprimer les pages qui n'existent plus dans aucune database
      const removedOrphans = await this.removeOrphanPages(
        notion,
        integrationId
      );
      totalRemoved += removedOrphans;

      console.log(`✅ Sync completed for integration ${integrationId}:`);
      console.log(`   - Added: ${totalAdded}`);
      console.log(`   - Updated: ${totalUpdated}`);
      console.log(`   - Removed: ${totalRemoved}`);
      console.log(`   - Total pages: ${totalPages}`);

      return {
        added: totalAdded,
        updated: totalUpdated,
        removed: totalRemoved,
        total: totalPages,
      };
    } catch (error) {
      console.error(
        `❌ Error syncing Notion pages for integration ${integrationId}:`,
        error
      );
      throw error;
    }
  }

  // Synchroniser les pages d'une database spécifique
  private async syncDatabasePages(
    notion: Client,
    integrationId: string,
    databaseId: string,
    databaseTitle: string
  ): Promise<{
    added: number;
    updated: number;
    removed: number;
    total: number;
  }> {
    try {
      console.log(`📄 Syncing pages for database: ${databaseTitle}`);

      // 1. Récupérer toutes les pages de la database depuis Notion
      const notionPagesData: NotionPageSyncData[] = [];
      let hasMore = true;
      let nextCursor: string | undefined = undefined;

      while (hasMore) {
        const queryOptions: any = {
          database_id: databaseId,
          page_size: 100,
        };

        if (nextCursor) {
          queryOptions.start_cursor = nextCursor;
        }

        const response = await notion.databases.query(queryOptions);

        for (const page of response.results) {
          if (page.object === "page") {
            const pageResponse = page as any;
            const pageData: NotionPageSyncData = {
              pageId: page.id,
              pageTitle: this.extractPageTitle(pageResponse),
              pageUrl: pageResponse.url || "",
              databaseId: databaseId,
              integrationId: integrationId,
            };
            notionPagesData.push(pageData);
          }
        }

        hasMore = response.has_more;
        nextCursor = response.next_cursor ? response.next_cursor : undefined;
      }

      console.log(`   📊 Found ${notionPagesData.length} pages in Notion`);

      // 2. Récupérer les pages existantes dans notre DB pour cette database
      const existingPages = await db
        .select()
        .from(notionPages)
        .where(
          and(
            eq(notionPages.integrationId, integrationId),
            eq(notionPages.databaseId, databaseId)
          )
        );

      console.log(`   💾 Found ${existingPages.length} pages in local DB`);

      // 3. Créer des maps pour comparaison
      const notionPagesMap = new Map(notionPagesData.map((p) => [p.pageId, p]));
      const existingPagesMap = new Map(existingPages.map((p) => [p.pageId, p]));

      let added = 0;
      let updated = 0;
      let removed = 0;

      // 4. Ajouter/Mettre à jour les pages de Notion
      for (const notionPage of notionPagesData) {
        const existingPage = existingPagesMap.get(notionPage.pageId);

        // Utiliser upsert pour gérer les conflits de pages existantes
        await db
          .insert(notionPages)
          .values({
            integrationId: notionPage.integrationId,
            databaseId: notionPage.databaseId,
            pageId: notionPage.pageId,
            pageTitle: notionPage.pageTitle,
            pageUrl: notionPage.pageUrl,
          })
          .onConflictDoUpdate({
            target: notionPages.pageId,
            set: {
              pageTitle: notionPage.pageTitle,
              pageUrl: notionPage.pageUrl,
            },
          });

        if (!existingPage) {
          added++;
          console.log(`   ➕ Added page: ${notionPage.pageTitle}`);
        } else if (
          existingPage.pageTitle !== notionPage.pageTitle ||
          existingPage.pageUrl !== notionPage.pageUrl
        ) {
          updated++;
          console.log(`   🔄 Updated page: ${notionPage.pageTitle}`);
        }
      }

      // 5. Supprimer les pages qui n'existent plus dans Notion
      for (const existingPage of existingPages) {
        if (!notionPagesMap.has(existingPage.pageId)) {
          await db
            .delete(notionPages)
            .where(eq(notionPages.pageId, existingPage.pageId));
          removed++;
          console.log(`   🗑️ Removed page: ${existingPage.pageTitle}`);
        }
      }

      return {
        added,
        updated,
        removed,
        total: notionPagesData.length,
      };
    } catch (error) {
      console.error(`❌ Error syncing database ${databaseTitle}:`, error);
      throw error;
    }
  }

  // Supprimer les pages orphelines (qui n'appartiennent plus à aucune database active)
  private async removeOrphanPages(
    notion: Client,
    integrationId: string
  ): Promise<number> {
    try {
      // Récupérer toutes les pages de cette intégration
      const allPages = await db
        .select()
        .from(notionPages)
        .where(eq(notionPages.integrationId, integrationId));

      // Récupérer toutes les databases actives de cette intégration
      const activeDatabases = await db
        .select({ databaseId: notionDatabases.databaseId })
        .from(notionDatabases)
        .where(eq(notionDatabases.integrationId, integrationId));

      const activeDatabaseIds = new Set(
        activeDatabases.map((d) => d.databaseId)
      );

      let removedOrphans = 0;

      // Supprimer les pages qui appartiennent à des databases qui ne sont plus actives
      for (const page of allPages) {
        if (!activeDatabaseIds.has(page.databaseId)) {
          await db
            .delete(notionPages)
            .where(eq(notionPages.pageId, page.pageId));
          removedOrphans++;
          console.log(`   🧹 Removed orphan page: ${page.pageTitle}`);
        }
      }

      if (removedOrphans > 0) {
        console.log(`🧹 Removed ${removedOrphans} orphan pages`);
      }

      return removedOrphans;
    } catch (error) {
      console.error(`❌ Error removing orphan pages:`, error);
      return 0;
    }
  }

  // Extraire le titre d'une page Notion
  private extractPageTitle(page: any): string {
    try {
      // Essayer d'extraire le titre depuis les propriétés
      if (page.properties) {
        // Chercher une propriété de type "title"
        for (const [key, property] of Object.entries(page.properties)) {
          if (
            (property as any).type === "title" &&
            (property as any).title?.length > 0
          ) {
            return (property as any).title
              .map((t: any) => t.plain_text || "")
              .join("")
              .trim();
          }
        }
      }

      // Fallback : utiliser l'ID si pas de titre trouvé
      return `Untitled (${page.id.slice(-8)})`;
    } catch (error) {
      return `Untitled (${page.id.slice(-8)})`;
    }
  }
}

export const notionPageService = new NotionPageService();
