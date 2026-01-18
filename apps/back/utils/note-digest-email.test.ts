import { describe, expect, it } from "bun:test";
import React from "react";
import { render } from "@react-email/render";
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
					blocks: [{ type: "paragraph" as const, content: "Short excerpt." }],
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
		expect(React.isValidElement(result.react)).toBe(true);
		expect(result.text).toContain("http://localhost:3000/dash");
	});

	it("escapes HTML in titles", async () => {
		const digest = {
			digestId: 2,
			createdAt: new Date("2024-01-05T10:00:00Z"),
			items: [
				{
					documentId: 12,
					title: "Risk <script>",
					excerpt: "Safe text",
					blocks: [{ type: "paragraph" as const, content: "Safe text" }],
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

		const html = await render(result.react);
		expect(html).toContain("Risk &lt;script&gt;");
	});

	it("linkifies URLs in content blocks", async () => {
		const digest = {
			digestId: 3,
			createdAt: new Date("2024-01-05T10:00:00Z"),
			items: [
				{
					documentId: 13,
					title: "Links",
					excerpt: "See https://example.com/docs for more.",
					blocks: [{ type: "paragraph" as const, content: "See https://example.com/docs for more." }],
					sourceKind: "notion" as const,
					sourceName: "Notes",
				},
			],
		};

		const result = buildDigestEmail({
			frequency: "daily",
			userName: null,
			frontendUrl: "http://localhost:3000",
			digest,
		});

		const html = await render(result.react);
		expect(html).toContain('href="https://example.com/docs"');
	});

	it("buildExcerpt strips markdown and truncates long text", () => {
		const longText = `---
tags: status/node
---

# Title
Intro paragraph.

Second paragraph with a [[Link|Label]].

` + "a".repeat(950);
		const excerpt = buildExcerpt(longText);
		expect(excerpt).toContain("Intro paragraph.");
		expect(excerpt).toContain("Label");
		expect(excerpt).not.toContain("tags:");
		expect(excerpt.length).toBeLessThanOrEqual(900);
		expect(excerpt.endsWith("...")).toBe(true);
	});

	it("buildExcerpt falls back when content stripped out", () => {
		const excerpt = buildExcerpt("```code block```");
		expect(excerpt).toBe("No preview available.");
	});
});
