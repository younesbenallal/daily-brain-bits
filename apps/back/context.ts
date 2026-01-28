import type { auth } from "@daily-brain-bits/auth";
import { ORPCError, os } from "@orpc/server";

export type RequestContext = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

/**
 * Requires an active session (session-based authentication only).
 * Use for routes that need session-specific data.
 */
export const sessionRoute = os.$context<RequestContext>().use(({ context, next }) => {
	if (!context.session) {
		throw new ORPCError("Unauthorized");
	}
	return next();
});

/**
 * Requires an authenticated user (session OR API key).
 * Use for routes that work with any authentication method.
 */
export const authenticatedRoute = os.$context<RequestContext>().use(({ context, next }) => {
	if (!context.user) {
		throw new ORPCError("Unauthorized");
	}
	return next();
});
