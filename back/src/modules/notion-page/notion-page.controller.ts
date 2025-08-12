import { Context } from "hono";
import { notionPageService } from "./notion-page.service";

export class NotionPageController {
  async fetchAllNotes(c: Context) {
    try {
      console.log("🔍 Fetching all notes");
      const body = await c.req.json();
      const { integrationId, databaseIds } = body;

      if (!integrationId) {
        return c.json({ error: "integrationId is required" }, 400);
      }

      if (!databaseIds) {
        return c.json({ error: "databaseIds is required" }, 400);
      }

      // Vérifier que databaseIds est un array
      if (!Array.isArray(databaseIds) || databaseIds.length === 0) {
        return c.json({ error: "databaseIds must be a non-empty array" }, 400);
      }

      console.log("🔍 Fetching notes for:", { integrationId, databaseIds });

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

      console.log("🔍 Getting saved notes for:", {
        integrationId,
        databaseIds,
      });

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
}
