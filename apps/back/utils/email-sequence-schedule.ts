import type { SequenceEmailId } from "./email-sequence-templates";

export type EmailSequenceName = "welcome" | "onboarding" | "upgrade";

type SequenceStepDefinition = {
	step: number;
	emailId: SequenceEmailId;
	kind: "relative" | "after-first-digest";
	offsetMs: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const sequenceSteps: Record<EmailSequenceName, SequenceStepDefinition[]> = {
	welcome: [
		{ step: 1, emailId: "welcome-1", kind: "relative", offsetMs: 0 },
		{ step: 2, emailId: "welcome-2", kind: "relative", offsetMs: 2 * DAY_MS },
		{ step: 3, emailId: "welcome-3", kind: "relative", offsetMs: 4 * DAY_MS },
		{ step: 4, emailId: "welcome-4", kind: "relative", offsetMs: 7 * DAY_MS },
	],
	onboarding: [
		{ step: 1, emailId: "onboarding-1", kind: "relative", offsetMs: 0 },
		{ step: 2, emailId: "onboarding-2", kind: "relative", offsetMs: 1 * DAY_MS },
		{ step: 3, emailId: "onboarding-3", kind: "after-first-digest", offsetMs: 2 * HOUR_MS },
		{ step: 4, emailId: "onboarding-4", kind: "relative", offsetMs: 5 * DAY_MS },
		{ step: 5, emailId: "onboarding-5", kind: "relative", offsetMs: 9 * DAY_MS },
		{ step: 6, emailId: "onboarding-6", kind: "relative", offsetMs: 14 * DAY_MS },
	],
	upgrade: [
		{ step: 1, emailId: "upgrade-1", kind: "relative", offsetMs: 0 },
		{ step: 2, emailId: "upgrade-2", kind: "relative", offsetMs: 3 * DAY_MS },
		{ step: 3, emailId: "upgrade-3", kind: "relative", offsetMs: 7 * DAY_MS },
		{ step: 4, emailId: "upgrade-4", kind: "relative", offsetMs: 14 * DAY_MS },
		{ step: 5, emailId: "upgrade-5", kind: "relative", offsetMs: 21 * DAY_MS },
	],
};

export function getSequenceStepEmailId(sequenceName: EmailSequenceName, step: number): SequenceEmailId | null {
	const definition = sequenceSteps[sequenceName]?.find((item) => item.step === step);
	return definition?.emailId ?? null;
}

export function getSequenceTotalSteps(sequenceName: EmailSequenceName): number {
	return sequenceSteps[sequenceName]?.length ?? 0;
}

export function getSequenceStepDueAt(params: {
	sequenceName: EmailSequenceName;
	step: number;
	enteredAt: Date;
	firstDigestSentAt?: Date | null;
}): Date | null {
	const definition = sequenceSteps[params.sequenceName]?.find((item) => item.step === params.step);
	if (!definition) {
		return null;
	}

	if (definition.kind === "after-first-digest") {
		if (!params.firstDigestSentAt) {
			return null;
		}
		return new Date(params.firstDigestSentAt.getTime() + definition.offsetMs);
	}

	return new Date(params.enteredAt.getTime() + definition.offsetMs);
}

export function isSequenceStepDue(params: {
	now: Date;
	sequenceName: EmailSequenceName;
	step: number;
	enteredAt: Date;
	firstDigestSentAt?: Date | null;
}): boolean {
	const dueAt = getSequenceStepDueAt({
		sequenceName: params.sequenceName,
		step: params.step,
		enteredAt: params.enteredAt,
		firstDigestSentAt: params.firstDigestSentAt,
	});
	if (!dueAt) {
		return false;
	}
	return dueAt.getTime() <= params.now.getTime();
}
