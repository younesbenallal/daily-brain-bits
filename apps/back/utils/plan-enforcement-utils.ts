export function evaluateNoteLimit(params: {
	currentCount: number;
	newNoteCount: number;
	limit: number;
}) {
	const { currentCount, newNoteCount, limit } = params;
	if (limit === Number.POSITIVE_INFINITY) {
		return { allowed: true, currentCount, limit, overflow: 0 };
	}

	const overflow = Math.max(0, currentCount + newNoteCount - limit);
	return {
		allowed: overflow === 0,
		currentCount,
		limit,
		overflow,
	};
}

export function evaluateSourceLimit(params: {
	currentCount: number;
	limit: number;
}) {
	const { currentCount, limit } = params;
	if (limit === Number.POSITIVE_INFINITY) {
		return { allowed: true, currentCount, limit };
	}
	return {
		allowed: currentCount < limit,
		currentCount,
		limit,
	};
}
