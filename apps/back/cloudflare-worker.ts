import * as Sentry from "@sentry/cloudflare";
import { getDatabaseUrlSummary } from "./infra/log-utils";

type HyperdriveBinding = {
	connectionString: string;
};

type WorkerEnv = Record<string, unknown> & {
	HYPERDRIVE_CACHED?: HyperdriveBinding;
	HYPERDRIVE_REALTIME?: HyperdriveBinding;
};

const envKeys = [
	"NODE_ENV",
	"DEPLOYMENT_MODE",
	"DATABASE_URL",
	"BETTER_AUTH_SECRET",
	"BETTER_AUTH_URL",
	"CONTENT_ENCRYPTION_KEY",
	"FRONTEND_URL",
	"BACKEND_URL",
	"RESEND_API_KEY",
	"RESEND_FROM",
	"RESEND_REPLY_TO",
	"RESEND_WEBHOOK_SECRET",
	"DIGEST_EMAIL_DRY_RUN",
	"SEQUENCE_EMAIL_DRY_RUN",
	"TRIGGER_SECRET_KEY",
	"TRIGGER_API_URL",
	"POSTHOG_API_KEY",
	"POSTHOG_HOST",
	"POLAR_ACCESS_TOKEN",
	"POLAR_SERVER",
	"POLAR_PRO_PRODUCT_ID",
	"POLAR_WEBHOOK_SECRET",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
	"NOTION_CLIENT_ID",
	"NOTION_CLIENT_SECRET",
	"NOTION_API_KEY",
	"NOTION_TOKEN",
	"NOTION_DATABASE_ID",
	"SENTRY_DSN",
] as const;

let appPromise: Promise<any> | undefined;
let didLogDbConfig = false;

const writeProcessEnv = (workerEnv: WorkerEnv) => {
	for (const key of envKeys) {
		const value = workerEnv[key];
		if (typeof value === "string") {
			process.env[key] = value;
		}
	}

	const dbConnectionString =
		workerEnv.HYPERDRIVE_REALTIME?.connectionString ?? workerEnv.HYPERDRIVE_CACHED?.connectionString;

	if (dbConnectionString) {
		process.env.DATABASE_URL = dbConnectionString;
	}
};

export default Sentry.withSentry(
	(env: WorkerEnv) => ({
		dsn: typeof env.SENTRY_DSN === "string" ? env.SENTRY_DSN : undefined,
		environment: typeof env.NODE_ENV === "string" ? env.NODE_ENV : "production",
		tracesSampleRate: 1.0,
	}),
	{
		async fetch(request: any, workerEnv: WorkerEnv, executionContext: any) {
			writeProcessEnv(workerEnv);

			if (!didLogDbConfig) {
				didLogDbConfig = true;
				// Log once per cold start to make it obvious what DB wiring is active on Workers.
				const summary = getDatabaseUrlSummary(process.env.DATABASE_URL);
				const hasHyperdriveBinding = Boolean(workerEnv.HYPERDRIVE_REALTIME || workerEnv.HYPERDRIVE_CACHED);

				// Intentionally do not log the raw URL (it contains credentials).
				console.log("[db] worker db config", {
					hasHyperdriveBinding,
					summary,
				});
				if (!hasHyperdriveBinding) {
					console.warn(
						"[db] no Hyperdrive binding found (expected HYPERDRIVE_REALTIME/HYPERDRIVE_CACHED). Using DATABASE_URL from vars/secrets instead.",
					);
				}
			}

			if (!appPromise) {
				appPromise = import("./server");
			}

			const appModule = await appPromise;
			return appModule.default.fetch(request, workerEnv, executionContext);
		},
	},
);
