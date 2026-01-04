import { APIErrorCode, Client, isNotionClientError } from "@notionhq/client";

export type NotionRetryOptions = {
  maxRetries?: number;
  minIntervalMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

type RequestFn<T> = () => Promise<T>;

type RateLimiter = () => Promise<void>;

export function createNotionClient(auth: string): Client {
  return new Client({ auth });
}

export function createNotionRequest(
  options: NotionRetryOptions = {}
): <T>(fn: RequestFn<T>) => Promise<T> {
  const limiter = createRateLimiter(options.minIntervalMs ?? 350);
  const maxRetries = options.maxRetries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 10_000;

  return async function request<T>(fn: RequestFn<T>): Promise<T> {
    let attempt = 0;

    while (true) {
      await limiter();
      try {
        return await fn();
      } catch (error: unknown) {
        if (isNotionClientError(error)) {
          if (error.code === APIErrorCode.RateLimited) {
            attempt += 1;
            if (attempt > maxRetries) {
              throw error;
            }

            const retryAfterMs = parseRetryAfterMs(error);
            const backoffMs = Math.min(
              maxDelayMs,
              retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1)
            );

            await sleep(backoffMs);
            continue;
          }
        }
        throw error;
      }
    }
  };
}

function createRateLimiter(minIntervalMs: number): RateLimiter {
  let lastRequestAt = 0;

  return async () => {
    const now = Date.now();
    const elapsed = now - lastRequestAt;
    const waitMs = Math.max(0, minIntervalMs - elapsed);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestAt = Date.now();
  };
}

function parseRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  if (!("headers" in error)) {
    return null;
  }

  const headers = (error as { headers?: Record<string, string> }).headers;
  if (!headers) {
    return null;
  }

  const retryAfter = headers["retry-after"] ?? headers["Retry-After"];
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isNaN(seconds)) {
    return null;
  }

  return Math.max(0, seconds) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
