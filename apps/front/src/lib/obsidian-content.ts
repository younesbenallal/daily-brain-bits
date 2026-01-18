export type ObsidianInlinePart =
	| { type: "text"; value: string }
	| { type: "link"; label: string; target: string };

export function normalizeObsidianContent(content: string): string {
	return stripObsidianDataviewBlocks(stripObsidianFrontmatter(content));
}

export function stripObsidianFrontmatter(content: string): string {
	if (!content) {
		return content;
	}
	const normalized = content.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	if (lines[0]?.trim() !== "---") {
		return content;
	}
	let endIndex = -1;
	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i]?.trim();
		if (line === "---" || line === "...") {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) {
		return content;
	}
	const remaining = lines
		.slice(endIndex + 1)
		.join("\n")
		.replace(/^\n+/, "");
	return remaining;
}

export function stripObsidianDataviewBlocks(content: string): string {
	if (!content) {
		return content;
	}
	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const kept: string[] = [];
	let skipping = false;

	for (const line of lines) {
		const trimmed = line.trim().toLowerCase();
		if (!skipping && trimmed.startsWith("```dataview")) {
			skipping = true;
			if (kept.length > 0 && kept[kept.length - 1]?.trim()) {
				kept.push("");
			}
			continue;
		}

		if (skipping) {
			if (trimmed.startsWith("```")) {
				skipping = false;
			}
			continue;
		}

		kept.push(line);
	}

	return kept.join("\n");
}

export function splitObsidianWikiLinks(content: string): ObsidianInlinePart[] {
	if (!content) {
		return [];
	}

	const parts: ObsidianInlinePart[] = [];
	let position = 0;

	const pushText = (value: string) => {
		if (!value) {
			return;
		}
		const last = parts[parts.length - 1];
		if (last?.type === "text") {
			last.value += value;
			return;
		}
		parts.push({ type: "text", value });
	};

	while (position < content.length) {
		const start = content.indexOf("[[", position);
		if (start === -1) {
			pushText(content.slice(position));
			break;
		}

		if (start > position) {
			pushText(content.slice(position, start));
		}

		const isEmbed = start > 0 && content[start - 1] === "!";
		if (isEmbed) {
			const end = content.indexOf("]]", start + 2);
			if (end === -1) {
				pushText(content.slice(start));
				break;
			}
			pushText(content.slice(start, end + 2));
			position = end + 2;
			continue;
		}

		const end = content.indexOf("]]", start + 2);
		if (end === -1) {
			pushText(content.slice(start));
			break;
		}

		const raw = content.slice(start + 2, end);
		const [targetRaw, aliasRaw] = raw.split("|", 2);
		const target = targetRaw?.trim();
		if (!target) {
			pushText(content.slice(start, end + 2));
			position = end + 2;
			continue;
		}

		const label = (aliasRaw ? aliasRaw.trim() : target).trim();
		const cleanedTarget = target.endsWith(".md") ? target.slice(0, -3) : target;
		const cleanedLabel = label.endsWith(".md") ? label.slice(0, -3) : label;

		parts.push({
			type: "link",
			label: cleanedLabel || cleanedTarget,
			target: cleanedTarget,
		});
		position = end + 2;
	}

	return parts;
}

export function buildObsidianDeepLink(vaultName: string | null | undefined, target: string): string | null {
	const normalizedVault = vaultName?.trim();
	const normalizedTarget = target.trim();
	if (!normalizedVault || !normalizedTarget) {
		return null;
	}
	return `obsidian://open?vault=${encodeURIComponent(normalizedVault)}&file=${encodeURIComponent(normalizedTarget)}`;
}
