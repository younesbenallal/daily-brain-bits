import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, redirect } from "@tanstack/react-router";
import type { Session } from "@/lib/auth-client";

export interface RouterContext {
	auth: Session | undefined;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => (
		<div className="min-h-screen bg-background">
			<Outlet />
		</div>
	),
	beforeLoad: ({ context: { auth }, location }) => {
		if (!location.pathname || location.pathname === "/") {
			if (!auth?.session) {
				throw redirect({ to: "/login", search: { callbackUrl: "/" } });
			}
			throw redirect({ to: "/dash" });
		}
	},
});
