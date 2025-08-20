import { Context } from "hono";
import { notionPageService } from "./notion-page.service";

export class NotionPageController {
  async fetchAllNotes(c: Context) {
    try {
      const integrationId = c.req.query("integrationId");
      const databaseIdsParam = c.req.query("databaseIds");

      if (!integrationId) {
        return c.json({ error: "integrationId is required" }, 400);
      }

      if (!databaseIdsParam) {
        return c.json({ error: "databaseIds is required" }, 400);
      }

      // Parser les databaseIds (peut être une chaîne séparée par des virgules ou un array JSON)
      let databaseIds: string[];
      try {
        // Essayer de parser comme JSON d'abord
        databaseIds = JSON.parse(databaseIdsParam);
      } catch {
        // Si ce n'est pas du JSON, traiter comme une chaîne séparée par des virgules
        databaseIds = databaseIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
      }

      if (!Array.isArray(databaseIds) || databaseIds.length === 0) {
        return c.json({ error: "databaseIds must be a non-empty array" }, 400);
      }

      const notes = await notionPageService.fetchAllNotes(
        integrationId,
        databaseIds
      );

      return c.json({
        success: true,
        data: notes,
        count: notes.length,
      });
    } catch (error) {
      console.error("❌ Error in fetchAllNotes controller:", error);
      return c.json(
        {
          error: "Failed to fetch notes",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  async getSavedNotes(c: Context) {
    try {
      const integrationId = c.req.query("integrationId");
      const databaseIdsParam = c.req.query("databaseIds");

      if (!integrationId) {
        return c.json({ error: "integrationId is required" }, 400);
      }

      let databaseIds: string[] | undefined;
      if (databaseIdsParam) {
        try {
          databaseIds = JSON.parse(databaseIdsParam);
        } catch {
          databaseIds = databaseIdsParam
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id);
        }
      }

      const notes = await notionPageService.getSavedPages(
        integrationId,
        databaseIds
      );

      return c.json({
        success: true,
        data: notes,
        count: notes.length,
      });
    } catch (error) {
      console.error("❌ Error in getSavedNotes controller:", error);
      return c.json(
        {
          error: "Failed to get saved notes",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }

  async sendRandomPageByEmail(c: Context) {
    try {
      const integrationId = c.req.query("integrationId");
      const databaseIdsParam = c.req.query("databaseIds");
      const userEmail = c.req.query("userEmail");

      if (!integrationId) {
        return c.json({ error: "integrationId is required" }, 400);
      }

      if (!userEmail) {
        return c.json({ error: "userEmail is required" }, 400);
      }

      let databaseIds: string[] | undefined;
      if (databaseIdsParam) {
        try {
          databaseIds = JSON.parse(databaseIdsParam);
        } catch {
          databaseIds = databaseIdsParam
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id);
        }
      }

      const result = await notionPageService.sendRandomPageByEmail(
        integrationId,
        userEmail,
        databaseIds
      );

      return c.json({
        success: true,
        message: "Email sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in sendRandomPageByEmail controller:", error);
      return c.json(
        {
          error: "Failed to send email",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
}
