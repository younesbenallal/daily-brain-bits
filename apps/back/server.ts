import { auth } from "@daily-brain-bits/auth";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { digestRouter } from "./routes/digest";
import * as notionRoutes from "./routes/notion";
import * as obsidianRoutes from "./routes/obsidian";
import { onboardingRouter } from "./routes/onboarding";
import { handleResendWebhook } from "./routes/resend-webhook";
import { settingsRouter } from "./routes/settings";
import { createApiKeySession } from "./utils/api-key";
import { env } from "./utils/env";

export const ORPCRouter = {
	obsidian: obsidianRoutes.obsidianRouter,
	notion: notionRoutes.notionRouter,
	digest: digestRouter,
	onboarding: onboardingRouter,
	settings: settingsRouter,
};

type RequestContext = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: RequestContext }>()
	//.use("*", logger({}))
	.use(
		"*",
		cors({
			origin: env.FRONTEND_URL,
			credentials: true,
		}),
	)
	.post("/webhooks/resend", handleResendWebhook)
	.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
	.use("*", async (c, next) => {
		// First try regular session authentication
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (session) {
			c.set("user", session.user);
			c.set("session", session.session);
			return next();
		}

		// If no session, check for API key authentication
		const apiKeyHeader = c.req.header("x-api-key") || c.req.header("authorization")?.replace("Bearer ", "");
		if (apiKeyHeader) {
			try {
				const verifyResult = await auth.api.verifyApiKey({
					body: { key: apiKeyHeader },
				});

				if (verifyResult.valid && verifyResult.key) {
					const keyData = verifyResult.key;
					const { user, session } = createApiKeySession(
						{
							id: keyData.id,
							userId: keyData.userId,
							expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : null,
						},
						apiKeyHeader,
					);
					c.set("user", user as typeof auth.$Infer.Session.user);
					c.set("session", session as typeof auth.$Infer.Session.session);
					return next();
				}
			} catch {
				// API key invalid, continue without authentication
			}
		}

		c.set("user", null);
		c.set("session", null);
		return next();
	})
	.use("*", async (c, next) => {
		try {
			return await next();
		} catch (error) {
			if (!env.NODE_ENV || env.NODE_ENV === "development") {
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
				"Error in oRPC route handler",
			);

			// Re-throw the error to let oRPC handle it properly
			throw error;
		}
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

export type AppType = typeof app;
export type ORPCRouterType = typeof ORPCRouter;

// Export Hono app for Vercel
export default app;
