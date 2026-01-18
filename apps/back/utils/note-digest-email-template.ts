import type { DigestFrequency } from "./digest-schedule";

export type DigestEmailItem = {
	documentId: number;
	title: string;
	excerpt: string;
	sourceKind: "obsidian" | "notion" | null;
	sourceName: string | null;
};

export type DigestSnapshot = {
	digestId: number;
	createdAt: Date;
	items: DigestEmailItem[];
};

const EXCERPT_MAX_LENGTH = 640;

export function buildDigestEmail(params: {
	frequency: DigestFrequency;
	userName?: string | null;
	frontendUrl: string;
	digest: DigestSnapshot;
}): { subject: string; html: string; text: string } {
	const itemCount = params.digest.items.length;
	const frequencyLabel = formatFrequencyLabel(params.frequency);
	const subject = `${frequencyLabel} Brain Bits (${itemCount} note${itemCount === 1 ? "" : "s"})`;
	const greetingName = params.userName?.trim() || "there";
	const digestDate = formatDigestDate(params.digest.createdAt);
	const viewUrl = `${params.frontendUrl.replace(/\/$/, "")}/dash`;

	const htmlItems = params.digest.items
		.map((item) => {
			const sourceLabel = formatSourceLabel(item);
			return `
				<tr>
					<td style="padding: 0 0 var(--space-md) 0;">
						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-soft);">
							<tr>
								<td style="padding: var(--space-md);">
									<div style="font-family: var(--font-display); font-size: var(--font-md); font-weight: 600; color: var(--foreground); margin-bottom: var(--space-xs);">
										${escapeHtml(item.title)}
									</div>
									<div style="font-size: var(--font-sm); line-height: 1.7; color: var(--muted-foreground); margin-bottom: var(--space-sm);">
										${escapeHtml(item.excerpt)}
									</div>
									${sourceLabel ? `<div style="font-size: var(--font-xs); color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.12em;">${escapeHtml(sourceLabel)}</div>` : ""}
								</td>
							</tr>
						</table>
					</td>
				</tr>
			`;
		})
		.join("");

	const html = `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(subject)}</title>
		<style>
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
				--space-sm: 10px;
				--space-xs: 6px;
				--radius-lg: 16px;
				--radius-pill: 999px;
				--font-xl: 28px;
				--font-lg: 20px;
				--font-md: 16px;
				--font-sm: 15px;
				--font-xs: 12px;
			}
		</style>
	</head>
	<body style="margin: 0; padding: 0; background: var(--background); font-family: var(--font-body); color: var(--foreground);">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: var(--background); background-image: var(--app-gradient); padding: var(--space-xl) 0;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-xl); box-shadow: var(--shadow-soft);">
						<tr>
							<td>
								<div style="font-size: var(--font-xs); letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: var(--space-sm); font-family: var(--font-ui);">
									${escapeHtml(frequencyLabel)} digest · ${escapeHtml(digestDate)}
								</div>
								<h1 style="margin: 0 0 var(--space-sm) 0; font-size: var(--font-xl); font-weight: 600; color: var(--foreground); font-family: var(--font-display);">
									Hello ${escapeHtml(greetingName)},
								</h1>
								<p style="margin: 0 0 var(--space-lg) 0; font-size: var(--font-md); line-height: 1.7; color: var(--muted-foreground);">
									Here is your ${escapeHtml(frequencyLabel.toLowerCase())} selection of notes to revisit today.
								</p>
							</td>
						</tr>
						<tr>
							<td>
								<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
									${htmlItems}
								</table>
							</td>
						</tr>
						<tr>
							<td style="padding-top: var(--space-lg);">
								<a href="${escapeAttribute(viewUrl)}" style="display: inline-block; padding: 12px 22px; border-radius: var(--radius-pill); background: var(--primary); color: var(--primary-foreground); text-decoration: none; font-size: var(--font-sm); font-weight: 600; font-family: var(--font-ui);">
									View this digest in the app
								</a>
							</td>
						</tr>
						<tr>
							<td style="padding-top: var(--space-lg); font-size: var(--font-xs); color: var(--muted-foreground); font-family: var(--font-ui);">
								Daily Brain Bits · Sent to help you retain what matters.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`;

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

	return { subject, html, text };
}

export function buildExcerpt(content: string): string {
	const plain = stripMarkdown(content);
	if (!plain) {
		return "No preview available.";
	}
	return truncateText(plain, EXCERPT_MAX_LENGTH);
}

function stripMarkdown(input: string): string {
	return input
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`[^`]*`/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/<[^>]+>/g, "")
		.replace(/[#>*_~`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function truncateText(input: string, maxLength: number): string {
	if (input.length <= maxLength) {
		return input;
	}
	return `${input.slice(0, maxLength - 3).trim()}...`;
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

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeAttribute(input: string): string {
	return escapeHtml(input);
}
