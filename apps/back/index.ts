import { auth } from "@daily-brain-bits/auth";
import { ORPCError, onError, os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as obsidianRoutes from "./routes/obsidian";

type Context = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

const ORPCRouter = {
  obsidian: obsidianRoutes,
};

const app = new Hono<{ Variables: Context }>()
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
      //@ts-expect-error
      c.set("user", null);
      //@ts-expect-error
      c.set("session", null);
      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  })
  .use("/rpc/*", async (c, next) => {
    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context: {},
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

export const baseRoute = os.$context<Context>().use(({ context, next }) => {
  const session = context.session;
  if (!session) {
    throw new ORPCError("Unauthorized");
  }
  return next();
});

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on port ${port}`);
