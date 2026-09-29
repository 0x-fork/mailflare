export type ConversationHead = {
	id: string;
	threadId: string | null;
	createdAt: Date;
};

export type ConversationCursor = {
	createdAt: Date;
	id: string;
};

const BATCH = 250;

/** Newest-first order: later createdAt, then higher id. Matches the SQL cursor. */
export function isBeforeConversationCursor(row: ConversationCursor, cursor: ConversationCursor): boolean {
	const delta = row.createdAt.getTime() - cursor.createdAt.getTime();
	if (delta !== 0) return delta < 0;
	return row.id < cursor.id;
}

/**
 * One page of conversation heads, newest thread first, plus the real thread count.
 * The walk stops when the page is full or the source runs out. A row cap made
 * every thread past it unreachable, and a guessed `total` kept Next enabled
 * on an empty page.
 */
export async function loadConversationPage(input: {
	offset: number;
	limit: number;
	countThreads: () => Promise<number>;
	fetchBatch: (cursor: ConversationCursor | null, batchLimit: number) => Promise<ConversationHead[]>;
}): Promise<{ ids: string[]; total: number }> {
	const totalPromise = input.countThreads();
	const ids: string[] = [];
	const seen = new Set<string>();
	let cursor: ConversationCursor | null = null;
	const needed = input.offset + input.limit;

	while (seen.size < needed) {
		const batch = await input.fetchBatch(cursor, BATCH);
		if (batch.length === 0) break;
		for (const row of batch) {
			const key = row.threadId ?? row.id;
			if (seen.has(key)) continue;
			seen.add(key);
			if (seen.size > input.offset) ids.push(row.id);
			if (seen.size >= needed) break;
		}
		const tail = batch[batch.length - 1];
		if (seen.size >= needed || batch.length < BATCH) break;
		if (cursor && tail.id === cursor.id && tail.createdAt.getTime() === cursor.createdAt.getTime()) break;
		cursor = { createdAt: tail.createdAt, id: tail.id };
	}

	return { ids, total: await totalPromise };
}
