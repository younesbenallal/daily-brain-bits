import { logger, task } from "@trigger.dev/sdk/v3";
import { runSendDueDigests } from "@daily-brain-bits/back/scripts/send-due-digests";

type DigestSendForUserPayload = {
	userId: string;
	reason?: string;
};

export const digestSendForUser = task({
	id: "digest-send-for-user",
	run: async (payload: DigestSendForUserPayload) => {
		logger.info("digest-send-for-user: start", { userId: payload.userId, reason: payload.reason ?? null });
		await runSendDueDigests({ targetUserId: payload.userId, skipScheduleForFirstDigest: true });
		logger.info("digest-send-for-user: complete", { userId: payload.userId });
		return { status: "ok" as const };
	},
});
