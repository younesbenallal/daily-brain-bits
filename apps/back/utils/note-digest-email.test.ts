import { describe, expect, it } from "bun:test";
import { buildDigestEmail, buildExcerpt } from "./note-digest-email-template";

describe("note-digest-email", () => {
	it("builds subject and app link", () => {
		const digest = {
			digestId: 1,
			createdAt: new Date("2024-01-05T10:00:00Z"),
			items: [
				{
					documentId: 11,
					title: "Learning loops",
					excerpt: "Short excerpt.",
					sourceKind: "notion" as const,
					sourceName: "Study Notes",
				},
			],
		};

		const result = buildDigestEmail({
			frequency: "daily",
			userName: "Sam",
			frontendUrl: "http://localhost:3000",
			digest,
		});

		expect(result.subject).toBe("Daily Brain Bits (1 note)");
		expect(result.html).toContain("View this digest in the app");
		expect(result.html).toContain("http://localhost:3000/dash");
		expect(result.text).toContain("http://localhost:3000/dash");
	});

	it("escapes HTML in titles", () => {
		const digest = {
			digestId: 2,
			createdAt: new Date("2024-01-05T10:00:00Z"),
			items: [
				{
					documentId: 12,
					title: "Risk <script>",
					excerpt: "Safe text",
					sourceKind: "obsidian" as const,
					sourceName: "Vault",
				},
			],
		};

		const result = buildDigestEmail({
			frequency: "weekly",
			userName: null,
			frontendUrl: "https://app.example.com",
			digest,
		});

		expect(result.html).toContain("Risk &lt;script&gt;");
	});

	it("buildExcerpt strips markdown and truncates long text", () => {
		const longText = "# Title\n" + "a".repeat(900);
		const excerpt = buildExcerpt(longText);
		expect(excerpt).toContain("a");
		expect(excerpt.length).toBeLessThanOrEqual(640);
		expect(excerpt.endsWith("...")).toBe(true);
	});

	it("buildExcerpt falls back when content stripped out", () => {
		const excerpt = buildExcerpt("```code block```");
		expect(excerpt).toBe("No preview available.");
	});
});
