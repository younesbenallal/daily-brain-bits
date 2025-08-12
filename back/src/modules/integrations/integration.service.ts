import { eq, and, desc } from "drizzle-orm";
import { db } from "../database/connection";
import { integrations } from "../../db/schemas/integrations.schema";
import type {
  Integration,
  NewIntegration,
  UpdateIntegration,
  NotionIntegrationMetadata,
  ObsidianIntegrationMetadata,
} from "../../db/schemas/integrations.schema";

export class IntegrationService {
  // Créer une nouvelle intégration
  async createIntegration(
    integrationData: NewIntegration
  ): Promise<Integration> {
    const [newIntegration] = await db
      .insert(integrations)
      .values({
        ...integrationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newIntegration;
  }

  // Récupérer toutes les intégrations d'un utilisateur
  async getUserIntegrations(userId: string): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.userId, userId))
      .orderBy(desc(integrations.createdAt));
  }

  // Récupérer les intégrations actives d'un utilisateur
  async getUserActiveIntegrations(userId: string): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(
        and(eq(integrations.userId, userId), eq(integrations.isActive, true))
      )
      .orderBy(desc(integrations.createdAt));
  }

  // Récupérer une intégration spécifique par type
  async getUserIntegrationByType(
    userId: string,
    type: string
  ): Promise<Integration | null> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.type, type),
          eq(integrations.isActive, true)
        )
      )
      .orderBy(desc(integrations.createdAt))
      .limit(1);

    return integration || null;
  }

  // Récupérer une intégration par ID
  async getIntegrationById(id: string): Promise<Integration | null> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id));

    return integration || null;
  }

  // Mettre à jour une intégration
  async updateIntegration(
    id: string,
    updates: UpdateIntegration
  ): Promise<Integration | null> {
    const [updatedIntegration] = await db
      .update(integrations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
      .returning();

    return updatedIntegration || null;
  }

  // Désactiver une intégration (soft delete)
  async deactivateIntegration(id: string): Promise<boolean> {
    const result = await db
      .update(integrations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id));

    return result.length > 0;
  }

  // Supprimer définitivement une intégration
  async deleteIntegration(id: string): Promise<boolean> {
    const result = await db.delete(integrations).where(eq(integrations.id, id));

    return result.length > 0;
  }

  // Méthodes spécifiques pour Notion
  async createNotionIntegration(
    userId: string,
    accessToken: string,
    metadata: NotionIntegrationMetadata,
    name?: string
  ): Promise<Integration> {
    const integrationName =
      name || metadata.workspaceName || "Notion Workspace";

    return await this.createIntegration({
      userId,
      type: "notion",
      name: integrationName,
      accessToken,
      metadata: metadata as any,
      isActive: true,
    });
  }

  async getNotionIntegration(userId: string): Promise<Integration | null> {
    return await this.getUserIntegrationByType(userId, "notion");
  }

  async updateNotionIntegration(
    userId: string,
    accessToken: string,
    metadata?: NotionIntegrationMetadata
  ): Promise<Integration | null> {
    const existingIntegration = await this.getNotionIntegration(userId);

    if (existingIntegration) {
      return await this.updateIntegration(existingIntegration.id, {
        accessToken,
        metadata: metadata as any,
        updatedAt: new Date(),
      });
    }

    return null;
  }

  // Méthodes spécifiques pour Obsidian (pour l'avenir)
  async createObsidianIntegration(
    userId: string,
    accessToken: string,
    metadata: ObsidianIntegrationMetadata,
    name?: string
  ): Promise<Integration> {
    const integrationName = name || metadata.vaultName || "Obsidian Vault";

    return await this.createIntegration({
      userId,
      type: "obsidian",
      name: integrationName,
      accessToken,
      metadata: metadata as any,
      isActive: true,
    });
  }

  async getObsidianIntegration(userId: string): Promise<Integration | null> {
    return await this.getUserIntegrationByType(userId, "obsidian");
  }

  // Vérifier si un utilisateur a une intégration active d'un type donné
  async hasActiveIntegration(userId: string, type: string): Promise<boolean> {
    const integration = await this.getUserIntegrationByType(userId, type);
    return integration !== null;
  }

  // Récupérer le token d'accès pour un type d'intégration
  async getAccessToken(userId: string, type: string): Promise<string | null> {
    const integration = await this.getUserIntegrationByType(userId, type);
    return integration?.accessToken || null;
  }
}

export const integrationService = new IntegrationService();
