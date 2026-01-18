import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import type { DigestFrequency } from "./digest-schedule";

export type EmailContentBlock =
	| { type: "heading"; content: string; level: number }
	| { type: "paragraph"; content: string }
	| { type: "quote"; content: string }
	| { type: "list"; items: string[] }
	| { type: "code"; content: string };

export type DigestEmailItem = {
	documentId: number;
	title: string;
	excerpt: string;
	blocks: EmailContentBlock[];
	sourceKind: "obsidian" | "notion" | null;
	sourceName: string | null;
};

export type DigestSnapshot = {
	digestId: number;
	createdAt: Date;
	items: DigestEmailItem[];
};

type DigestEmailProps = {
	frequencyLabel: string;
	greetingName: string;
	digestDate: string;
	viewUrl: string;
	items: DigestEmailItem[];
};

const EXCERPT_MAX_LENGTH = 900;

export function buildDigestEmail(params: { frequency: DigestFrequency; userName?: string | null; frontendUrl: string; digest: DigestSnapshot }): {
	subject: string;
	react: React.ReactElement;
	text: string;
} {
	const itemCount = params.digest.items.length;
	const frequencyLabel = formatFrequencyLabel(params.frequency);
	const subject = `${frequencyLabel} Brain Bits (${itemCount} note${itemCount === 1 ? "" : "s"})`;
	const greetingName = params.userName?.trim() || "there";
	const digestDate = formatDigestDate(params.digest.createdAt);
	const viewUrl = `${params.frontendUrl.replace(/\/$/, "")}/dash`;
	const previewText = buildPreviewText(frequencyLabel, params.digest.items);

	const react = (
		<NoteDigestEmail
			frequencyLabel={frequencyLabel}
			greetingName={greetingName}
			digestDate={digestDate}
			viewUrl={viewUrl}
			items={params.digest.items}
			previewText={previewText}
		/>
	);

	const textItems = params.digest.items
		.map((item) => {
			const sourceLabel = formatSourceLabel(item);
			const sourceSuffix = sourceLabel ? ` (${sourceLabel})` : "";
			return `- ${item.title}${sourceSuffix}\n  ${item.excerpt}`;
		})
		.join("\n\n");

	const text = `Hello ${greetingName},

Here is your ${frequencyLabel.toLowerCase()} selection of notes (${itemCount} total).

${textItems}

View this digest in the app: ${viewUrl}
`;

	return { subject, react, text };
}

export function NoteDigestEmail(props: DigestEmailProps & { previewText: string }) {
	return (
		<Html lang="en">
			<Head>
				<style>{themeStyle}</style>
			</Head>
			<Preview>{props.previewText}</Preview>
			<Body style={styles.body}>
				<Container style={styles.container}>
					<Text style={styles.eyebrow}>
						{props.frequencyLabel} digest · {props.digestDate}
					</Text>
					<Heading style={styles.heading}>Hello {props.greetingName},</Heading>
					<Text style={styles.intro}>Here is your {props.frequencyLabel.toLowerCase()} selection of notes to revisit today.</Text>
					<Section style={styles.notesWrapper}>
						{props.items.map((item) => {
							const sourceLabel = formatSourceLabel(item);
							return (
								<Section key={item.documentId} style={styles.noteCard}>
									<Text style={styles.noteTitle}>{item.title}</Text>
									{renderEmailContentBlocks(item.blocks, { keyPrefix: String(item.documentId) })}
									{sourceLabel ? <Text style={styles.noteSource}>{sourceLabel}</Text> : null}
								</Section>
							);
						})}
					</Section>
					<Section style={styles.ctaWrapper}>
						<Link href={props.viewUrl} style={styles.ctaButton}>
							View this digest in the app
						</Link>
					</Section>
					<Text style={styles.footer}>Daily Brain Bits · Sent to help you retain what matters.</Text>
				</Container>
			</Body>
		</Html>
	);
}

export function buildExcerpt(content: string): string {
	return buildEmailContent(content).excerpt;
}

