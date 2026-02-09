import { describe, expect, test } from "bun:test";
import { createBetterAuthLogger } from "./better-auth-logger";

describe("createBetterAuthLogger", () => {
	test("redacts params tokens in message", () => {
		const logger = createBetterAuthLogger();

		let logged = "";
		const original = console.error;
		console.error = (...args: any[]) => {
			logged = args.map((a) => String(a)).join(" ");
		};

		try {
			logger.log?.(
				"error",
				'Failed query: select * from "session" where token = $1 params: kAnyVwZC0itFWGdGqLwO80NnOvUXcR3V',
			);
		} finally {
			console.error = original;
		}

		expect(logged).toContain("params: [redacted]");
		expect(logged).not.toContain("kAnyVwZC0itFWGdGqLwO80NnOvUXcR3V");
	});
});

