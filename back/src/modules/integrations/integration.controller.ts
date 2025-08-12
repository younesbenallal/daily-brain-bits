import { Context } from "hono";
import { integrationService } from "./integration.service";
import { userService } from "../users/user.service";

export class IntegrationController {
  // Récupérer toutes les intégrations d'un utilisateur
  async getUserIntegrations(c: Context) {
    try {
      const userId = c.req.param("userId");
      if (!userId) {
        return c.json({ error: "User ID is required" }, 400);
      }

      const integrations = await integrationService.getUserIntegrations(userId);
      return c.json(integrations);
    } catch (error) {
      console.error("Error fetching user integrations:", error);
      return c.json({ error: "Failed to fetch integrations" }, 500);
    }
  }

  // Récupérer les intégrations actives d'un utilisateur
  async getUserActiveIntegrations(c: Context) {
    try {
      const userId = c.req.param("userId");
      if (!userId) {
        return c.json({ error: "User ID is required" }, 400);
      }

      const integrations =
        await integrationService.getUserActiveIntegrations(userId);
      return c.json(integrations);
    } catch (error) {
      console.error("Error fetching active integrations:", error);
      return c.json({ error: "Failed to fetch active integrations" }, 500);
    }
  }

  // Récupérer une intégration spécifique par type
  async getUserIntegrationByType(c: Context) {
    try {
      const userId = c.req.param("userId");
      const type = c.req.param("type");

      if (!userId || !type) {
        return c.json({ error: "User ID and type are required" }, 400);
      }

      const integration = await integrationService.getUserIntegrationByType(
        userId,
        type
      );

      if (!integration) {
        return c.json({ error: "Integration not found" }, 404);
      }

      return c.json(integration);
    } catch (error) {
      console.error("Error fetching integration by type:", error);
      return c.json({ error: "Failed to fetch integration" }, 500);
    }
  }

  // Créer une nouvelle intégration
  async createIntegration(c: Context) {
    try {
      const body = await c.req.json();
      const integration = await integrationService.createIntegration(body);
      return c.json(integration, 201);
    } catch (error) {
      console.error("Error creating integration:", error);
      return c.json({ error: "Failed to create integration" }, 500);
    }
  }

  // Mettre à jour une intégration
  async updateIntegration(c: Context) {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();

      if (!id) {
        return c.json({ error: "Integration ID is required" }, 400);
      }

      const integration = await integrationService.updateIntegration(id, body);

      if (!integration) {
        return c.json({ error: "Integration not found" }, 404);
      }

      return c.json(integration);
    } catch (error) {
      console.error("Error updating integration:", error);
      return c.json({ error: "Failed to update integration" }, 500);
    }
  }

  // Désactiver une intégration
  async deactivateIntegration(c: Context) {
    try {
      const id = c.req.param("id");

      if (!id) {
        return c.json({ error: "Integration ID is required" }, 400);
      }

      const success = await integrationService.deactivateIntegration(id);

      if (!success) {
        return c.json({ error: "Integration not found" }, 404);
      }

      return c.json({ success: true, message: "Integration deactivated" });
    } catch (error) {
      console.error("Error deactivating integration:", error);
      return c.json({ error: "Failed to deactivate integration" }, 500);
    }
  }

  // Supprimer une intégration
  async deleteIntegration(c: Context) {
    try {
      const id = c.req.param("id");

      if (!id) {
        return c.json({ error: "Integration ID is required" }, 400);
      }

      const success = await integrationService.deleteIntegration(id);

      if (!success) {
        return c.json({ error: "Integration not found" }, 404);
      }

      return c.json({ success: true, message: "Integration deleted" });
    } catch (error) {
      console.error("Error deleting integration:", error);
      return c.json({ error: "Failed to delete integration" }, 500);
    }
  }

  // Vérifier si un utilisateur a une intégration active d'un type donné
  async checkIntegration(c: Context) {
    try {
      const userId = c.req.param("userId");
      const type = c.req.param("type");

      if (!userId || !type) {
        return c.json({ error: "User ID and type are required" }, 400);
      }

      const hasIntegration = await integrationService.hasActiveIntegration(
        userId,
        type
      );

      return c.json({
        hasIntegration,
        type,
        userId,
      });
    } catch (error) {
      console.error("Error checking integration:", error);
      return c.json({ error: "Failed to check integration" }, 500);
    }
  }

  // Nouvelles méthodes pour récupérer les intégrations par email

  // Récupérer toutes les intégrations d'un utilisateur par email
  async getUserIntegrationsByEmail(c: Context) {
    try {
      const userEmail = c.req.query("email");
      if (!userEmail) {
        return c.json({ error: "User email is required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const integrations = await integrationService.getUserIntegrations(
        user.id
      );
      return c.json(integrations);
    } catch (error) {
      console.error("Error fetching user integrations by email:", error);
      return c.json({ error: "Failed to fetch integrations" }, 500);
    }
  }

  // Récupérer les intégrations actives d'un utilisateur par email
  async getUserActiveIntegrationsByEmail(c: Context) {
    try {
      const userEmail = c.req.query("email");
      if (!userEmail) {
        return c.json({ error: "User email is required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const integrations = await integrationService.getUserActiveIntegrations(
        user.id
      );
      return c.json(integrations);
    } catch (error) {
      console.error("Error fetching active integrations by email:", error);
      return c.json({ error: "Failed to fetch active integrations" }, 500);
    }
  }

  // Récupérer une intégration spécifique par type et email
  async getUserIntegrationByTypeAndEmail(c: Context) {
    try {
      const userEmail = c.req.query("email");
      const type = c.req.param("type");

      if (!userEmail || !type) {
        return c.json({ error: "User email and type are required" }, 400);
      }

      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const integration = await integrationService.getUserIntegrationByType(
        user.id,
        type
      );
      if (!integration) {
        return c.json({ error: "Integration not found" }, 404);
      }

      return c.json(integration);
    } catch (error) {
      console.error("Error fetching integration by type and email:", error);
      return c.json({ error: "Failed to fetch integration" }, 500);
    }
  }
}

export const integrationController = new IntegrationController();
