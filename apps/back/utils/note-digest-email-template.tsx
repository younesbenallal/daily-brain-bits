import { formatIntervalLabel } from "@daily-brain-bits/core";
import { Body, Container, Font, Head, Heading, Html, Link, Preview, Section, Tailwind, Text } from "@react-email/components";
import type * as React from "react";
import { emailBodyStyle, emailBrand, emailGoogleFontsUrl, emailGradientWrapperStyle, emailTailwindConfig } from "../domains/email/brand";

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
	settingsUrl: string;
	items: DigestEmailItem[];
	isFirstDigest: boolean;
	totalNoteCount: number;
	sourceLabel: string | null;
	isPro: boolean;
	founderEmail: string;
};

const EXCERPT_MAX_LENGTH = 900;

type BuildDigestEmailParams = {
	/** Days between digests (1 = daily, 7 = weekly, etc.) */
	intervalDays: number;
	userName?: string | null;
	frontendUrl: string;
	digest: DigestSnapshot;
	isFirstDigest?: boolean;
	totalNoteCount?: number;
	sourceLabel?: string | null;
	isPro?: boolean;
	founderEmail?: string;
};

export function buildDigestEmail(params: BuildDigestEmailParams): {
	subject: string;
	react: React.ReactElement;
	text: string;
} {
	const itemCount = params.digest.items.length;
	const frequencyLabel = formatIntervalLabel(params.intervalDays);
	const isFirstDigest = params.isFirstDigest ?? false;
	const subject = isFirstDigest
		? `Your first Brain Bits are ready! (${itemCount} note${itemCount === 1 ? "" : "s"})`
		: `${frequencyLabel} Brain Bits (${itemCount} note${itemCount === 1 ? "" : "s"})`;
	const greetingName = params.userName?.trim() || "there";
	const digestDate = formatDigestDate(params.digest.createdAt);
	const baseUrl = params.frontendUrl.replace(/\/$/, "");
	const viewUrl = `${baseUrl}/dash`;
	const settingsUrl = `${baseUrl}/settings`;
	const previewText = isFirstDigest
		? `Your first Brain Bits: ${params.digest.items[0]?.title ?? "your notes"}`
		: buildPreviewText(frequencyLabel, params.digest.items);
	const totalNoteCount = params.totalNoteCount ?? 0;
	const sourceLabel = params.sourceLabel ?? null;
	const isPro = params.isPro ?? false;
	const founderEmail = params.founderEmail ?? "younes@notionist.app";

	const react = (
		<NoteDigestEmail
			frequencyLabel={frequencyLabel}
			greetingName={greetingName}
			digestDate={digestDate}
			viewUrl={viewUrl}
			settingsUrl={settingsUrl}
			items={params.digest.items}
			previewText={previewText}
			isFirstDigest={isFirstDigest}
			totalNoteCount={totalNoteCount}
			sourceLabel={sourceLabel}
			isPro={isPro}
			founderEmail={founderEmail}
		/>
	);

	const text = buildDigestTextContent({
		greetingName,
		frequencyLabel,
		itemCount,
		items: params.digest.items,
		viewUrl,
		settingsUrl,
		isFirstDigest,
		totalNoteCount,
		sourceLabel,
		isPro,
		founderEmail,
	});

	return { subject, react, text };
}

function buildDigestTextContent(params: {
	greetingName: string;
	frequencyLabel: string;
	itemCount: number;
	items: DigestEmailItem[];
	viewUrl: string;
	settingsUrl: string;
	isFirstDigest: boolean;
	totalNoteCount: number;
	sourceLabel: string | null;
	isPro: boolean;
	founderEmail: string;
}): string {
	const textItems = params.items
		.map((item) => {
			const sourceLabel = formatSourceLabel(item);
			const sourceSuffix = sourceLabel ? ` (${sourceLabel})` : "";
			return `- ${item.title}${sourceSuffix}\n  ${item.excerpt}`;
		})
		.join("\n\n");

	if (params.isFirstDigest) {
		const sourceContext = params.sourceLabel ? ` from your ${params.sourceLabel}` : "";
		const noteCountContext = params.totalNoteCount > 0 ? ` out of ${params.totalNoteCount} synced notes` : "";

		let text = `Your first Brain Bits are ready, ${params.greetingName}!

We've surfaced ${params.itemCount} notes${sourceContext}${noteCountContext} using spaced repetition — designed to help you retain what matters.

${textItems}

View this digest in the app: ${params.viewUrl}

What happens next:
- You'll receive your next digest ${params.isPro ? "based on your frequency setting" : "weekly (or upgrade to Pro for daily)"}
- Star notes you want to see more often, skip ones that aren't worth revisiting
- Adjust your timing and preferences: ${params.settingsUrl}`;

		if (!params.isPro) {
			text += `

Want daily digests instead of weekly? Upgrade to Pro for daily frequency, AI quizzes, and multiple sources: ${params.settingsUrl}?tab=billing`;
		}

		text += `

Questions or feedback? Just reply to this email — I read every message.

— Younes`;

		return text;
	}

	return `Hello ${params.greetingName},

Here is your ${params.frequencyLabel.toLowerCase()} selection of notes (${params.itemCount} total).

${textItems}

View this digest in the app: ${params.viewUrl}
`;
}

