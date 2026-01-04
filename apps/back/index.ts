import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { router } from "./router";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// oRPC handler
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("oRPC Error:", error);
    }),
  ],
});

// Mount oRPC routes
app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: {
      requestUrl: c.req.url,
    },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

const port = Number(process.env.PORT) || 3001;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on port ${port}`);
