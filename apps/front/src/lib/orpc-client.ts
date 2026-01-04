import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
import type { Router } from "@daily-brain-bits/back/router";

const link = new RPCLink({
  url: () => new URL("/rpc", import.meta.env.VITE_API_URL || "http://localhost:3001"),
  fetch: (request: Request, init: { redirect?: Request["redirect"] }) =>
    fetch(request, {
      ...init,
      credentials: "include",
    }),
});

// Create oRPC client
const client = createORPCClient<RouterClient<Router>>(link);

// Create React Query utilities
export const orpc = createORPCReactQueryUtils(client);
