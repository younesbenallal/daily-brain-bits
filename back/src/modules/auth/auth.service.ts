import { auth } from "../../../auth";
import { userService } from "../users/user.service";
import {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
} from "../users/user.types";

export class AuthService {
  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      console.log("🔍 Starting registration with Better Auth...");
      console.log("📧 Email:", userData.email);
      console.log("👤 Name:", userData.name);

      // Utiliser Better Auth pour créer l'utilisateur
      const result = await auth.api.signUpEmail({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
        },
      });

      console.log("📊 Better Auth result:", result);

      if (!result.user) {
        console.log("❌ No user returned from Better Auth");
        throw new Error("Failed to create user");
      }

      // Synchroniser avec votre table users AVEC le token
      try {
        await userService.createUser({
          email: result.user.email,
          name: result.user.name,
          betterAuthId: result.user.id, // Stocker l'ID Better Auth
          token: result.token || "", // Stocker le token Better Auth
        });
        console.log("✅ User synchronized with local users table with token");
      } catch (syncError) {
        console.log(
          "⚠️ User might already exist in local table, updating token..."
        );
        // Si l'utilisateur existe déjà, mettre à jour le token
        try {
          const existingUser = await userService.getUserByEmail(
            result.user.email
          );
          if (existingUser) {
            await userService.updateUser(existingUser.id, {
              betterAuthId: result.user.id,
              token: result.token || "",
            });
            console.log("✅ Token updated for existing user");
          }
        } catch (updateError) {
          console.error("❌ Error updating existing user token:", updateError);
        }
      }

      console.log("✅ User created successfully:", result.user);

      return {
        user: {
          id: parseInt(result.user.id) || 0,
          email: result.user.email,
          name: result.user.name,
          betterAuthId: result.user.id,
          token: result.token || "",
          isActive: true,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
        },
        token: result.token || "",
      };
    } catch (error) {
      console.error("❌ Registration error:", error);
      throw error;
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      console.log("🔍 Starting login with Better Auth...");
      console.log("📧 Email:", loginData.email);

      const result = await auth.api.signInEmail({
        body: {
          email: loginData.email,
          password: loginData.password,
        },
      });

      console.log("📊 Better Auth login result:", result);

      if (!result.user) {
        console.log("❌ No user returned from Better Auth");
        throw new Error("Invalid credentials");
      }

      // Synchroniser/mettre à jour la table users locale AVEC le token
      try {
        const localUser = await userService.getUserByEmail(result.user.email);
        if (!localUser) {
          // Créer l'utilisateur local s'il n'existe pas
          await userService.createUser({
            email: result.user.email,
            name: result.user.name,
            betterAuthId: result.user.id,
            token: result.token || "", // Stocker le token
          });
          console.log("✅ User created locally with token");
        } else {
          // Mettre à jour l'ID Better Auth ET le token
          await userService.updateUser(localUser.id, {
            betterAuthId: result.user.id,
            token: result.token || "", // Mettre à jour le token
          });
          console.log("✅ User token updated locally");
        }
      } catch (syncError) {
        console.error("⚠️ Error syncing user:", syncError);
      }

      return {
        user: {
          id: parseInt(result.user.id) || 0,
          email: result.user.email,
          name: result.user.name,
          betterAuthId: result.user.id,
          token: result.token || "",
          isActive: true,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
        },
        token: result.token || "",
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      throw new Error("Invalid credentials");
    }
  }

  // Nouvelle méthode pour récupérer un utilisateur par token
  async getUserByToken(token: string) {
    try {
      const localUser = await userService.getUserByToken(token);
      return localUser;
    } catch (error) {
      console.error("❌ Error getting user by token:", error);
      return null;
    }
  }

  async getUserWithSession(betterAuthId: string) {
    try {
      const localUser = await userService.getUserByBetterAuthId(betterAuthId);
      const session = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${betterAuthId}`,
        },
      });

      return {
        localUser,
        session,
      };
    } catch (error) {
      console.error("❌ Error getting user with session:", error);
      return null;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Supprimer le token de la base de données locale
      const localUser = await userService.getUserByToken(token);
      if (localUser) {
        await userService.updateUser(localUser.id, {
          token: null, // Supprimer le token
        });
        console.log("✅ Token removed from local database");
      }

      // Déconnecter de Better Auth
      await auth.api.signOut({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout error:", error);
      throw error;
    }
  }

  async verifySession(token: string) {
    try {
      const result = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      return result;
    } catch (error) {
      console.error("❌ Session verification error:", error);
      return null;
    }
  }

  async notionCallback(
    body: {
      notionToken: string;
      userEmail?: string;
      metadata?: any;
      integrationName?: string;
    },
    context?: any
  ) {
    try {
      console.log("🔍 Processing Notion token for user:", body.userEmail);

      if (!body.userEmail) {
        throw new Error("User email is required to associate Notion token");
      }

      // Chercher l'utilisateur dans la table users par email
      let localUser = await userService.getUserByEmail(body.userEmail);

      if (!localUser) {
        throw new Error(
          `No user found for email: ${body.userEmail}. Please make sure you are logged in.`
        );
      }

      console.log("🔍 Found local user:", localUser.email);

      // Import the integration service
      const { integrationService } = await import(
        "../integrations/integration.service"
      );

      // Vérifier si l'utilisateur a déjà une intégration Notion
      const existingIntegration = await integrationService.getNotionIntegration(
        localUser.id
      );

      let integration;
      if (existingIntegration) {
        // Mettre à jour l'intégration existante
        integration = await integrationService.updateNotionIntegration(
          localUser.id,
          body.notionToken,
          body.metadata
        );
        console.log("✅ Existing Notion integration updated");
      } else {
        // Créer une nouvelle intégration
        const metadata = body.metadata || {
          workspaceId: "unknown",
          workspaceName: body.integrationName || "Notion Workspace",
          botId: "unknown",
          owner: { type: "user" },
          request_id: Date.now().toString(),
        };

        integration = await integrationService.createNotionIntegration(
          localUser.id,
          body.notionToken,
          metadata,
          body.integrationName
        );
        console.log("✅ New Notion integration created");
      }

      if (!integration) {
        throw new Error("Failed to create or update Notion integration");
      }

      return {
        success: true,
        message: "Notion integration saved successfully",
        integration: {
          id: integration.id,
          type: integration.type,
          name: integration.name,
          isActive: integration.isActive,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt,
        },
        user: {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          hasNotionIntegration: true,
          isActive: localUser.isActive,
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt,
        },
      };
    } catch (error) {
      console.error("❌ Notion callback error:", error);
      throw error;
    }
  }
}

export const authService = new AuthService();
