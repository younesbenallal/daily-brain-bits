import { createHash } from "node:crypto";

const trailingWhitespace = /[\t ]+$/gm;
const lineEndings = /\r\n?/g;
const extraBlankLines = /\n{3,}/g;

export function normalizeForHash(markdown: string): string {
	const normalized = markdown.replace(lineEndings, "\n");
	const trimmedLines = normalized.replace(trailingWhitespace, "");
	return trimmedLines.replace(extraBlankLines, "\n\n");
}

export function sha256Hex(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}
