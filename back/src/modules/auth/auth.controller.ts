import { Context } from "hono";
import { authService } from "./auth.service";
import { CreateUserRequest, LoginRequest } from "../users/user.types";

export class AuthController {
  async register(c: Context) {
    try {
      console.log("🚀 Register endpoint called");
      const body = (await c.req.json()) as CreateUserRequest;
      console.log("📝 Request body:", body);

      // Validation des données
      if (!body.email || !body.name || !body.password) {
        console.log("❌ Validation failed: missing fields");
        return c.json({ error: "Email, name and password are required" }, 400);
      }

      console.log("✅ Validation passed, calling authService.register");
      const result = await authService.register(body);
      console.log("✅ Registration successful");
      return c.json(result, 201);
    } catch (error) {
      console.error("❌ Registration error:", error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "An error occurred during registration" }, 500);
    }
  }

  async login(c: Context) {
    try {
      console.log("🔍 Starting login with Better Auth...");
      console.log("🚀 Login endpoint called");
      const body = (await c.req.json()) as LoginRequest;
      console.log("📝 Login request for:", body.email);

      if (!body.email || !body.password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      const result = await authService.login(body);
      console.log("✅ Login successful");
      return c.json(result);
    } catch (error) {
      console.error("❌ Login error:", error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "An error occurred during login" }, 500);
    }
  }

  async logout(c: Context) {
    try {
      console.log("🚀 Logout endpoint called");
      const authHeader = c.req.header("Authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "No token provided" }, 401);
      }

      const token = authHeader.split(" ")[1];
      await authService.logout(token);

      console.log("✅ Logout successful");
      return c.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("❌ Logout error:", error);
      return c.json({ error: "An error occurred during logout" }, 500);
    }
  }

  async notionCallback(c: Context) {
    try {
      console.log("🚀 Notion callback endpoint called");
      const body = (await c.req.json()) as {
        notionToken: string;
        userEmail?: string;
      };
      console.log(
        "📝 Notion token received:",
        body.notionToken?.substring(0, 20) + "..."
      );
      const result = await authService.notionCallback(body, c);
      return c.json(result);
    } catch (error) {
      console.error("❌ Notion callback error:", error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "An error occurred during notion callback" }, 500);
    }
  }
}

export const authController = new AuthController();
