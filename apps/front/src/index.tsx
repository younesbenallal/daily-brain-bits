import React from "react";
import ReactDOM from "react-dom/client";
import "./globals.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { useSession } from "@/lib/auth-client";
import { ThemeHandler } from "./components/theme-handler";
import { routeTree } from "./routeTree.gen";

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

function App() {
	const { data: session, isPending } = useSession();
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