const themeStyle = `
:root {
  --app-gradient: linear-gradient(180deg, hsl(213 100% 68%) 0%, hsl(214 100% 80%) 100%);
  --background: hsl(214 100% 98%);
  --foreground: hsl(222 20% 18%);
  --muted-foreground: hsl(220 12% 45%);
  --primary: hsl(214 85% 67%);
  --primary-foreground: hsl(210 40% 98%);
  --card: #ffffff;
  --border: hsl(220 14% 92%);
  --shadow-soft: 0 28px 70px rgba(15, 23, 42, 0.12);
  --font-display: "Crimson Pro", "Times New Roman", serif;
  --font-body: "DM Sans", "Helvetica Neue", Arial, sans-serif;
  --font-ui: "Mona Sans", "DM Sans", "Helvetica Neue", Arial, sans-serif;
  --space-xl: 32px;
  --space-lg: 24px;
  --space-md: 16px;
  --space-sm: 12px;
  --space-xs: 6px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --font-xl: 28px;
  --font-lg: 20px;
  --font-md: 16px;
  --font-sm: 15px;
  --font-xs: 12px;
}
`;

const styles = {
	body: {
		backgroundColor: "var(--background)",
		backgroundImage: "var(--app-gradient)",
		fontFamily: "var(--font-body, 'DM Sans', 'Helvetica Neue', Arial, sans-serif)",
		margin: "0",
		padding: "var(--space-xl) 0",
		color: "var(--foreground)",
	},
	container: {
		maxWidth: "600px",
	},
	eyebrow: {
		fontSize: "var(--font-xs)",
		color: "var(--muted-foreground)",
		margin: "0 0 var(--space-sm) 0",
		fontFamily: "var(--font-ui, 'Mona Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif)",
	},
	heading: {
		fontSize: "var(--font-xl)",
		fontWeight: "600",
		margin: "0 0 var(--space-sm) 0",
		color: "var(--foreground)",
		fontFamily: "var(--font-display, 'Crimson Pro', 'Times New Roman', serif)",
	},
	intro: {
		fontSize: "var(--font-md)",
		lineHeight: "1.7",
		margin: "0 0 var(--space-lg) 0",
		color: "var(--muted-foreground)",
	},
	notesWrapper: {
		margin: "0 0 var(--space-lg) 0",
	},
	noteCard: {
		backgroundColor: "var(--card)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-lg)",
		boxShadow: "var(--shadow-soft)",
		padding: "var(--space-md)",
		marginBottom: "var(--space-md)",
	},
	noteTitle: {
		fontSize: "var(--font-lg)",
		fontWeight: "600",
		margin: "0 0 var(--space-xs) 0",
		color: "var(--foreground)",
		fontFamily: "var(--font-display, 'Crimson Pro', 'Times New Roman', serif)",
	},
	noteParagraph: {
		fontSize: "var(--font-sm)",
		lineHeight: "1.7",
		margin: "0 0 var(--space-sm) 0",
		color: "var(--muted-foreground)",
		wordBreak: "break-word",
		overflowWrap: "anywhere",
	},
	noteHeading: {
		fontSize: "var(--font-md)",
		fontWeight: "700",
		margin: "0 0 var(--space-xs) 0",
		color: "var(--foreground)",
		fontFamily: "var(--font-display, 'Crimson Pro', 'Times New Roman', serif)",
	},
	noteQuote: {
		fontSize: "var(--font-sm)",
		lineHeight: "1.7",
		margin: "0 0 var(--space-sm) 0",
		color: "var(--muted-foreground)",
		borderLeft: "3px solid var(--border)",
		paddingLeft: "12px",
		fontStyle: "italic",
	},
	noteCode: {
		fontSize: "13px",
		lineHeight: "1.6",
		margin: "0 0 var(--space-sm) 0",
		color: "var(--foreground)",
		backgroundColor: "rgba(255,255,255,0.6)",
		border: "1px solid var(--border)",
		borderRadius: "12px",
		padding: "12px",
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
		overflowWrap: "anywhere",
	},
	noteListItem: {
		fontSize: "var(--font-sm)",
		lineHeight: "1.7",
		margin: "0 0 6px 0",
		color: "var(--muted-foreground)",
		wordBreak: "break-word",
		overflowWrap: "anywhere",
	},
	inlineLink: {
		color: "var(--primary)",
		textDecoration: "underline",
		textUnderlineOffset: "3px",
	},
	noteSource: {
		fontSize: "var(--font-xs)",
		textTransform: "uppercase",
		letterSpacing: "0.12em",
		margin: "0",
		color: "var(--muted-foreground)",
		fontFamily: "var(--font-ui, 'Mona Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif)",
	},
	ctaWrapper: {
		margin: "0 0 var(--space-lg) 0",
	},
	ctaButton: {
		display: "inline-block",
		padding: "12px 22px",
		borderRadius: "var(--radius-pill)",
		backgroundColor: "var(--primary)",
		color: "var(--primary-foreground)",
		textDecoration: "none",
		fontSize: "var(--font-sm)",
		fontWeight: "600",
		fontFamily: "var(--font-ui, 'Mona Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif)",
	},
	footer: {
		fontSize: "var(--font-xs)",
		color: "var(--muted-foreground)",
		margin: "0",
		fontFamily: "var(--font-ui, 'Mona Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif)",
	},
} satisfies Record<string, React.CSSProperties>;

