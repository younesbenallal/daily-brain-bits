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

export default {
	async fetch(request: any, workerEnv: WorkerEnv, executionContext: any) {
		writeProcessEnv(workerEnv);

		if (!appPromise) {
			appPromise = import("./server");
		}

		const appModule = await appPromise;
		return appModule.default.fetch(request, workerEnv, executionContext);
	},
};
