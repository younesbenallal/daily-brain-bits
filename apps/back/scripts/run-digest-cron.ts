import { runGenerateDailyDigests } from "./generate-daily-digests";
import { runSendDueDigests } from "./send-due-digests";

async function main() {
	await runGenerateDailyDigests();
	await runSendDueDigests();
}

main().catch((error) => {
	console.error("[run-digest-cron] failed", error);
	process.exit(1);
});
