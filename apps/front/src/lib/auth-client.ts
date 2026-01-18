import type { auth } from "@daily-brain-bits/auth";
import { apiKeyClient, inferAdditionalFields } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_API_URL,
	fetchOptions: {
		onError: (ctx) => {
			if (ctx.response.status === 401) {
				redirectToLoginWithCallback();
			}
		},
	},
	plugins: [inferAdditionalFields<typeof auth>(), apiKeyClient(), polarClient()],
});

export const { signIn, signUp, useSession, signOut, linkSocial } = authClient;
export type Session = typeof authClient.$Infer.Session;

/**
 * Redirect to login page with current URL as callback
 * @param customUrl - Optional custom URL to use instead of current location
 */
export function redirectToLoginWithCallback(customUrl?: string) {
	const currentUrl = customUrl || window.location.pathname + window.location.search;
	const callbackUrl = encodeURIComponent(currentUrl);
	window.location.href = `/login?callbackUrl=${callbackUrl}`;
}
