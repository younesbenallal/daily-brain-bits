import { runEmailSequenceRunner } from "../domains/email/sequence-runner";

function readArgValue(args: string[], flag: string) {
	const index = args.indexOf(flag);
	if (index === -1) {
		return null;
	}
	return args[index + 1] ?? null;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const nowArg = readArgValue(args, "--now");
	const now = nowArg ? new Date(nowArg) : new Date();

	console.log("[send-due-sequence-emails] Starting sequence email process...");
	await runEmailSequenceRunner({ now, dryRun });
	console.log("[send-due-sequence-emails] Sequence email process completed");
}

main().catch((error) => {
	console.error("[send-due-sequence-emails] failed", error);
	process.exit(1);
});
