import { Context } from "hono";
import { NotionAuthService } from "./notion-auth.service";
import { auth } from "../../../auth";
import { userService } from "../users/user.service";

export class NotionAuthController {
  constructor(private notionAuthService: NotionAuthService) {}

  async getAuthUrl(c: Context) {
    try {
      const authUrl = await this.notionAuthService.getAuthorizationUrl();
      return c.json({ authUrl });
    } catch (error) {
      console.error("Error getting Notion auth URL:", error);
      return c.json({ error: "Failed to get Notion auth URL" }, 500);
    }
  }

  async handleCallback(c: Context) {
    try {
      const code = c.req.query("code");
      const state = c.req.query("state");

      if (!code) {
        return c.json({ error: "No code provided" }, 400);
      }
      const frontendUrl = `http://localhost:3000/callback?code=${code}&state=${state || ""}`;
      return c.redirect(frontendUrl);
    } catch (error) {
      console.error("Error handling Notion callback:", error);
      return c.json({ error: "Failed to handle Notion callback" }, 500);
    }
  }

  async exchangeCode(c: Context) {
    try {
      const code = c.req.query("code");
      const state = c.req.query("state");

      if (!code) {
        return c.json({ error: "No code provided" }, 400);
      }

      console.log("🔍 Exchanging code for token:", code);
      const tokenData = await this.notionAuthService.exchangeCodeForToken(code);
      const adaptedResponse = {
        ...tokenData,
        accessToken: tokenData.access_token,
        metadata: {
          workspaceId: tokenData.workspace_id,
          workspaceName: tokenData.workspace_name,
          workspaceIcon: tokenData.workspace_icon,
          botId: tokenData.bot_id,
          owner: tokenData.owner,
          request_id: Date.now().toString(),
        },
      };
      return c.json(adaptedResponse);
    } catch (error) {
      console.error("❌ Error exchanging code for token:", error);
      return c.json({ error: "Failed to exchange code for token" }, 500);
    }
  }

  async getWorkspaceInfo(c: Context) {
    try {
      const { integrationService } = await import(
        "../integrations/integration.service"
      );

      // Récupérer l'email de l'utilisateur depuis le header Authorization
      const authHeader = c.req.header("Authorization");
      const userEmail = c.req.query("email");

      // Si on n'a ni header d'autorisation ni email en paramètre
      if (!authHeader && !userEmail) {
        // Essayer de récupérer l'utilisateur à partir des cookies
        try {
          const response = await auth.api.getUser({ req: c.req.raw });
          if (response && response.user && response.user.email) {
            const user = await userService.getUserByEmail(response.user.email);
            if (!user) {
              return c.json({ error: "User not found" }, 404);
            }

            // Récupérer l'intégration Notion de l'utilisateur
            const notionIntegration =
              await integrationService.getNotionIntegration(user.id);
            if (!notionIntegration) {
              return c.json({ error: "User has no Notion integration" }, 400);
            }

            const workspaceInfo = await this.notionAuthService.getWorkspaceInfo(
              notionIntegration.accessToken
            );

            // Enrichir avec les métadonnées de l'intégration si disponibles
            if (notionIntegration.metadata) {
              workspaceInfo.workspace = {
                id:
                  notionIntegration.metadata.workspaceId ||
                  workspaceInfo.workspace.id,
                name:
                  notionIntegration.metadata.workspaceName ||
                  workspaceInfo.workspace.name,
                icon:
                  notionIntegration.metadata.workspaceIcon ||
                  workspaceInfo.workspace.icon,
              };
            }

            return c.json(workspaceInfo);
          }
        } catch (error) {
          console.error("❌ Error getting user from cookies:", error);
        }

        return c.json({ error: "No authentication information provided" }, 401);
      }

      if (userEmail) {
        // Trouver l'utilisateur dans la base de données par email
        const user = await userService.getUserByEmail(userEmail);
        if (!user) {
          return c.json({ error: "User not found" }, 404);
        }

        // Récupérer l'intégration Notion de l'utilisateur
        const notionIntegration = await integrationService.getNotionIntegration(
          user.id
        );
        if (!notionIntegration) {
          return c.json({ error: "User has no Notion integration" }, 400);
        }

        // Récupérer les informations de l'espace de travail à partir du token
        const workspaceInfo = await this.notionAuthService.getWorkspaceInfo(
          notionIntegration.accessToken
        );

        // Enrichir avec les métadonnées de l'intégration si disponibles
        if (notionIntegration.metadata) {
          workspaceInfo.workspace = {
            id:
              notionIntegration.metadata.workspaceId ||
              workspaceInfo.workspace.id,
            name:
              notionIntegration.metadata.workspaceName ||
              workspaceInfo.workspace.name,
            icon:
              notionIntegration.metadata.workspaceIcon ||
              workspaceInfo.workspace.icon,
          };
        }

        return c.json(workspaceInfo);
      } else if (authHeader) {
        // Récupérer l'utilisateur à partir du token d'authentification
        const token = authHeader.replace("Bearer ", "");
        const user = await userService.getUserByToken(token);
        if (!user) {
          return c.json({ error: "User not found" }, 404);
        }

        // Récupérer l'intégration Notion de l'utilisateur
        const notionIntegration = await integrationService.getNotionIntegration(
          user.id
        );
        if (!notionIntegration) {
          return c.json({ error: "User has no Notion integration" }, 400);
        }

        // Récupérer les informations de l'espace de travail à partir du token
        const workspaceInfo = await this.notionAuthService.getWorkspaceInfo(
          notionIntegration.accessToken
        );

        // Enrichir avec les métadonnées de l'intégration si disponibles
        if (notionIntegration.metadata) {
          workspaceInfo.workspace = {
            id:
              notionIntegration.metadata.workspaceId ||
              workspaceInfo.workspace.id,
            name:
              notionIntegration.metadata.workspaceName ||
              workspaceInfo.workspace.name,
            icon:
              notionIntegration.metadata.workspaceIcon ||
              workspaceInfo.workspace.icon,
          };
        }

        return c.json(workspaceInfo);
      }

      return c.json({ error: "No valid authentication method" }, 401);
    } catch (error) {
      console.error("❌ Error getting workspace info:", error);
      return c.json({ error: "Failed to get workspace info" }, 500);
    }
  }

