import { logger, task, wait } from "@trigger.dev/sdk/v3";
import {
	loadSequenceContextForUser,
	loadSequenceState,
	processSequenceState,
	type EmailSequenceName,
} from "@daily-brain-bits/back/utils/email-sequence-runner";
import { env } from "@daily-brain-bits/back/utils/env";

type SequenceRunnerPayload = {
	userId: string;
	sequenceName: EmailSequenceName;
	dryRun?: boolean;
};

export const emailSequenceRunner = task({
	id: "email-sequence-runner",
	run: async (payload: SequenceRunnerPayload) => {
		if (!env.EMAIL_SEQUENCES_ENABLED) {
			logger.info("email-sequence-runner: disabled", { userId: payload.userId, sequenceName: payload.sequenceName });
			return { status: "disabled" as const };
		}

		const dryRun = payload.dryRun ?? false;
		const maxIterations = 500;

		for (let iterations = 0; iterations < maxIterations; iterations += 1) {
			const state = await loadSequenceState({
				userId: payload.userId,
				sequenceName: payload.sequenceName,
			});

			if (!state || state.status !== "active") {
				return { status: "inactive" as const };
			}

			const context = await loadSequenceContextForUser(payload.userId);
			const now = new Date();
			const result = await processSequenceState({
				state,
				context,
				now,
				dryRun,
			});

			if (result.status === "failed") {
				throw result.error;
			}

			if (result.status === "completed" || result.status === "exited") {
				return result;
			}

			if (result.status === "blocked") {
				logger.info("email-sequence-runner: waiting for first digest", {
					userId: payload.userId,
					sequenceName: payload.sequenceName,
				});
				await wait.for({ hours: 1 });
				continue;
			}

			if (result.status === "not_due") {
				await wait.until({ date: result.dueAt });
				continue;
			}
		}

		throw new Error("email-sequence-runner exceeded iteration limit");
	},
});
