import { router } from "@orpc/server";
import { z } from "zod";

// Example router - replace with your actual routes
export const router = router({
  health: {
    check: {
      input: z.void(),
      output: z.object({
        status: z.literal("ok"),
        timestamp: z.string(),
      }),
      handler: async () => {
        return {
          status: "ok" as const,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },
});

export type Router = typeof router;
