import app from "../server";

// Route everything to this single Bun function (see `apps/back/vercel.json`).
// We recover the original path from `?path=...` and then dispatch to Hono.
export default async function handler(request: Request) {
	const incomingUrl = new URL(request.url);
	const originalPath = incomingUrl.searchParams.get("path") ?? "";

	// Keep any original query string parameters (except `path`).
	incomingUrl.searchParams.delete("path");

	const normalizedPath = `/${originalPath}`.replaceAll(/\/+/g, "/");
	incomingUrl.pathname = normalizedPath === "/api/index" ? "/" : normalizedPath;

	const rewrittenRequest = new Request(incomingUrl.toString(), request);
	return app.fetch(rewrittenRequest);
}

