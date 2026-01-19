import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "app.ts" },
	format: ["esm"],
	target: "esnext", // For Bun runtime
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
	// Mark Bun as external so it uses runtime's built-in
	external: ["bun"],
	sourcemap: true,
	// For React email templates
	esbuildOptions(options) {
		options.jsx = "automatic";
	},
});
