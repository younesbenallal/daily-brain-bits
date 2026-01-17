import type { auth } from "@daily-brain-bits/auth";
import { ORPCError, os } from "@orpc/server";

export type RequestContext = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export const baseRoute = os.$context<RequestContext>().use(({ context, next }) => {
	if (!context.session) {
		throw new ORPCError("Unauthorized");
	}
	return next();
});
