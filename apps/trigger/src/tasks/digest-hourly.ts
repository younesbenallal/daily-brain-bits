import { schedules, logger } from "@trigger.dev/sdk/v3";
import { runGenerateDailyDigests } from "@daily-brain-bits/back/scripts/generate-daily-digests";
import { runSendDueDigests } from "@daily-brain-bits/back/scripts/send-due-digests";

export const digestHourly = schedules.task({
	id: "digest-hourly",
	cron: "0 * * * *",
	run: async () => {
		logger.info("digest-hourly: start");
		await runGenerateDailyDigests();
		await runSendDueDigests();
		logger.info("digest-hourly: complete");
	},
});
