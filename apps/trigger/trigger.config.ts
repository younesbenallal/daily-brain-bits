import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { defineConfig } from "@trigger.dev/sdk/v3";

const project = process.env.TRIGGER_PROJECT_REF;

if (!project) {
	throw new Error("TRIGGER_PROJECT_REF is required for Trigger.dev configuration.");
}

export default defineConfig({
	project,
	dirs: ["./src/tasks"],
	runtime: "node",
	maxDuration: 900,
	build: {
		extensions: [
			esbuildPlugin(
				sentryEsbuildPlugin({
					org: process.env.SENTRY_ORG,
					project: process.env.SENTRY_PROJECT,
					authToken: process.env.SENTRY_AUTH_TOKEN,
				}),
				{ placement: "last", target: "deploy" },
			),
		],
	},
});
