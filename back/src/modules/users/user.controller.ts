import { Context } from "hono";
import { userService } from "./user.service";

export class UserController {
  async getUsers(c: Context) {
    try {
      const users = await userService.getUsersWithIntegrations();
      return c.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return c.json({ error: "Failed to fetch users" }, 500);
    }
  }

  async getUserById(c: Context) {
    try {
      const id = c.req.param("id");
      const user = await userService.getUserWithIntegrations(id);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      return c.json(user);
    } catch (error) {
      return c.json({ error: "Failed to fetch user" }, 500);
    }
  }

  async createUser(c: Context) {
    try {
      const body = await c.req.json();
      const user = await userService.createUser(body);
      return c.json(user, 201);
    } catch (error) {
      return c.json({ error: "Failed to create user" }, 500);
    }
  }

  async updateUser(c: Context) {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const user = await userService.updateUser(id, body);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      return c.json(user);
    } catch (error) {
      return c.json({ error: "Failed to update user" }, 500);
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = c.req.param("id");
      const success = await userService.deleteUser(id);

      if (!success) {
        return c.json({ error: "User not found" }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: "Failed to delete user" }, 500);
    }
  }
}

export const userController = new UserController();
