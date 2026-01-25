import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import { ensureUpgradeSequenceEntries, loadProUsers } from "@daily-brain-bits/back/utils/email-sequence-runner";
import { isBillingEnabled } from "@daily-brain-bits/back/utils/entitlements";
import { env } from "@daily-brain-bits/back/utils/env";

export const upgradeSequenceDiscover = schedules.task({
	id: "upgrade-sequence-discover",
	cron: "15 * * * *",
	run: async () => {
		if (!env.EMAIL_SEQUENCES_ENABLED) {
			logger.info("upgrade-sequence-discover: disabled");
			return { status: "disabled" as const };
		}

		const proUsers = await loadProUsers();
		const insertedUserIds = await ensureUpgradeSequenceEntries({
			now: new Date(),
			proUsers,
			billingEnabled: isBillingEnabled(),
		});

		if (insertedUserIds.length === 0) {
			return { created: 0 };
		}

		for (const userId of insertedUserIds) {
			await tasks.trigger(
				"email-sequence-runner",
				{
					userId,
					sequenceName: "upgrade",
				},
				{
					idempotencyKey: `sequence-run-upgrade-${userId}`,
				},
			);
		}

		return { created: insertedUserIds.length };
	},
});
