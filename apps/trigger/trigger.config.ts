import { defineConfig } from "@trigger.dev/sdk/v3";

const project = process.env.TRIGGER_PROJECT_REF;

if (!project) {
	throw new Error("TRIGGER_PROJECT_REF is required for Trigger.dev configuration.");
}

export default defineConfig({
	project,
	dirs: ["./src/tasks"],
	runtime: "node",
});
