import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./globals.css";

import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { useSession } from "@/lib/auth-client";
import { ThemeHandler } from "./components/theme-handler";
import { routeTree } from "./routeTree.gen";
import { identifyFrontendUser, initPosthog, resetFrontendUser } from "@/lib/posthog-client";

const queryClient = new QueryClient();

export const router = createRouter({
	routeTree,
	context: {
		// auth will initially be undefined
		// We'll be passing down the auth state from within a React component
		auth: undefined!,
		queryClient,
	},
});

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router), Sentry.replayIntegration()],
		tracesSampleRate: 1.0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
	});
}

function App() {
	const { data: session, isPending } = useSession();

	useEffect(() => {
		initPosthog();
	}, []);

	useEffect(() => {
		if (isPending) {
			return;
		}

		if (session?.user?.id) {
			identifyFrontendUser({ id: session.user.id, email: session.user.email ?? null });
			if (import.meta.env.VITE_SENTRY_DSN) {
				Sentry.setUser({ id: session.user.id, email: session.user.email ?? undefined });
			}
		} else {
			resetFrontendUser();
			if (import.meta.env.VITE_SENTRY_DSN) {
				Sentry.setUser(null);
			}
		}
	}, [isPending, session?.user?.email, session?.user?.id]);

	if (isPending) {
		return <div>Loading...</div>;
	}

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeHandler />
			<RouterProvider router={router} context={{ auth: session ?? undefined, queryClient }} />
		</QueryClientProvider>
	);
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}
