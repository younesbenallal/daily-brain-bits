import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
	plugins: [tailwindcss(), react(), TanStackRouterVite()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 3000,
		proxy: {
			"/rpc": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
});
