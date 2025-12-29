import { defineConfig } from "@tanstack/router-plugin/vite";

export default defineConfig({
  routesDirectory: "./src/routes",
  generatedRouteTree: "./src/routeTree.gen.ts",
});
