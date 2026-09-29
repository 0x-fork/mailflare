import assert from "node:assert/strict";
import test from "node:test";
import { isBeforeConversationCursor, loadConversationPage } from "../src/app/api/messages/conversation-page.ts";

function at(seconds, id, threadId = id) {
	return { id, threadId, createdAt: new Date(seconds * 1000) };
}

function fetchBatch(rows) {
	const ordered = [...rows].sort((a, b) => {
		const delta = b.createdAt.getTime() - a.createdAt.getTime();
		if (delta !== 0) return delta;
		if (a.id === b.id) return 0;
		return a.id < b.id ? 1 : -1;
	});
	return async (cursor, batchLimit) => {
		const visible = cursor ? ordered.filter((row) => isBeforeConversationCursor(row, cursor)) : ordered;
		return visible.slice(0, batchLimit);
	};
}

test("a page past 2000 threads is still returned and total is the real thread count", async () => {
	const rows = Array.from({ length: 3000 }, (_, index) => at(index, `m${String(index).padStart(4, "0")}`));
	const page = await loadConversationPage({
		offset: 2400,
		limit: 50,
		countThreads: async () => 3000,
		fetchBatch: fetchBatch(rows),
	});

	assert.equal(page.total, 3000);
	assert.equal(page.ids.length, 50);
	assert.equal(page.ids[0], "m0599");
	assert.equal(page.ids.at(-1), "m0550");
	assert.equal(2400 + page.ids.length >= page.total, false);
});

test("the newest message of a thread represents it, including past the first batch", async () => {
	const rows = [];
	for (let thread = 0; thread < 300; thread += 1) {
		rows.push(at(thread, `old-${thread}`, `t${thread}`));
		rows.push(at(1000 + thread, `new-${thread}`, `t${thread}`));
	}
	const page = await loadConversationPage({
		offset: 260,
		limit: 2,
		countThreads: async () => 300,
		fetchBatch: fetchBatch(rows),
	});

	assert.equal(page.total, 300);
	assert.deepEqual(page.ids, ["new-39", "new-38"]);
});

test("offset past the end returns no rows and the real total, so Next stays off", async () => {
	const rows = Array.from({ length: 10 }, (_, index) => at(index, `m${index}`));
	const page = await loadConversationPage({
		offset: 50,
		limit: 50,
		countThreads: async () => 10,
		fetchBatch: fetchBatch(rows),
	});

	assert.equal(page.total, 10);
	assert.deepEqual(page.ids, []);
	assert.equal(50 + page.ids.length >= page.total, true);
});

test("equal timestamps page by id descending", async () => {
	const when = new Date(1_700_000_000_000);
	const rows = ["a", "c", "b"].map((id) => ({ id, threadId: id, createdAt: when }));
	const page = await loadConversationPage({
		offset: 1,
		limit: 1,
		countThreads: async () => 3,
		fetchBatch: fetchBatch(rows),
	});

	assert.deepEqual(page.ids, ["b"]);
});
