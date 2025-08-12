import { eq, desc, like } from "drizzle-orm";
import { db } from "../database/connection";

import { CreateUserRequest, UpdateUserRequest } from "./user.types";
import { user } from "../../modules/auth/auth.schema";

export class UserService {
  async createUser(userData: CreateUserRequest): Promise<any> {
    const [newUser] = await db
      .insert(user)
      .values(userData as any)
      .returning();
    return newUser;
  }

  async getUserById(id: string): Promise<any> {
    const [foundUser] = await db.select().from(user).where(eq(user.id, id));
    return foundUser;
  }

  async getUserByEmail(email: string): Promise<any> {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));
    return foundUser;
  }

  async getUserByBetterAuthId(betterAuthId: string): Promise<any> {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.betterAuthId, betterAuthId));
    return foundUser;
  }

  async getUserByToken(token: string): Promise<any> {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.token, token));
    return foundUser;
  }

  async getUsers(): Promise<any[]> {
    const allUsers = await db.select().from(user);
    return allUsers;
  }

  // Nouvelle méthode pour récupérer les utilisateurs avec leurs intégrations
  async getUsersWithIntegrations(): Promise<any[]> {
    const allUsers = await this.getUsers();
    const { integrationService } = await import(
      "../integrations/integration.service"
    );

    // Enrichir chaque utilisateur avec ses intégrations
    const usersWithIntegrations = await Promise.all(
      allUsers.map(async (userData) => {
        const integrations = await integrationService.getUserActiveIntegrations(
          userData.id
        );
        const hasNotionIntegration = integrations.some(
          (integration) => integration.type === "notion"
        );

        return {
          ...userData,
          integrations,
          hasNotionIntegration,
          // Maintenir la compatibilité avec l'ancien champ notionToken
          notionToken: hasNotionIntegration ? "integrated" : null,
        };
      })
    );

    return usersWithIntegrations;
  }

  async getUserWithIntegrations(id: string): Promise<any> {
    const userData = await this.getUserById(id);
    if (!userData) return null;

    const { integrationService } = await import(
      "../integrations/integration.service"
    );
    const integrations = await integrationService.getUserActiveIntegrations(
      userData.id
    );
    const hasNotionIntegration = integrations.some(
      (integration) => integration.type === "notion"
    );

    return {
      ...userData,
      integrations,
      hasNotionIntegration,
      // Maintenir la compatibilité avec l'ancien champ notionToken
      notionToken: hasNotionIntegration ? "integrated" : null,
    };
  }

  async updateUser(id: string, updates: UpdateUserRequest): Promise<any> {
    console.log("🔍 Updating user:", id, updates);
    const [updatedUser] = await db
      .update(user)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(user).where(eq(user.id, id));
    return result.length > 0;
  }
}

export const userService = new UserService();
