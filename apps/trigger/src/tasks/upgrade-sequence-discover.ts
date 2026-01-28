import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import { getAllProUsers, isBillingEnabled } from "@daily-brain-bits/back/domains/billing/entitlements";
import { getDeploymentMode } from "@daily-brain-bits/back/domains/billing/deployment-mode";
import { discoverUpgradeSequenceEntries } from "@daily-brain-bits/back/domains/email/sequence-runner";

export const upgradeSequenceDiscover = schedules.task({
	id: "upgrade-sequence-discover",
	cron: "15 * * * *",
	run: async () => {
		if (getDeploymentMode() === "self-hosted") {
			logger.info("upgrade-sequence-discover: disabled in self-hosted mode");
			return { status: "disabled" as const };
		}

		const proUsers = await getAllProUsers();
		const insertedUserIds = await discoverUpgradeSequenceEntries({
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
