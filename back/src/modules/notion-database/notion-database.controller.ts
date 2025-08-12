import { Context } from "hono";
import { notionDatabaseService } from "./notion-database.service";
import { auth } from "../../../auth";
import { userService } from "../users/user.service";

export class NotionDatabaseController {
  async saveNotionDatabases(c: Context) {
    try {
      const body = await c.req.json();
      const { databaseId } = body;
      if (
        !databaseId ||
        !Array.isArray(databaseId) ||
        databaseId.length === 0
      ) {
        return c.json(
          { error: "databaseId array is required and cannot be empty" },
          400
        );
      }
      // Récupérer l'email de l'utilisateur depuis les paramètres de la requête
      const userEmail = c.req.query("email");
      if (!userEmail) {
        return c.json({ error: "User email is required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      // Sauvegarder les bases de données
      const savedDatabases = await notionDatabaseService.saveNotionDatabases(
        user.id,
        databaseId
      );

      return c.json({
        success: true,
        message: `Successfully saved ${savedDatabases.length} Notion databases`,
        databases: savedDatabases,
      });
    } catch (error) {
      console.error("❌ Error saving Notion databases:", error);
      return c.json(
        {
          error: "Failed to save Notion databases",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Récupérer les bases de données Notion d'un utilisateur
  async getUserNotionDatabases(c: Context) {
    try {
      const userEmail = c.req.query("email");
      if (!userEmail) {
        return c.json({ error: "User email is required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const databases = await notionDatabaseService.getUserNotionDatabases(
        user.id
      );

      return c.json({
        success: true,
        databases: databases,
      });
    } catch (error) {
      console.error("❌ Error fetching user Notion databases:", error);
      return c.json(
        {
          error: "Failed to fetch Notion databases",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Récupérer les bases de données Notion par integrationId
  async getNotionDatabasesByIntegrationId(c: Context) {
    try {
      const integrationId = c.req.param("integrationId");
      if (!integrationId) {
        return c.json({ error: "Integration ID is required" }, 400);
      }

      console.log(
        `📊 Fetching Notion databases for integration ${integrationId}`
      );

      const databases =
        await notionDatabaseService.getNotionDatabasesByIntegrationId(
          integrationId
        );

      return c.json({
        success: true,
        databases: databases,
      });
    } catch (error) {
      console.error(
        "❌ Error fetching Notion databases by integration ID:",
        error
      );
      return c.json(
        {
          error: "Failed to fetch Notion databases",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  // Supprimer toutes les bases de données Notion d'un utilisateur
  async deleteUserNotionDatabases(c: Context) {
    try {
      const userEmail = c.req.query("email");
      if (!userEmail) {
        return c.json({ error: "User email is required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      await notionDatabaseService.deleteUserNotionDatabases(user.id);

      return c.json({
        success: true,
        message: "Successfully deleted all Notion databases",
      });
    } catch (error) {
      console.error("❌ Error deleting user Notion databases:", error);
      return c.json(
        {
          error: "Failed to delete Notion databases",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
}

export const notionDatabaseController = new NotionDatabaseController();
