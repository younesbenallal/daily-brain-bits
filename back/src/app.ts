import { Hono } from "hono";
import { cors } from "hono/cors";
import { testConnection } from "./modules/database/connection";
import { userController } from "./modules/users/user.controller";
import { spacedRepetitionController } from "./modules/spaced-repetition/spaced-repetition.controller";
import { notionAuthController } from "./modules/notion/notion-auth.controller";
import { authController } from "./modules/auth/auth.controller";
import { notionDatabaseController } from "./modules/notion-database/notion-database.controller";
import { integrationController } from "./modules/integrations/integration.controller";
import { NotionPageController } from "./modules/notion-page/notion-page.controller";
import { auth } from "../auth";

export function createApp() {
  const app = new Hono();
  const notionPageController = new NotionPageController();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.all("/api/auth/*", async (c) => {
    return auth.handler(c.req.raw);
  });

  app.get("/", (c) => {
    return c.json({
      message: "Daily Brain Bits API",
      version: "1.0.0",
      endpoints: {
        health: "GET /health",
        auth: {
          register: "POST /auth/register",
          login: "POST /auth/login",
          logout: "POST /auth/logout",
          betterAuth: "ALL /api/auth/*",
          notionCallback: "POST /auth/notion",
        },
        users: {
          list: "GET /users",
          get: "GET /users/:id",
          create: "POST /users",
          update: "PUT /users/:id",
          delete: "DELETE /users/:id",
        },
        notion: {
          authUrl: "GET /notion/auth-url",
          callback: "GET /callback",
          workspaceInfo: "GET /notion/workspace-info",
          debug: "GET /debug/notion-config",
        },
        spacedRepetition: {
          syncCards: "POST /users/:userId/spaced-repetition/sync",
          createCardsFromPages:
            "POST /users/:userId/spaced-repetition/cards/create",
          getTodayCards: "GET /users/:userId/spaced-repetition/today",
          submitReview:
            "POST /users/:userId/spaced-repetition/cards/:cardId/review",
          getSettings: "GET /users/:userId/spaced-repetition/settings",
          getStats: "GET /users/:userId/spaced-repetition/stats",
        },
        integrations: {
          getUserIntegrations: "GET /integrations/user/:userId",
          getUserActiveIntegrations: "GET /integrations/user/:userId/active",
          getUserIntegrationByType: "GET /integrations/user/:userId/type/:type",
          getUserIntegrationsByEmail: "GET /integrations/user/by-email",
          getUserActiveIntegrationsByEmail:
            "GET /integrations/user/by-email/active",
          getUserIntegrationByTypeAndEmail:
            "GET /integrations/user/by-email/type/:type",
        },
        notionDatabase: {
          save: "POST /notion-database/save",
          getByIntegrationId: "GET /notion-database/integration/:integrationId",
        },
        notionPage: {
          fetchAllNotes: "POST /notion-page/all-notes",
          getSavedNotes: "GET /notion-page/saved-notes",
        },
      },
    });
  });

  app.get("/health", async (c) => {
    const dbConnected = await testConnection();
    return c.json({
      status: dbConnected ? "healthy" : "unhealthy",
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/debug/notion-config", (c) => {
    return c.json({
      clientId: process.env.NOTION_CLIENT_ID
        ? `${process.env.NOTION_CLIENT_ID.substring(0, 8)}...`
        : "MANQUANT",
      clientSecret: process.env.NOTION_CLIENT_SECRET ? "PRESENT" : "MANQUANT",
      redirectUri: process.env.NOTION_REDIRECT_URI || "MANQUANT",
      environment: {
        NODE_ENV: process.env.NODE_ENV || "non défini",
        allEnvKeys: Object.keys(process.env).filter((key) =>
          key.startsWith("NOTION")
        ),
      },
    });
  });

  // Routes Users
  app.get("/users", userController.getUsers.bind(userController));
  app.get("/users/:id", userController.getUserById.bind(userController));
  app.post("/users", userController.createUser.bind(userController));
  app.put("/users/:id", userController.updateUser.bind(userController));
  app.delete("/users/:id", userController.deleteUser.bind(userController));

  // Routes Notion Auth
  app.get(
    "/notion/auth-url",
    notionAuthController.getAuthUrl.bind(notionAuthController)
  );
  app.get(
    "/callback",
    notionAuthController.handleCallback.bind(notionAuthController)
  );
  app.get(
    "/notion/workspace-info",
    notionAuthController.getWorkspaceInfo.bind(notionAuthController)
  );
  app.get(
    "/notion/databases",
    notionAuthController.getDatabases.bind(notionAuthController)
  );
  app.get(
    "/notion/exchange-code",
    notionAuthController.exchangeCode.bind(notionAuthController)
  );

  // Routes Spaced Repetition
  app.post(
    "/users/:userId/spaced-repetition/sync",
    spacedRepetitionController.syncCards.bind(spacedRepetitionController)
  );
  app.post(
    "/users/:userId/spaced-repetition/cards/create",
    spacedRepetitionController.createCardsFromPages.bind(
      spacedRepetitionController
    )
  );
  app.get(
    "/users/:userId/spaced-repetition/today",
    spacedRepetitionController.getTodayCards.bind(spacedRepetitionController)
  );
  app.post(
    "/users/:userId/spaced-repetition/cards/:cardId/review",
    spacedRepetitionController.submitReview.bind(spacedRepetitionController)
  );
  app.get(
    "/users/:userId/spaced-repetition/settings",
    spacedRepetitionController.getSettings.bind(spacedRepetitionController)
  );
  app.get(
    "/users/:userId/spaced-repetition/stats",
    spacedRepetitionController.getStats.bind(spacedRepetitionController)
  );

  // Routes Notion Database
  app.post(
    "/notion-database/save",
    notionDatabaseController.saveNotionDatabases.bind(notionDatabaseController)
  );
  app.get(
    "/notion-database/user",
    notionDatabaseController.getUserNotionDatabases.bind(
      notionDatabaseController
    )
  );
  app.delete(
    "/notion-database/user",
    notionDatabaseController.deleteUserNotionDatabases.bind(
      notionDatabaseController
    )
  );
  app.get(
    "/notion-database/integration/:integrationId",
    notionDatabaseController.getNotionDatabasesByIntegrationId.bind(
      notionDatabaseController
    )
  );

  // Routes Integrations
  app.get(
    "/integrations/user/by-email",
    integrationController.getUserIntegrationsByEmail.bind(integrationController)
  );
  app.get(
    "/integrations/user/by-email/active",
    integrationController.getUserActiveIntegrationsByEmail.bind(
      integrationController
    )
  );
  app.get(
    "/integrations/user/by-email/type/:type",
    integrationController.getUserIntegrationByTypeAndEmail.bind(
      integrationController
    )
  );

  // Routes Auth
  app.post("/auth/register", authController.register.bind(authController));
  app.post("/auth/login", authController.login.bind(authController));
  app.post("/auth/logout", authController.logout.bind(authController));
  app.post("/auth/notion", authController.notionCallback.bind(authController));

  // Routes Notion Page
  app.post(
    "/notion-page/all-notes",
    notionPageController.fetchAllNotes.bind(notionPageController)
  );
  app.get(
    "/notion-page/saved-notes",
    notionPageController.getSavedNotes.bind(notionPageController)
  );

  // Route pour renvoyer un email de vérification
  app.post("/api/auth/send-verification-email", async (c) => {
    try {
      const { email } = await c.req.json();

      if (!email) {
        return c.json({ error: "Email is required" }, 400);
      }

      // Utiliser Better Auth pour renvoyer l'email
      const result = await auth.api.sendVerificationEmail({
        body: { email },
      });

      return c.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Error sending verification email:", error);
      return c.json({ error: "Failed to send verification email" }, 500);
    }
  });

  return app;
}
