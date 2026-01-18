import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com";

let hasInitialized = false;

export const initPosthog = () => {
	if (!posthogKey || hasInitialized) {
		return;
	}

	posthog.init(posthogKey, {
		api_host: posthogHost,
		autocapture: false,
		capture_pageview: false,
	});

	hasInitialized = true;
};

export const captureFrontendEvent = (event: string, properties?: Record<string, unknown>) => {
	if (!posthogKey) {
		return;
	}

	if (!hasInitialized) {
		initPosthog();
	}

	posthog.capture(event, properties);
};

export const identifyFrontendUser = (user: { id: string; email?: string | null }) => {
	if (!posthogKey) {
		return;
	}

	if (!hasInitialized) {
		initPosthog();
	}

	posthog.identify(user.id, {
		email: user.email ?? undefined,
	});
};

export const resetFrontendUser = () => {
	if (!posthogKey) {
		return;
	}

	posthog.reset();
};
