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
import { usageRouter } from "./routes/usage";
import { createApiKeySession, verifyApiKeyManually } from "./infra/api-key";
import { env } from "./infra/env";

const sentry = {
	setUser: (_user: { id?: string; email?: string } | null) => {},
	captureException: (_error: unknown, _context?: Record<string, unknown>) => {},
};

export const ORPCRouter = {
	obsidian: obsidianRoutes.obsidianRouter,
	notion: notionRoutes.notionRouter,
	digest: digestRouter,
	onboarding: onboardingRouter,
	settings: settingsRouter,
	usage: usageRouter,
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
		// Check for API key authentication first (before session)
		// Uses manual verification as workaround for Better Auth bug: https://github.com/better-auth/better-auth/issues/6258
		const apiKeyHeader = c.req.header("x-api-key") || c.req.header("authorization")?.replace("Bearer ", "");
		if (apiKeyHeader) {
			const verifyResult = await verifyApiKeyManually(apiKeyHeader);

			if (verifyResult.valid && verifyResult.key) {
				const keyData = verifyResult.key;
				const { user, session } = createApiKeySession(
					{
						id: keyData.id,
						userId: keyData.userId,
						expiresAt: keyData.expiresAt,
					},
					apiKeyHeader,
				);
				c.set("user", user as typeof auth.$Infer.Session.user);
				c.set("session", session as typeof auth.$Infer.Session.session);
				return next();
			}
			// API key provided but invalid - don't fallback to session
			c.set("user", null);
			c.set("session", null);
			return next();
		}

		// No API key, try regular session authentication
			const session = await auth.api.getSession({ headers: c.req.raw.headers });
			if (session) {
				c.set("user", session.user);
				c.set("session", session.session);
				if (env.SENTRY_DSN) {
					sentry.setUser({ id: session.user.id, email: session.user.email });
				}
				return next();
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

			// Capture exception with Sentry
			if (env.SENTRY_DSN) {
				sentry.captureException(error, {
					user: { id: c.get("user")?.id, email: c.get("user")?.email },
					extra: { path: c.req.raw.url },
				});
			}

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
