import * as Sentry from "@sentry/node";
import { tasks } from "@trigger.dev/sdk/v3";

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.NODE_ENV ?? "production",
		defaultIntegrations: false,
		tracesSampleRate: 1.0,
	});

	tasks.onFailure(async ({ error, ctx }) => {
		Sentry.captureException(error, {
			tags: { taskId: ctx.task.id, source: "trigger" },
			extra: { runId: ctx.run.id },
		});
		await Sentry.flush(2000);
	});
}
