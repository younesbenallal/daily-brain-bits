import { auth } from "@daily-brain-bits/auth";
import { db, integrationConnections } from "@daily-brain-bits/db";
import { ORPCError, onError, os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { exchangeNotionCode, getNotionAuthorizeUrl, type NotionTokenResponse } from "./integrations/notion-oauth";
import * as notionRoutes from "./routes/notion";
import * as obsidianRoutes from "./routes/obsidian";

const ORPCRouter = {
  obsidian: obsidianRoutes,
  notion: notionRoutes.notionRouter,
};
type RequestContext = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: RequestContext }>()
  .use("*", logger())
  .use(
    "*",
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  )
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      c.set("user", null);
      c.set("session", null);
      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  })
  .use("*", async (c, next) => {
    try {
      return await next();
    } catch (error) {
      if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
        console.error(error);
      }
      // Log error with context information
      console.error(
        {
          error,
          path: c.req.raw.url,
          userId: c.get("user")?.id,
          userEmail: c.get("user")?.email,
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : undefined,
          isORPCError: error instanceof ORPCError,
          errorCode: error instanceof ORPCError ? error.code : undefined,
        },
        "Error in oRPC route handler"
      );

      // Re-throw the error to let oRPC handle it properly
      throw error;
    }
  })
  .get("/api/integrations/notion/start", async (c) => {
    console.log("session", c.get("session"));
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    if (!clientId) {
      return c.json({ error: "missing_notion_client_id" }, 500);
    }

    const redirectUri = `${process.env.BACKEND_URL}/api/integrations/notion/callback`;
    const state = crypto.randomUUID();
    const returnTo = c.req.query("returnTo");
    const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/onboarding/configure-notion";

    setCookie(c, "notion_oauth_state", state, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/api/integrations/notion",
      secure: process.env.NODE_ENV === "production",
    });

    setCookie(c, "notion_oauth_return_to", safeReturnTo, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/api/integrations/notion",
      secure: process.env.NODE_ENV === "production",
    });

    const authorizeUrl = getNotionAuthorizeUrl({
      clientId,
      redirectUri,
      state,
      owner: "workspace",
    });

    return c.redirect(authorizeUrl);
  })
  .get("/api/integrations/notion/callback", async (c) => {
    const session = c.get("session");
    const user = c.get("user");
    if (!session || !user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    const expectedState = getCookie(c, "notion_oauth_state");
    const returnTo = getCookie(c, "notion_oauth_return_to") ?? "/onboarding/configure-notion";

    deleteCookie(c, "notion_oauth_state", { path: "/api/integrations/notion" });
    deleteCookie(c, "notion_oauth_return_to", {
      path: "/api/integrations/notion",
    });

    if (!code || !state || !expectedState || state !== expectedState) {
      return c.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}${returnTo}?notion=error`);
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return c.json({ error: "missing_notion_credentials" }, 500);
    }

    const redirectUri =
      process.env.NOTION_REDIRECT_URI ?? `${process.env.BACKEND_URL || "http://localhost:3001"}/api/integrations/notion/callback`;

    let tokenResponse: NotionTokenResponse;
    try {
      tokenResponse = await exchangeNotionCode({
        code,
        clientId,
        clientSecret,
        redirectUri,
      });
    } catch (error) {
      console.error("[notion.oauth] exchange_failed", error);
      return c.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}${returnTo}?notion=error`);
    }

    const now = new Date();
    const configJson = {
      workspaceId: tokenResponse.workspace_id ?? null,
      workspaceName: tokenResponse.workspace_name ?? null,
      workspaceIcon: tokenResponse.workspace_icon ?? null,
      owner: tokenResponse.owner ?? null,
    };

    const secretsJsonEncrypted = JSON.stringify({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      botId: tokenResponse.bot_id,
      workspaceId: tokenResponse.workspace_id,
    });

    await db
      .insert(integrationConnections)
      .values({
        userId: user.id,
        kind: "notion",
        status: "active",
        displayName: tokenResponse.workspace_name ?? "Notion workspace",
        accountExternalId: tokenResponse.bot_id,
        configJson,
        secretsJsonEncrypted,
        updatedAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [integrationConnections.userId, integrationConnections.kind, integrationConnections.accountExternalId],
        set: {
          status: "active",
          displayName: tokenResponse.workspace_name ?? "Notion workspace",
          configJson,
          secretsJsonEncrypted,
          updatedAt: now,
          lastSeenAt: now,
        },
      });

    return c.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}${returnTo}?notion=connected`);
  })
  .use("/rpc/*", async (c, next) => {
    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context: {
        user: c.get("user"),
        session: c.get("session"),
      },
    });

    if (matched) {
      return c.newResponse(response.body, response);
    }

    await next();
  });

// oRPC handler
const rpcHandler = new RPCHandler(ORPCRouter, {
  interceptors: [
    onError((error) => {
      console.error("oRPC Error:", error);
    }),
  ],
});

// Mount oRPC routes
const port = Number(process.env.PORT) || 3001;

export type AppType = typeof app;
export type ORPCRouterType = typeof ORPCRouter;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on port ${port}`);