function buildPreviewText(frequencyLabel: string, items: DigestEmailItem[]): string {
	if (items.length === 0) {
		return `${frequencyLabel} Brain Bits are ready.`;
	}
	const firstTitle = items[0]?.title?.trim() || "your notes";
	return `${frequencyLabel} Brain Bits: ${firstTitle}`;
}

function truncateText(input: string, maxLength: number): string {
	if (input.length <= maxLength) {
		return input;
	}
	return `${input.slice(0, maxLength - 3).trim()}...`;
}

function stripLeadingMetadata(input: string): string {
	const lines = input.split("\n");
	const result: string[] = [];
	let skipping = true;

	for (const line of lines) {
		const trimmed = line.trim();
		if (skipping) {
			if (!trimmed) {
				skipping = false;
				result.push("");
				continue;
			}
			if (isMetadataLine(trimmed)) {
				continue;
			}
			skipping = false;
		}
		result.push(line);
	}

	return result.join("\n");
}

function isMetadataLine(line: string): boolean {
	return (
		/^tags?\s*:/i.test(line) ||
		/^tags?\s*::/i.test(line) ||
		/^aliases?\s*:/i.test(line) ||
		/^aliases?\s*::/i.test(line) ||
		/^cssclass\s*:/i.test(line) ||
		/^cssclass\s*::/i.test(line) ||
		/^status\s*:/i.test(line) ||
		/^status\s*::/i.test(line) ||
		/^created\s*:/i.test(line) ||
		/^created\s*::/i.test(line) ||
		/^updated\s*:/i.test(line) ||
		/^updated\s*::/i.test(line) ||
		/^publish\s*:/i.test(line) ||
		/^publish\s*::/i.test(line) ||
		/^draft\s*:/i.test(line)
	);
}

export function buildEmailContent(content: string): { excerpt: string; blocks: EmailContentBlock[] } {
	const normalized = normalizeForEmail(content);
	const blocks = parseEmailContentBlocks(normalized);
	const trimmedBlocks = trimBlocksToMaxLength(blocks, EXCERPT_MAX_LENGTH);
	const excerpt = blocksToText(trimmedBlocks);
	return {
		excerpt: excerpt.length > 0 ? excerpt : "No preview available.",
		blocks: trimmedBlocks.length > 0 ? trimmedBlocks : [{ type: "paragraph", content: "No preview available." }],
	};
}

function normalizeForEmail(input: string): string {
	let output = input.replace(/\r\n/g, "\n");
	output = output.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, "");
	output = output.replace(/^\s*-{2,}\s*tags?:.*?-{2,}\s*$/gim, "");
	output = output.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_match, target, _pipe, label) => label ?? target);
	output = output.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
	output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");
	output = output.replace(/<[^>]+>/g, "");
	output = stripLeadingMetadata(output);
	output = output.replace(/^\s*(tags|aliases|cssclass|status|created|updated|publish|draft)\s*::.*$/gim, "");
	output = output
		.split("\n")
		.map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
		.join("\n");
	output = output.replace(/\n{3,}/g, "\n\n");
	return output.trim();
}