  async getDatabases(c: Context) {
    try {
      console.log("🚀 Getting Notion databases");

      // Import the integration service
      const { integrationService } = await import(
        "../integrations/integration.service"
      );

      // Récupérer l'email de l'utilisateur depuis le header Authorization
      const authHeader = c.req.header("Authorization");
      const userEmail = c.req.query("email");

      // Si on n'a ni header d'autorisation ni email en paramètre
      if (!authHeader && !userEmail) {
        // Essayer de récupérer l'utilisateur à partir des cookies
        try {
          const response = await auth.api.getUser({ req: c.req.raw });
          if (response && response.user && response.user.email) {
            const user = await userService.getUserByEmail(response.user.email);
            if (!user) {
              return c.json({ error: "User not found" }, 404);
            }

            // Récupérer l'intégration Notion de l'utilisateur
            const notionIntegration =
              await integrationService.getNotionIntegration(user.id);
            if (!notionIntegration) {
              return c.json({ error: "User has no Notion integration" }, 400);
            }

            const databases = await this.notionAuthService.getDatabases(
              notionIntegration.accessToken
            );
            console.log("🚀 Databases:", databases);
            return c.json({
              success: true,
              databases,
              count: databases.length,
            });
          }
        } catch (error) {
          console.error("❌ Error getting user from cookies:", error);
        }

        return c.json({ error: "No authentication information provided" }, 401);
      }

      if (userEmail) {
        // Trouver l'utilisateur dans la base de données par email
        const user = await userService.getUserByEmail(userEmail);
        if (!user) {
          return c.json({ error: "User not found" }, 404);
        }

        // Récupérer l'intégration Notion de l'utilisateur
        const notionIntegration = await integrationService.getNotionIntegration(
          user.id
        );
        if (!notionIntegration) {
          return c.json({ error: "User has no Notion integration" }, 400);
        }

        // Récupérer les bases de données à partir du token
        const databases = await this.notionAuthService.getDatabases(
          notionIntegration.accessToken
        );

        return c.json({
          success: true,
          databases,
          count: databases.length,
        });
      } else if (authHeader) {
        // Récupérer l'utilisateur à partir du token d'authentification
        const token = authHeader.replace("Bearer ", "");
        const user = await userService.getUserByToken(token);
        if (!user) {
          return c.json({ error: "User not found" }, 404);
        }

        // Récupérer l'intégration Notion de l'utilisateur
        const notionIntegration = await integrationService.getNotionIntegration(
          user.id
        );
        if (!notionIntegration) {
          return c.json({ error: "User has no Notion integration" }, 400);
        }

        // Récupérer les bases de données à partir du token
        const databases = await this.notionAuthService.getDatabases(
          notionIntegration.accessToken
        );

        return c.json({
          success: true,
          databases,
          count: databases.length,
        });
      }

      return c.json({ error: "No valid authentication method" }, 401);
    } catch (error) {
      console.error("❌ Error getting databases:", error);
      return c.json({ error: "Failed to get Notion databases" }, 500);
    }
  }
}

export const notionAuthController = new NotionAuthController(
  new NotionAuthService()
);
