import { describe, expect, it } from "bun:test";
import {
	buildObsidianDeepLink,
	normalizeObsidianContent,
	splitObsidianWikiLinks,
	stripObsidianDataviewBlocks,
	stripObsidianFrontmatter,
} from "./obsidian-content";

describe("obsidian content helpers", () => {
	it("strips frontmatter blocks", () => {
		const input = ["---", "title: Hello", "tags:", "- test", "---", "", "# Heading"].join("\n");
		expect(stripObsidianFrontmatter(input)).toBe("# Heading");
	});

	it("removes dataview code blocks", () => {
		const input = ["Intro", "```dataview", "table file.name", "```", "Next"].join("\n");
		expect(stripObsidianDataviewBlocks(input)).toBe("Intro\n\nNext");
	});

	it("keeps non-dataview code blocks", () => {
		const input = ["Intro", "```ts", "const a = 1;", "```", "Next"].join("\n");
		expect(stripObsidianDataviewBlocks(input)).toBe(input);
	});

	it("normalizes obsidian content with both transforms", () => {
		const input = ["---", "title: Hello", "---", "```dataview", "table file.name", "```", "Content"].join("\n");
		expect(normalizeObsidianContent(input)).toBe("Content");
	});

	it("splits wiki links into text and link parts", () => {
		const parts = splitObsidianWikiLinks("See [[Note]] and [[Folder/Deep|Alias]].");
		expect(parts).toEqual([
			{ type: "text", value: "See " },
			{ type: "link", label: "Note", target: "Note" },
			{ type: "text", value: " and " },
			{ type: "link", label: "Alias", target: "Folder/Deep" },
			{ type: "text", value: "." },
		]);
	});

	it("ignores embedded wiki links", () => {
		const parts = splitObsidianWikiLinks("Image ![[photo]]");
		expect(parts).toEqual([{ type: "text", value: "Image ![[photo]]" }]);
	});

	it("builds obsidian deep links", () => {
		expect(buildObsidianDeepLink("My Vault", "Folder/Note")).toBe(
			"obsidian://open?vault=My%20Vault&file=Folder%2FNote",
		);
	});
});