function parseEmailContentBlocks(content: string): EmailContentBlock[] {
	if (!content.trim()) {
		return [];
	}

	const lines = content.split("\n");
	const blocks: EmailContentBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (!line?.trim()) {
			index += 1;
			continue;
		}

		if (line.startsWith("```")) {
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && lines[index] && !lines[index]!.startsWith("```")) {
				codeLines.push(lines[index]!);
				index += 1;
			}
			index += 1;
			blocks.push({ type: "code", content: codeLines.join("\n").trimEnd() });
			continue;
		}

		if (/^#{1,6}\s/.test(line)) {
			const level = line.match(/^#{1,6}/)?.[0]?.length ?? 1;
			blocks.push({ type: "heading", level, content: line.replace(/^#{1,6}\s*/, "").trim() });
			index += 1;
			continue;
		}

		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (index < lines.length && lines[index] && /^>\s?/.test(lines[index]!)) {
				quoteLines.push(lines[index]!.replace(/^>\s?/, "").trim());
				index += 1;
			}
			blocks.push({ type: "quote", content: quoteLines.join("\n").trim() });
			continue;
		}

		if (/^(-|\*|•)\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && lines[index] && /^(-|\*|•)\s+/.test(lines[index]!)) {
				items.push(lines[index]!.replace(/^(-|\*|•)\s+/, "").trim());
				index += 1;
			}
			blocks.push({ type: "list", items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length && lines[index]?.trim()) {
			paragraph.push(lines[index]!.trim());
			index += 1;
		}
		blocks.push({ type: "paragraph", content: paragraph.join(" ") });
	}

	return blocks;
}

function blocksToText(blocks: EmailContentBlock[]): string {
	const parts: string[] = [];
	for (const block of blocks) {
		if (block.type === "list") {
			parts.push(block.items.map((item) => `- ${item}`).join("\n"));
			continue;
		}
		parts.push(block.content);
	}
	return parts.join("\n\n").trim();
}

function trimBlocksToMaxLength(blocks: EmailContentBlock[], maxLength: number): EmailContentBlock[] {
	const result: EmailContentBlock[] = [];
	let remaining = maxLength;

	for (const block of blocks) {
		if (remaining <= 0) {
			break;
		}

		if (block.type === "list") {
			const items: string[] = [];
			for (const item of block.items) {
				if (remaining <= 0) {
					break;
				}
				if (item.length + 2 <= remaining) {
					items.push(item);
					remaining -= item.length + 2;
					continue;
				}
				items.push(truncateText(item, remaining));
				remaining = 0;
				break;
			}
			if (items.length > 0) {
				result.push({ type: "list", items });
			}
			continue;
		}

		if (block.content.length <= remaining) {
			result.push(block);
			remaining -= block.content.length + 2;
			continue;
		}

		result.push({ ...block, content: truncateText(block.content, remaining) });
		break;
	}

	return result;
}

function renderEmailContentBlocks(blocks: EmailContentBlock[], options: { keyPrefix: string }) {
	return blocks.map((block, index) => {
		const key = `${options.keyPrefix}-b-${index}`;
		if (block.type === "heading") {
			return (
				<Text key={key} style={styles.noteHeading}>
					{renderTextWithLinks(block.content)}
				</Text>
			);
		}
		if (block.type === "quote") {
			return (
				<Text key={key} style={styles.noteQuote}>
					{renderTextWithLinks(block.content)}
				</Text>
			);
		}
		if (block.type === "code") {
			return (
				<Text key={key} style={styles.noteCode}>
					{block.content}
				</Text>
			);
		}
		if (block.type === "list") {
			return (
				<Section key={key}>
					{block.items.map((item, itemIndex) => (
						<Text key={`${key}-i-${itemIndex}`} style={styles.noteListItem}>
							{"• "}
							{renderTextWithLinks(item)}
						</Text>
					))}
				</Section>
			);
		}
		return (
			<Text key={key} style={styles.noteParagraph}>
				{renderTextWithLinks(block.content)}
			</Text>
		);
	});
}

function renderTextWithLinks(text: string) {
	const urlRegex = /(https?:\/\/[^\s)]+)(\)?)/g;
	const parts: Array<string | React.ReactElement> = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = urlRegex.exec(text)) !== null) {
		const matchIndex = match.index;
		const url = match[1] ?? "";
		const trailing = match[2] ?? "";

		if (matchIndex > lastIndex) {
			parts.push(text.slice(lastIndex, matchIndex));
		}

		parts.push(
			<Link key={`${url}-${matchIndex}`} href={url} style={styles.inlineLink}>
				{url}
			</Link>,
		);

		if (trailing && trailing !== ")") {
			parts.push(trailing);
		}

		lastIndex = matchIndex + (match[0]?.length ?? 0);
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return <>{parts}</>;
}

function formatSourceLabel(item: DigestEmailItem): string {
	if (!item.sourceKind) {
		return "";
	}
	if (item.sourceKind === "obsidian") {
		return item.sourceName ? `Obsidian · ${item.sourceName}` : "Obsidian";
	}
	return item.sourceName ? `Notion · ${item.sourceName}` : "Notion";
}

function formatDigestDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatFrequencyLabel(frequency: DigestFrequency): string {
	if (frequency === "weekly") {
		return "Weekly";
	}
	if (frequency === "monthly") {
		return "Monthly";
	}
	return "Daily";
}
