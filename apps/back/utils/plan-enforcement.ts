import { getUserEntitlements, countUserConnections, countUserDocuments } from "../domains/billing/entitlements";
import { evaluateNoteLimit, evaluateSourceLimit } from "./plan-enforcement-utils";

export async function checkNoteLimitForSync(params: { userId: string; newNoteCount: number }) {
	const entitlements = await getUserEntitlements(params.userId);
	const currentCount = await countUserDocuments(params.userId);
	return evaluateNoteLimit({ currentCount, newNoteCount: params.newNoteCount, limit: entitlements.limits.maxNotes });
}

export async function checkSourceLimitForConnection(params: { userId: string }) {
	const entitlements = await getUserEntitlements(params.userId);
	const currentCount = await countUserConnections(params.userId);
	return evaluateSourceLimit({ currentCount, limit: entitlements.limits.maxSources });
}
