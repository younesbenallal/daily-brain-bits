export type ReviewCandidate = {
	documentId: number;
	status: "new" | "reviewing" | "suspended";
	nextDueAt: Date | null;
	lastSentAt: Date | null;
	priorityWeight: number | null;
	deprioritizedUntil: Date | null;
};

export type NoteDigestConfig = {
	batchSize: number;
	now?: Date;
	dueSoonDays?: number;
	minSendIntervalDays?: number;
	maxNewFraction?: number;
};

export type NoteDigestItem = {
	documentId: number;
	position: number;
	score: number;
	reason: "overdue" | "due_soon" | "new" | "scheduled";
	priorityWeight: number;
	nextDueAt: Date | null;
	lastSentAt: Date | null;
	cooldownApplied: boolean;
};

export type NoteDigestPlan = {
	items: NoteDigestItem[];
	skipped: Array<{ documentId: number; reason: "suspended" | "deprioritized" }>;
};

type ScoredCandidate = Omit<NoteDigestItem, "position">;

const DEFAULT_DUE_SOON_DAYS = 3;
const DEFAULT_MIN_SEND_INTERVAL_DAYS = 1;
const DEFAULT_MAX_NEW_FRACTION = 0.4;
const MIN_PRIORITY_WEIGHT = 0.1;
const MAX_PRIORITY_WEIGHT = 5;
const COOLDOWN_SCORE_MULTIPLIER = 0.25;

export function generateNoteDigest(candidates: ReviewCandidate[], config: NoteDigestConfig): NoteDigestPlan {
	const now = config.now ?? new Date();
	const dueSoonDays = config.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
	const minSendIntervalDays = config.minSendIntervalDays ?? DEFAULT_MIN_SEND_INTERVAL_DAYS;
	const maxNewFraction = config.maxNewFraction ?? DEFAULT_MAX_NEW_FRACTION;
	const batchSize = Math.max(0, Math.floor(config.batchSize));
	const dueSoonCutoff = addDays(now, dueSoonDays).getTime();
	const cooldownCutoff = addDays(now, -minSendIntervalDays).getTime();
	const skipped: NoteDigestPlan["skipped"] = [];

	const scored: ScoredCandidate[] = [];

	for (const candidate of candidates) {
		if (candidate.status === "suspended") {
			skipped.push({ documentId: candidate.documentId, reason: "suspended" });
			continue;
		}
		if (candidate.deprioritizedUntil && candidate.deprioritizedUntil.getTime() > now.getTime()) {
			skipped.push({ documentId: candidate.documentId, reason: "deprioritized" });
			continue;
		}

		const priorityWeight = clampNumber(candidate.priorityWeight ?? 1, MIN_PRIORITY_WEIGHT, MAX_PRIORITY_WEIGHT);
		const { baseScore, reason } = scoreByDueDate(candidate.nextDueAt, now, dueSoonCutoff);
		let score = baseScore * priorityWeight;
		let cooldownApplied = false;
		if (candidate.lastSentAt && candidate.lastSentAt.getTime() > cooldownCutoff) {
			score *= COOLDOWN_SCORE_MULTIPLIER;
			cooldownApplied = true;
		}

		scored.push({
			documentId: candidate.documentId,
			score,
			reason,
			priorityWeight,
			nextDueAt: candidate.nextDueAt,
			lastSentAt: candidate.lastSentAt,
			cooldownApplied,
		});
	}

	if (batchSize === 0 || scored.length === 0) {
		return { items: [], skipped };
	}

	const ordered = scored.slice().sort(compareCandidates);
	const due = ordered.filter((item) => item.reason === "overdue" || item.reason === "due_soon");
	const fresh = ordered.filter((item) => item.reason === "new");
	const scheduled = ordered.filter((item) => item.reason === "scheduled");
	const maxNew = Math.max(0, Math.floor(batchSize * maxNewFraction));

	const selected: ScoredCandidate[] = [];
	let newCount = 0;

	const takeFrom = (items: ScoredCandidate[], limit?: number) => {
		for (const item of items) {
			if (selected.length >= batchSize) {
				return;
			}
			if (limit !== undefined && selected.length >= limit) {
				return;
			}
			selected.push(item);
		}
	};

	takeFrom(due);

	for (const item of fresh) {
		if (selected.length >= batchSize) {
			break;
		}
		if (newCount >= maxNew) {
			break;
		}
		selected.push(item);
		newCount += 1;
	}

	if (selected.length < batchSize) {
		takeFrom(scheduled.filter((item) => !selected.includes(item)));
	}

	if (selected.length < batchSize) {
		takeFrom(fresh.filter((item) => !selected.includes(item)));
	}

	const items = selected.slice(0, batchSize).map((item, index) => ({
		...item,
		position: index + 1,
	}));

	return { items, skipped };
}

function scoreByDueDate(nextDueAt: Date | null, now: Date, dueSoonCutoff: number) {
	if (!nextDueAt) {
		return { baseScore: 50, reason: "new" as const };
	}

	const nextDueTime = nextDueAt.getTime();
	const nowTime = now.getTime();

	if (nextDueTime <= nowTime) {
		const overdueDays = Math.min(Math.floor(Math.max(0, nowTime - nextDueTime) / DAY_MS), 30);
		return { baseScore: 100 + overdueDays * 3, reason: "overdue" as const };
	}

	if (nextDueTime <= dueSoonCutoff) {
		const daysUntil = Math.ceil((nextDueTime - nowTime) / DAY_MS);
		return { baseScore: 70 - daysUntil * 5, reason: "due_soon" as const };
	}

	const daysUntil = Math.ceil((nextDueTime - nowTime) / DAY_MS);
	return { baseScore: 20 - Math.min(daysUntil, 30), reason: "scheduled" as const };
}

function compareCandidates(a: ScoredCandidate, b: ScoredCandidate) {
	if (a.score !== b.score) {
		return b.score - a.score;
	}

	const aDue = a.nextDueAt ? a.nextDueAt.getTime() : Number.POSITIVE_INFINITY;
	const bDue = b.nextDueAt ? b.nextDueAt.getTime() : Number.POSITIVE_INFINITY;
	if (aDue !== bDue) {
		return aDue - bDue;
	}

	if (a.priorityWeight !== b.priorityWeight) {
		return b.priorityWeight - a.priorityWeight;
	}

	return a.documentId - b.documentId;
}

function clampNumber(value: number, min: number, max: number) {
	if (Number.isNaN(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}

function addDays(date: Date, days: number) {
	return new Date(date.getTime() + days * DAY_MS);
}

const DAY_MS = 24 * 60 * 60 * 1000;
