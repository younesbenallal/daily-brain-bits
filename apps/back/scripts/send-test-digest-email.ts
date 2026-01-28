import type { DigestFrequency } from "../domains/digest/schedule";
import { sendResendEmail } from "../domains/email/resend";
import { buildDigestEmail, buildEmailContent, type DigestEmailItem, type DigestSnapshot } from "../utils/note-digest-email-template";

type CliArgs = {
	to: string;
	count: number;
	frequency: DigestFrequency;
	name: string;
	from: string;
	replyTo?: string;
	frontendUrl: string;
	dryRun: boolean;
	subjectPrefix?: string;
};

const DEFAULT_FROM = "digest@dbb.notionist.app";
const DEFAULT_FRONTEND_URL = "http://localhost:3000";

function parseArgs(argv: string[]): CliArgs {
	if (argv.includes("--help") || argv.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	const to = readArgValue(argv, "--to") ?? process.env.TEST_EMAIL_TO ?? "";
	if (!to.trim()) {
		throw new Error("Missing recipient. Provide --to or set TEST_EMAIL_TO.");
	}

	const countValue = readArgValue(argv, "--count") ?? "4";
	const count = Number.parseInt(countValue, 10);
	if (!Number.isFinite(count) || count <= 0) {
		throw new Error(`Invalid --count value: ${countValue}`);
	}

	const frequency = parseFrequency(readArgValue(argv, "--frequency") ?? "daily");
	const name = readArgValue(argv, "--name") ?? "Alex";
	const from = readArgValue(argv, "--from") ?? process.env.RESEND_FROM ?? DEFAULT_FROM;
	const replyTo = readArgValue(argv, "--reply-to") ?? process.env.RESEND_REPLY_TO ?? undefined;
	const frontendUrl = readArgValue(argv, "--frontend-url") ?? process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL;
	const subjectPrefix = readArgValue(argv, "--subject-prefix") ?? undefined;
	const dryRun = argv.includes("--dry-run") || envBoolean(process.env.DIGEST_EMAIL_DRY_RUN);

	return {
		to,
		count,
		frequency,
		name,
		from,
		replyTo,
		frontendUrl,
		dryRun,
		subjectPrefix,
	};
}

function readArgValue(argv: string[], flag: string): string | undefined {
	const index = argv.indexOf(flag);
	if (index === -1) {
		return undefined;
	}
	return argv[index + 1];
}

function envBoolean(value: string | undefined): boolean {
	if (!value) {
		return false;
	}
	return value.toLowerCase() === "true";
}

function parseFrequency(value: string): DigestFrequency {
	if (value === "daily" || value === "weekly" || value === "monthly") {
		return value;
	}
	throw new Error(`Invalid --frequency value: ${value}`);
}

function createSampleItems(count: number): DigestEmailItem[] {
	const baseItems = [
		{
			title: "Designing systems with calm defaults",
			content:
				"# Calm defaults\n\nWhen defaults are calm, decisions get easier.\n\n- Reduce the number of toggles\n- Favor predictable behavior\n- Make recovery obvious\n\n> Good defaults are invisible until they save you.\n\nRead more at https://example.com/design-notes",
			sourceKind: "notion" as const,
			sourceName: "Product Notes",
		},
		{
			title: "Spaced repetition heuristics",
			content: `# Spacing ideas\n\nWe can tune the interval with a light touch.\n\n\`\`\`
interval = base * ease * priority\n\`\`\`
\nKeep it simple and transparent for users.`,
			sourceKind: "obsidian" as const,
			sourceName: "Research Vault",
		},
		{
			title: "Weekly review checklist",
			content: "## Weekly checklist\n\n- Scan inbox\n- Promote key notes\n- Archive low-signal docs\n\nA tiny ritual keeps the backlog humane.",
			sourceKind: "notion" as const,
			sourceName: "Operations",
		},
		{
			title: "Decision log: metrics to trust",
			content:
				"Trust the metrics that help you act.\n\n> Leading indicators beat vanity charts.\n\nIf a metric can't change a decision, it doesn't belong in the dashboard.",
			sourceKind: "obsidian" as const,
			sourceName: "Strategy",
		},
		{
			title: "Writing notes that age well",
			content: "Notes that age well are specific, dated, and short.\n\n- Include a goal\n- Add context links\n- End with next steps",
			sourceKind: "notion" as const,
			sourceName: "Knowledge Base",
		},
	];

	const items: DigestEmailItem[] = [];

	for (let index = 0; index < count; index += 1) {
		const base = baseItems[index % baseItems.length]!;
		const content = index >= baseItems.length ? `${base.content}\n\nExtra note #${index + 1}.` : base.content;
		const emailContent = buildEmailContent(content);

		items.push({
			documentId: 1000 + index,
			title: base.title,
			excerpt: emailContent.excerpt,
			blocks: emailContent.blocks,
			sourceKind: base.sourceKind,
			sourceName: base.sourceName,
		});
	}

	return items;
}

function buildFakeDigest(count: number): DigestSnapshot {
	return {
		digestId: Math.floor(Date.now() / 1000),
		createdAt: new Date(),
		items: createSampleItems(count),
	};
}

function printHelp() {
	console.log(
		`\nSend a test Daily Brain Bits digest email using fake data.\n\nUsage:\n  bun run apps/back/scripts/send-test-digest-email.ts --to you@example.com [options]\n\nOptions:\n  --to <email>              Recipient email (or set TEST_EMAIL_TO)\n  --count <number>          Number of notes to include (default: 4)\n  --frequency <daily|weekly|monthly>  Digest frequency (default: daily)\n  --name <name>             Recipient greeting name (default: Alex)\n  --from <email>            From address (default: RESEND_FROM or ${DEFAULT_FROM})\n  --reply-to <email>        Reply-to address (optional)\n  --frontend-url <url>      Frontend base URL (default: FRONTEND_URL or ${DEFAULT_FRONTEND_URL})\n  --subject-prefix <text>   Prefix for the subject line\n  --dry-run                 Skip external send (uses Resend dry run)\n`,
	);
}

async function run() {
	const args = parseArgs(process.argv.slice(2));

	if (!process.env.RESEND_API_KEY && !args.dryRun) {
		throw new Error("Missing RESEND_API_KEY. Set it or pass --dry-run.");
	}

	const digest = buildFakeDigest(args.count);
	const email = buildDigestEmail({
		frequency: args.frequency,
		userName: args.name,
		frontendUrl: args.frontendUrl,
		digest,
	});

	const subject = args.subjectPrefix ? `${args.subjectPrefix} ${email.subject}` : email.subject;
	const idempotencyKey = `test-digest-${Date.now()}`;

	console.log(`[send-test-digest-email] Sending ${args.count} fake notes to ${args.to}${args.dryRun ? " (DRY RUN)" : ""}...`);

	const { id, error } = await sendResendEmail({
		payload: {
			from: args.from,
			to: args.to,
			replyTo: args.replyTo,
			subject,
			text: email.text,
			react: email.react,
			tags: [
				{ name: "category", value: "note_digest_test" },
				{ name: "frequency", value: args.frequency },
			],
		},
		idempotencyKey,
		dryRun: args.dryRun,
	});

	if (error) {
		console.error(`[send-test-digest-email] Resend failed: ${error.name} ${error.message}`);
		process.exit(1);
	}

	console.log(`[send-test-digest-email] Sent. Resend id: ${id ?? "unknown"}`);
}

if (import.meta.main) {
	run().catch((error) => {
		console.error("[send-test-digest-email] Failed:", error);
		process.exit(1);
	});
}
