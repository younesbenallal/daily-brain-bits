import { createORPCClient } from "@orpc/client";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
// @ts-expect-error - Workspace import
import type { Router } from "@daily-brain-bits/back/router";

// Create oRPC client
const client = createORPCClient<RouterClient<Router>>({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  fetch: (url, options) => {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

// Create React Query utilities
export const orpc = createORPCReactQueryUtils(client);
