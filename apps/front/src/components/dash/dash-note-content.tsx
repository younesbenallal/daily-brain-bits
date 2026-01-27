import { useMemo } from "react";
import { buildObsidianDeepLink, normalizeObsidianContent, splitObsidianWikiLinks } from "@/lib/obsidian-content";
import { cn } from "@/lib/utils";

export type NoteContentProps = {
	content: string;
	sourceKind: "obsidian" | "notion" | null | undefined;
	vaultName: string | null;
};

type ContentBlock =
	| { type: "heading"; content: string; level: number }
	| { type: "paragraph"; content: string }
	| { type: "quote"; content: string }
	| { type: "list"; items: string[] }
	| { type: "code"; content: string };

export function NoteContent({ content, sourceKind, vaultName }: NoteContentProps) {
	const normalizedContent = useMemo(() => normalizeNoteContent(content, sourceKind), [content, sourceKind]);
	const contentBlocks = useMemo(() => parseContentBlocks(normalizedContent), [normalizedContent]);
	const inlineOptions = { sourceKind, vaultName };

	return (
		<div className="max-h-[50vh] space-y-6 overflow-y-auto pr-4 font-body text-[16px] leading-relaxed text-muted-foreground/90 selection:bg-primary/10">
			{contentBlocks.length > 0 ? (
				contentBlocks.map((block, index) => {
					const blockKey = `${block.type}-${index}`;
					if (block.type === "heading") {
						const sizeClass = block.level === 1 ? "text-2xl" : block.level === 2 ? "text-xl" : "text-lg";
						return (
							<h3 key={blockKey} className={cn("font-display font-semibold text-foreground mt-2", sizeClass)}>
								{renderInlineContent(block.content, inlineOptions)}
							</h3>
						);
					}
					if (block.type === "quote") {
						return (
							<blockquote key={blockKey} className="border-l-3 border-primary/20 pl-5 italic text-foreground/70">
								{renderInlineContent(block.content, inlineOptions)}
							</blockquote>
						);
					}
					if (block.type === "list") {
						return (
							<ul key={blockKey} className="space-y-3 pl-5">
								{block.items.map((item, itemIndex) => (
									<li key={`${blockKey}-${itemIndex}`} className="list-disc marker:text-primary/40">
										{renderInlineContent(item, inlineOptions)}
									</li>
								))}
							</ul>
						);
					}
					if (block.type === "code") {
						return (
							<pre
								key={blockKey}
								className="overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-[13px] text-foreground/80"
							>
								{block.content}
							</pre>
						);
					}
					return <p key={blockKey}>{renderInlineContent(block.content, inlineOptions)}</p>;
				})
			) : (
				<p className="italic opacity-60">This note has no readable content.</p>
			)}
		</div>
	);
}

function normalizeNoteContent(content: string, sourceKind: "obsidian" | "notion" | null | undefined): string {
	if (sourceKind !== "obsidian") {
		return content;
	}
	return normalizeObsidianContent(content);
}

function parseContentBlocks(content: string): ContentBlock[] {
	if (!content.trim()) {
		return [];
	}

	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const blocks: ContentBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (!line || !line.trim()) {
			index += 1;
			continue;
		}

		if (line.startsWith("```")) {
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length) {
				const codeLine = lines[index];
				if (!codeLine || codeLine.startsWith("```")) {
					break;
				}
				codeLines.push(codeLine);
				index += 1;
			}
			index += 1;
			blocks.push({ type: "code", content: codeLines.join("\n").trimEnd() });
			continue;
		}

		if (/^#{1,6}\s/.test(line)) {
			const level = line.match(/^#{1,6}/)?.[0].length ?? 1;
			blocks.push({ type: "heading", level, content: line.replace(/^#{1,6}\s*/, "").trim() });
			index += 1;
			continue;
		}

		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (index < lines.length) {
				const quoteLine = lines[index];
				if (!quoteLine || !/^>\s?/.test(quoteLine)) {
					break;
				}
				quoteLines.push(quoteLine.replace(/^>\s?/, "").trim());
				index += 1;
			}
			blocks.push({ type: "quote", content: quoteLines.join(" ") });
			continue;
		}

		if (/^(-|\*|•)\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length) {
				const listLine = lines[index];
				if (!listLine || !/^(-|\*|•)\s+/.test(listLine)) {
					break;
				}
				items.push(listLine.replace(/^(-|\*|•)\s+/, "").trim());
				index += 1;
			}
			blocks.push({ type: "list", items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length) {
			const paragraphLine = lines[index];
			if (!paragraphLine || !paragraphLine.trim()) {
				break;
			}
			paragraph.push(paragraphLine.trim());
			index += 1;
		}
		blocks.push({ type: "paragraph", content: paragraph.join(" ") });
	}

	return blocks;
}

function renderInlineContent(
	content: string,
	options: { sourceKind: "obsidian" | "notion" | null | undefined; vaultName: string | null },
) {
	if (options.sourceKind !== "obsidian" || !content.includes("[[")) {
		return content;
	}
	const parts = splitObsidianWikiLinks(content);
	if (parts.length === 0) {
		return content;
	}
	return parts.map((part, index) => {
		if (part.type === "text") {
			return part.value;
		}
		const href = buildObsidianDeepLink(options.vaultName, part.target);
		if (!href) {
			return part.label;
		}
		return (
			<a
				key={`${part.target}-${index}`}
				href={href}
				className="text-primary underline underline-offset-4 hover:text-primary/80"
				rel="noreferrer"
			>
				{part.label}
			</a>
		);
	});
}
