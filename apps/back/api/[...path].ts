import app from "../server";

// Vercel serves Functions under `/api/*`. We rewrite all incoming requests to
// `/api/<path>` (see `apps/back/vercel.json`), then strip the `/api` prefix so
// the Hono app can keep its natural routing (e.g. `/rpc`, `/webhooks/resend`).
//
// Exception: Better Auth is mounted at `/api/auth/*`, so we keep that prefix.
export default async function handler(request: Request) {
	const url = new URL(request.url);

	if (!url.pathname.startsWith("/api/auth")) {
		if (url.pathname === "/api") url.pathname = "/";
		else if (url.pathname.startsWith("/api/")) url.pathname = url.pathname.slice("/api".length);
	}

	const rewrittenRequest = new Request(url.toString(), request);
	return app.fetch(rewrittenRequest);
}
