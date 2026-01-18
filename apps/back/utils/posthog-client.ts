import { PostHog } from "posthog-node";
import { env } from "./env";

const posthogClient = env.POSTHOG_API_KEY
	? new PostHog(env.POSTHOG_API_KEY, {
			host: env.POSTHOG_HOST ?? "https://app.posthog.com",
		})
	: null;

export const captureBackendEvent = (options: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
}) => {
	if (!posthogClient) {
		return;
	}

	posthogClient.capture({
		distinctId: options.distinctId,
		event: options.event,
		properties: options.properties,
	});
};

export const shutdownPosthog = async () => {
	if (!posthogClient) {
		return;
	}

	await posthogClient.shutdown();
};
