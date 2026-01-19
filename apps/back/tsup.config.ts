import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "server.ts" },
	format: ["esm"],
	target: "node20",
	outDir: ".",
	clean: false,
	// Bundle workspace packages (they use workspace: protocol)
	noExternal: [
		"@daily-brain-bits/auth",
		"@daily-brain-bits/core",
		"@daily-brain-bits/db",
		"@daily-brain-bits/integrations-notion",
		"@daily-brain-bits/integrations-obsidian",
		"@daily-brain-bits/types",
	],
	sourcemap: true,
	// For React email templates
	esbuildOptions(options) {
		options.jsx = "automatic";
	},
});
