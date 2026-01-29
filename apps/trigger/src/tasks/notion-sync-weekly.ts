import { logger, schedules } from "@trigger.dev/sdk/v3";
import { runSyncNotionConnections } from "@daily-brain-bits/back/scripts/sync-notion-connections";

export const notionSyncWeekly = schedules.task({
	id: "notion-sync-weekly",
	cron: "0 3 * * 0", // Every Sunday at 3:00 AM UTC
	run: async () => {
		logger.info("notion-sync-weekly: start");

		const result = await runSyncNotionConnections();

		logger.info("notion-sync-weekly: complete", {
			synced: result.synced,
			failed: result.failed,
			totalDocuments: result.totalDocuments,
		});

		return result;
	},
});
