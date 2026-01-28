import { db, emailSequenceStates } from "@daily-brain-bits/db";
import { and, eq } from "drizzle-orm";
import { getSequenceTotalSteps, type EmailSequenceName } from "./sequence-schedule";

export type SequenceStateRow = {
	id: number;
	userId: string;
	sequenceName: EmailSequenceName;
	currentStep: number;
	enteredAt: Date;
	lastEmailSentAt: Date | null;
	status: "active" | "completed" | "exited";
};

export async function loadSequenceState(params: {
	userId: string;
	sequenceName: EmailSequenceName;
}): Promise<SequenceStateRow | null> {
	const result = await db.query.emailSequenceStates.findFirst({
		where: and(eq(emailSequenceStates.userId, params.userId), eq(emailSequenceStates.sequenceName, params.sequenceName)),
		columns: {
			id: true,
			userId: true,
			sequenceName: true,
			currentStep: true,
			enteredAt: true,
			lastEmailSentAt: true,
			status: true,
		},
	});
	return result ?? null;
}

export async function markSequenceCompleted(state: SequenceStateRow, now: Date) {
	await db
		.update(emailSequenceStates)
		.set({
			status: "completed",
			completedAt: now,
		})
		.where(eq(emailSequenceStates.id, state.id));
}

export async function advanceSequenceState(state: SequenceStateRow, now: Date) {
	const totalSteps = getSequenceTotalSteps(state.sequenceName);
	const nextStep = state.currentStep + 1;

	const updates: Partial<typeof emailSequenceStates.$inferInsert> = {
		lastEmailSentAt: now,
		currentStep: nextStep,
	};

	if (nextStep > totalSteps) {
		updates.status = "completed";
		updates.completedAt = now;
	}

	await db.update(emailSequenceStates).set(updates).where(eq(emailSequenceStates.id, state.id));
}
