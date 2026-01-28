/**
 * Simple concurrency pool for limiting parallel async operations.
 *
 * @example
 * const pool = createConcurrencyPool(4);
 * const promises = items.map(async (item) => {
 *   await pool.acquire();
 *   try {
 *     return await processItem(item);
 *   } finally {
 *     pool.release();
 *   }
 * });
 * const results = await Promise.all(promises);
 */
export function createConcurrencyPool(limit: number) {
	let running = 0;
	const queue: Array<() => void> = [];

	const acquire = (): Promise<void> =>
		new Promise((resolve) => {
			if (running < limit) {
				running++;
				resolve();
			} else {
				queue.push(() => {
					running++;
					resolve();
				});
			}
		});

	const release = () => {
		running--;
		const next = queue.shift();
		if (next) {
			next();
		}
	};

	return { acquire, release };
}
