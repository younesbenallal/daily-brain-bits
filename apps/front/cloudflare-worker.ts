type AssetsBinding = {
	fetch: (request: Request) => Promise<Response>;
};

type WorkerEnv = {
	ASSETS: AssetsBinding;
};

const isSpaRequest = (request: Request, pathname: string, responseStatus: number) => {
	if (responseStatus !== 404) {
		return false;
	}

	if (request.method !== "GET" && request.method !== "HEAD") {
		return false;
	}

	return !pathname.includes(".");
};

export default {
	async fetch(request: Request, env: WorkerEnv) {
		const url = new URL(request.url);
		const response = await env.ASSETS.fetch(request);

		if (!isSpaRequest(request, url.pathname, response.status)) {
			return response;
		}

		const indexUrl = new URL("/index.html", url);
		const indexRequest = new Request(indexUrl.toString(), request);
		return env.ASSETS.fetch(indexRequest);
	},
};