export function NoteDigestEmail(props: DigestEmailProps & { previewText: string }) {
	return (
		<Html lang="en">
			<Tailwind config={emailTailwindConfig}>
				<Head>
					<Font
						fontFamily="Crimson Pro"
						fallbackFontFamily="Georgia"
						webFont={{ url: emailGoogleFontsUrl, format: "woff2" }}
						fontWeight={600}
						fontStyle="normal"
					/>
				</Head>
				<Preview>{props.previewText}</Preview>
				<Body className="font-body m-0 text-brand-foreground" style={emailBodyStyle}>
					{/* Gmail strips gradients from body, so we use a wrapper Section */}
					<Section style={emailGradientWrapperStyle}>
						<Container className="max-w-[600px] mx-auto px-5 py-10">
							<Text className="text-xs text-brand-muted-on-blue font-ui m-0 mb-3">
								{props.isFirstDigest ? "Your first digest" : `${props.frequencyLabel} digest`} · {props.digestDate}
							</Text>
							<Heading className="text-[30px] leading-[1.15] font-semibold font-display text-brand-foreground m-0 mb-3">
								{props.isFirstDigest ? `Your first Brain Bits are ready, ${props.greetingName}!` : `Hello ${props.greetingName},`}
							</Heading>
							{props.isFirstDigest ? (
								<FirstDigestIntro itemCount={props.items.length} totalNoteCount={props.totalNoteCount} sourceLabel={props.sourceLabel} />
							) : (
								<Text className="text-[15px] leading-7 text-brand-muted-on-blue m-0 mb-6">
									Here is your {props.frequencyLabel.toLowerCase()} selection of notes to revisit today.
								</Text>
							)}
							<Section className="mb-7">
								{props.items.map((item) => {
									const sourceLabel = formatSourceLabel(item);
									return (
										<Section
											key={item.documentId}
											className="bg-brand-card border border-solid border-brand-border rounded-3xl p-6 mb-6"
											style={{ boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)" }}
										>
											<Text className="text-[22px] font-semibold font-display text-brand-foreground m-0 mb-2">{item.title}</Text>
											{renderEmailContentBlocks(item.blocks, { keyPrefix: String(item.documentId) })}
											{sourceLabel ? <Text className="text-xs text-brand-muted font-ui m-0 mt-3">{sourceLabel}</Text> : null}
										</Section>
									);
								})}
							</Section>
							<Section className="mb-7">
								<Link
									href={props.viewUrl}
									className="inline-block px-7 py-3.5 rounded-full bg-brand-primary text-brand-primary-foreground no-underline text-sm font-semibold font-ui"
									style={{ boxShadow: "0 12px 24px rgba(37, 86, 160, 0.25)" }}
								>
									View this digest in the app
								</Link>
							</Section>
							{props.isFirstDigest && <FirstDigestFooter isPro={props.isPro} settingsUrl={props.settingsUrl} founderEmail={props.founderEmail} />}
							<Text className="text-xs text-brand-muted-on-blue font-ui m-0">Daily Brain Bits · Sent to help you retain what matters.</Text>
						</Container>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}

function FirstDigestIntro(props: { itemCount: number; totalNoteCount: number; sourceLabel: string | null }) {
	const sourceContext = props.sourceLabel ? ` from your ${props.sourceLabel}` : "";
	const noteCountContext = props.totalNoteCount > 0 ? ` out of ${props.totalNoteCount} synced notes` : "";

	return (
		<Section className="mb-6">
			<Text className="text-[15px] leading-7 text-brand-muted-on-blue m-0 mb-4">
				We've surfaced <strong>{props.itemCount} notes</strong>
				{sourceContext}
				{noteCountContext} using spaced repetition — designed to help you retain what matters.
			</Text>
		</Section>
	);
}

function FirstDigestFooter(props: { isPro: boolean; settingsUrl: string; founderEmail: string }) {
	return (
		<Section className="mb-7">
			<Section
				className="bg-brand-card border border-solid border-brand-border rounded-2xl p-5 mb-5"
				style={{ boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
			>
				<Text className="text-[15px] font-semibold font-display text-brand-foreground m-0 mb-2">What happens next</Text>
				<Text className="text-[14px] leading-6 text-brand-muted m-0 mb-1">
					• You'll receive your next digest {props.isPro ? "based on your frequency setting" : "weekly"}
				</Text>
				<Text className="text-[14px] leading-6 text-brand-muted m-0 mb-1">
					• Star notes you want to see more often, skip ones that aren't worth revisiting
				</Text>
				<Text className="text-[14px] leading-6 text-brand-muted m-0">
					•{" "}
					<Link href={props.settingsUrl} className="text-brand-primary underline underline-offset-2">
						Adjust your timing and preferences
					</Link>
				</Text>
			</Section>
			{!props.isPro && (
				<Section
					className="bg-brand-card border border-solid border-brand-border rounded-2xl p-5 mb-5"
					style={{ boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
				>
					<Text className="text-[15px] font-semibold font-display text-brand-foreground m-0 mb-2">Want daily digests?</Text>
					<Text className="text-[14px] leading-6 text-brand-muted m-0 mb-3">
						Upgrade to Pro for daily frequency, AI quizzes, and multiple sources.
					</Text>
					<Link href={`${props.settingsUrl}?tab=billing`} className="text-brand-primary text-[14px] font-semibold underline underline-offset-2">
						See Pro features →
					</Link>
				</Section>
			)}
			<Text className="text-[14px] leading-6 text-brand-muted-on-blue m-0 mt-5">
				Questions or feedback? Just reply to this email — I read every message.
			</Text>
			<Text className="text-[14px] leading-6 text-brand-foreground m-0 mt-2">— Younes</Text>
		</Section>
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
						backgroundColor: "rgba(99, 161, 242, 0.08)",
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
