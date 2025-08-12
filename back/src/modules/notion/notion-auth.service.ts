import { Client } from "@notionhq/client";

export interface NotionUserInfo {
  id: string;
  name: string;
  avatar_url: string;
  person?: {
    email: string;
  };
  bot?: {
    workspace_name: string;
  };
}

export interface NotionTokenResponse {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: NotionUserInfo;
}

export interface NotionDatabase {
  id: string;
  title: string;
  description: string;
  icon?: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
}

export class NotionAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.NOTION_CLIENT_ID || "";
    this.clientSecret = process.env.NOTION_CLIENT_SECRET || "";
    this.redirectUri =
      process.env.NOTION_REDIRECT_URI || "http://localhost:3000/callback";

    console.log("=== CONFIGURATION NOTION ===");
    console.log(
      "Client ID:",
      this.clientId ? `${this.clientId.substring(0, 8)}...` : "MANQUANT"
    );
    console.log("Client Secret:", this.clientSecret ? "PRESENT" : "MANQUANT");
    console.log("Redirect URI:", this.redirectUri);
  }

  // Générer l'URL d'autorisation Notion
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      owner: "user",
      redirect_uri: this.redirectUri,
    });

    const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    console.log("URL d'autorisation générée:", url);
    return url;
  }

  // Échanger le code d'autorisation contre un token d'accès
  async exchangeCodeForToken(code: string): Promise<NotionTokenResponse> {
    console.log("=== ECHANGE CODE CONTRE TOKEN ===");
    console.log("Code à échanger:", code);

    const requestBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
    };

    console.log("Corps de la requête:", requestBody);

    const authHeader = `Basic ${Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64")}`;
    console.log("Header d'autorisation créé");

    try {
      const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Status de la réponse:", response.status);
      console.log(
        "Headers de la réponse:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur de la réponse Notion:", errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const tokenData = await response.json();
      console.log("Token reçu avec succès");
      console.log("Workspace:", tokenData.workspace_name);

      return tokenData;
    } catch (error) {
      console.error("Erreur lors de la requête token:", error);
      throw error;
    }
  }

  // Récupérer les informations de l'utilisateur Notion
  async getUserInfo(accessToken: string): Promise<NotionUserInfo> {
    const notion = new Client({ auth: accessToken });

    try {
      const response = await notion.users.me({});

      return response as NotionUserInfo;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des infos utilisateur:",
        error
      );
      throw new Error(
        `Erreur lors de la récupération des infos utilisateur: ${error}`
      );
    }
  }

  async getWorkspaceInfo(notionToken: string) {
    try {
      console.log(
        "🔍 Getting workspace info with token:",
        notionToken.substring(0, 10) + "..."
      );

      // Récupérer les informations de l'utilisateur
      const userInfo = await this.getUserInfo(notionToken);

      // Récupérer les informations de l'espace de travail (workspace)
      // Nous n'avons pas d'API directe pour cela, donc nous utilisons les informations
      // que nous avons déjà ou stockées précédemment

      return {
        user: {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.person?.email || null,
          avatar: userInfo.avatar_url,
        },
        workspace: {
          // Ces informations ne sont pas disponibles directement via l'API User
          // Vous devrez peut-être les stocker lors de l'échange initial du code
          id: "workspace_id", // À remplacer par la vraie valeur si disponible
          name: "Notion Workspace", // À remplacer par la vraie valeur si disponible
          icon: "", // À remplacer par la vraie valeur si disponible
        },
      };
    } catch (error) {
      console.error("❌ Error getting workspace info:", error);
      throw new Error("Failed to get workspace info");
    }
  }

  // Récupérer les bases de données Notion de l'utilisateur
  async getDatabases(notionToken: string): Promise<NotionDatabase[]> {
    try {
      console.log(
        "🔍 Getting databases with token:",
        notionToken.substring(0, 10) + "..."
      );

      const notion = new Client({ auth: notionToken });

      // Rechercher toutes les bases de données auxquelles l'utilisateur a accès
      const response = await notion.search({
        filter: {
          property: "object",
          value: "database",
        },
      });

      console.log(`✅ Found ${response.results.length} databases`);

      // Transformer les résultats en format plus simple
      const databases = response.results.map((db) => {
        const database = db as any; // Casting pour accéder aux propriétés

        // Extraire le titre de la base de données
        let title = "Untitled Database";
        if (database.title && Array.isArray(database.title)) {
          title = database.title.map((t: any) => t.plain_text).join("");
        }

        // Extraire la description
        let description = "";
        if (database.description && Array.isArray(database.description)) {
          description = database.description
            .map((d: any) => d.plain_text)
            .join("");
        }

        return {
          id: database.id,
          title: title,
          description: description,
          icon: database.icon?.type === "emoji" ? database.icon.emoji : null,
          created_time: database.created_time,
          last_edited_time: database.last_edited_time,
          properties: database.properties || {},
        };
      });

      return databases;
    } catch (error) {
      console.error("❌ Error getting databases:", error);
      throw new Error("Failed to get Notion databases");
    }
  }
}
