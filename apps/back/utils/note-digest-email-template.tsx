import { Body, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text } from "@react-email/components";
import * as React from "react";
import { emailBodyStyle, emailBrand, emailTailwindConfig } from "../domains/email/brand";
import type { DigestFrequency } from "../domains/digest/schedule";

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
			<Tailwind config={emailTailwindConfig}>
				<Head />
				<Preview>{props.previewText}</Preview>
				<Body className="font-body m-0 text-brand-foreground" style={emailBodyStyle}>
					<Section className="py-10">
						<Container className="max-w-[600px] mx-auto px-5">
							<Text className="text-xs text-brand-muted font-ui m-0 mb-3">
								{props.frequencyLabel} digest · {props.digestDate}
							</Text>
							<Heading className="text-[30px] leading-[1.15] font-semibold font-display text-brand-foreground m-0 mb-3">
								Hello {props.greetingName},
							</Heading>
							<Text className="text-[15px] leading-7 text-brand-muted m-0 mb-6">
								Here is your {props.frequencyLabel.toLowerCase()} selection of notes to revisit today.
							</Text>
							<Section className="mb-7">
								{props.items.map((item) => {
									const sourceLabel = formatSourceLabel(item);
									return (
										<Section
											key={item.documentId}
											className="bg-brand-card border border-solid border-brand-border rounded-3xl p-6 mb-6"
											style={{ boxShadow: "var(--email-card-shadow)" }}
										>
											<Text className="text-[22px] font-semibold font-display text-brand-foreground m-0 mb-2">
												{item.title}
											</Text>
											{renderEmailContentBlocks(item.blocks, { keyPrefix: String(item.documentId) })}
											{sourceLabel ? (
												<Text className="text-xs text-brand-muted font-ui m-0 mt-3">
													{sourceLabel}
												</Text>
											) : null}
										</Section>
									);
								})}
							</Section>
							<Section className="mb-7">
								<Link
									href={props.viewUrl}
									className="inline-block px-7 py-3.5 rounded-full bg-brand-primary text-brand-primary-foreground no-underline text-sm font-semibold font-ui shadow-[var(--email-button-shadow)]"
								>
									View this digest in the app
								</Link>
							</Section>
							<Text className="text-xs text-brand-muted font-ui m-0">
								Daily Brain Bits · Sent to help you retain what matters.
							</Text>
						</Container>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}

export function buildExcerpt(content: string): string {
	return buildEmailContent(content).excerpt;
}

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
				<Text key={key} className="text-[15px] font-semibold font-display text-brand-foreground m-0 mb-1">
					{renderTextWithLinks(block.content)}
				</Text>
			);
		}
		if (block.type === "quote") {
			return (
				<Text
					key={key}
					className="text-[14px] leading-7 text-brand-muted m-0 mb-3 pl-3 italic"
					style={{ borderLeft: `3px solid ${emailBrand.colors.border}` }}
				>
					{renderTextWithLinks(block.content)}
				</Text>
			);
		}
		if (block.type === "code") {
			return (
				<Text
					key={key}
					className="text-[13px] leading-6 text-brand-foreground m-0 mb-3 p-3 rounded-xl border border-solid border-brand-border"
					style={{
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
						backgroundColor: "var(--email-code-bg)",
						whiteSpace: "pre-wrap",
					}}
				>
					{block.content}
				</Text>
			);
		}
		if (block.type === "list") {
			return (
				<Section key={key}>
					{block.items.map((item, itemIndex) => (
						<Text key={`${key}-i-${itemIndex}`} className="text-[14px] leading-7 text-brand-muted m-0 mb-1">
							{"• "}
							{renderTextWithLinks(item)}
						</Text>
					))}
				</Section>
			);
		}
		return (
			<Text key={key} className="text-[14px] leading-7 text-brand-muted m-0 mb-3">
				{renderTextWithLinks(block.content)}
			</Text>
		);
	});
}

function renderTextWithLinks(text: string) {
	const urlRegex = /(https?:\/\/[^\s)]+)(\)?)/g;
	const parts: Array<string | React.ReactElement> = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;

	while ((match = urlRegex.exec(text)) !== null) {
		const matchIndex = match.index;
		const url = match[1] ?? "";
		const trailing = match[2] ?? "";

		if (matchIndex > lastIndex) {
			parts.push(text.slice(lastIndex, matchIndex));
		}

		parts.push(
			<Link key={`${url}-${matchIndex}`} href={url} className="text-brand-primary underline underline-offset-2">
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
