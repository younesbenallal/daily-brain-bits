import { Context, Next } from "hono";
import { authService } from "./auth.service";

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split(" ")[1];
    const payload = await authService.verifyToken(token);

    // Ajouter les informations de l'utilisateur au contexte
    c.set("user", payload);

    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 401);
  }
}
