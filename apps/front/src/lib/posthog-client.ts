import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com";
const isProduction = import.meta.env.PROD;
const shouldInitialize = Boolean(posthogKey) && isProduction;

let hasInitialized = false;

export const initPosthog = () => {
	if (!shouldInitialize || hasInitialized) {
		return;
	}

	posthog.init(posthogKey as string, {
		api_host: posthogHost,
		autocapture: false,
		capture_pageview: false,
	});

	hasInitialized = true;
};

const ensureInitialized = () => {
	if (!shouldInitialize) {
		return false;
	}
	if (!hasInitialized) {
		initPosthog();
	}
	return hasInitialized;
};

export const captureFrontendEvent = (event: string, properties?: Record<string, unknown>) => {
	if (!ensureInitialized()) {
		return;
	}

	posthog.capture(event, properties);
};

export const identifyFrontendUser = (user: { id: string; email?: string | null }) => {
	if (!ensureInitialized()) {
		return;
	}

	posthog.identify(user.id, {
		email: user.email ?? undefined,
	});
};

export const resetFrontendUser = () => {
	if (!ensureInitialized()) {
		return;
	}

	posthog.reset();
};
