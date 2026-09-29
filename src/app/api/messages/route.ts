import { NextResponse } from "next/server";
import { eq, desc, and, or, lt, count, isNull, isNotNull, inArray, lte, gt, notInArray, sql, sum, getTableColumns } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getContactDisplayNameMap } from "@/lib/contacts/service";
import { getFirstEmailAddressEntry, normalizeEmailAddress } from "@/lib/email/address";
import { getMailboxAccessLevel, listAccessibleMailboxes } from "@/lib/mailboxes/access";
import { tracksAccountIdentity } from "@/lib/profile/identity-utils";
import { buildSearchConditions } from "@/lib/search/conditions";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const direction = url.searchParams.get("direction");
	const mailboxId = url.searchParams.get("mailboxId");
	const folderId = url.searchParams.get("folderId");
	const status = url.searchParams.get("status");
	const query = url.searchParams.get("q")?.trim();
	const title = url.searchParams.get("title")?.trim();
	const read = url.searchParams.get("read");
	const starred = url.searchParams.get("starred");
	const snoozed = url.searchParams.get("snoozed");
	const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
	const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
	// Conversation view: one row per thread, represented by its newest message
	// that matches the filter. Drafts are never grouped.
	const groupByThread = url.searchParams.get("group") === "thread" && status !== "draft";

	const db = getDb(env);
	const accessibleMailboxes = await listAccessibleMailboxes(db, user);
	const accessibleMailboxIds = accessibleMailboxes.map((mailbox) => mailbox.id);
	const conditions: SQL[] = [];
	if (mailboxId) {
		const access = await getMailboxAccessLevel(db, user, mailboxId);
		if (!access?.canRead) {
			return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
		}
		conditions.push(eq(messages.mailboxId, mailboxId));
	} else if (accessibleMailboxIds.length > 0) {
		conditions.push(inArray(messages.mailboxId, accessibleMailboxIds));
	} else {
		conditions.push(eq(messages.userId, user.id));
	}
	if (direction === "inbound" || direction === "outbound") {
		conditions.push(eq(messages.direction, direction));
	}
	if (folderId) {
		conditions.push(eq(messages.folderId, folderId));
	}
	if (status) {
		conditions.push(eq(messages.status, status));
	}
	if (status === "received" && !folderId) {
		conditions.push(isNull(messages.folderId));
		conditions.push(or(isNull(messages.snoozedUntil), lte(messages.snoozedUntil, new Date()))!);
	}
	if (starred === "true") {
		conditions.push(eq(messages.starred, true));
	}
	if (snoozed === "true") {
		conditions.push(eq(messages.status, "received"));
		conditions.push(isNull(messages.folderId));
		conditions.push(gt(messages.snoozedUntil, new Date()));
	}
	if (read === "read") {
		conditions.push(eq(messages.read, true));
	}
	if (read === "unread") {
		conditions.push(eq(messages.read, false));
	}
	if (query || title) {
		// Operators (from:, has:attachment, before:) and free text go through the
		// full-text index; `title` is the legacy subject filter and is folded in.
		conditions.push(...buildSearchConditions(title ? `${query ?? ""} subject:"${title}"` : query ?? ""));
	}
	const where = and(...conditions);
	// Messages that were never threaded (older rows, drafts) stand alone.
	const threadKey = sql<string>`coalesce(${messages.threadId}, ${messages.id})`;

	// The list never renders bodies, and pulling text_body/html_body for 50
	// rows is megabytes of scattered reads on a 13GB table — the dominant
	// cost of this endpoint cold. Select every column except those two; the
	// stored `snippet` column covers preview text.
	type ListMessage = Omit<typeof messages.$inferSelect, "textBody" | "htmlBody">;
	type MessageTableColumns = ReturnType<typeof getTableColumns<typeof messages>>;
	const messageListColumns = Object.fromEntries(
		Object.entries(getTableColumns(messages)).filter(([name]) => name !== "textBody" && name !== "htmlBody"),
	) as Omit<MessageTableColumns, "textBody" | "htmlBody">;

	let total = 0;
	let rows: ListMessage[];
	// Which stored messages each visible row stands for, so acting on a
	// conversation row acts on the whole conversation within this folder.
	const threadMessageIds = new Map<string, string[]>();
	if (groupByThread) {
		// Conversation view: one row per thread = its newest message.
		// Grouping the entire mailbox per request is O(mailbox). Walk the
		// covering index newest-first and stop once this page, plus one extra
		// thread, is in hand. Cost follows the page, not the mailbox.
		const distinctKeys: string[] = [];
		const seenKeys = new Set<string>();
		let scanned = 0;
		const maxScan = Math.max(limit * 40, 2000);
		let lastCreatedAt: Date | null = null;
		let lastId: string | null = null;
		// One thread past the page is enough to know Next should stay enabled.
		const targetCount = limit + offset + 1;
		let exhausted = false;
		while (distinctKeys.length < targetCount && scanned < maxScan) {
			const batchLimit = Math.min(250, maxScan - scanned);
			const cursorRows = await db
				.select({ id: messages.id, threadId: messages.threadId, createdAt: messages.createdAt })
				.from(messages)
				.where(
					lastCreatedAt
						? and(where, or(
								lt(messages.createdAt, lastCreatedAt),
								and(eq(messages.createdAt, lastCreatedAt), lt(messages.id, lastId as string)),
							))
						: where,
				)
				.orderBy(desc(messages.createdAt), desc(messages.id))
				.limit(batchLimit);
			scanned += cursorRows.length;
			if (cursorRows.length === 0 || cursorRows.length < batchLimit) {
				exhausted = true;
				if (cursorRows.length === 0) break;
			}
			for (const row of cursorRows) {
				const key = row.threadId ?? row.id;
				if (!seenKeys.has(key)) {
					seenKeys.add(key);
					distinctKeys.push(key);
				}
			}
			const tail = cursorRows[cursorRows.length - 1];
			lastCreatedAt = tail.createdAt;
			lastId = tail.id;
			if (exhausted) break;
		}
		const pageKeys = distinctKeys.slice(offset, offset + limit);
		if (pageKeys.length > 0) {
			// Cheap pass: only id/thread/created to find each thread's newest row.
			// Selecting full rows here would pull text_body+html_body for every
			// message in the page's threads, which is megabytes per request.
			const candidates = await db
				.select({ id: messages.id, threadId: messages.threadId, createdAt: messages.createdAt })
				.from(messages)
				.where(and(where, inArray(sql<string>`coalesce(${messages.threadId}, ${messages.id})`, pageKeys)));
			const newestByKey = new Map<string, { id: string; createdAt: Date }>();
			for (const row of candidates) {
				const key = row.threadId ?? row.id;
				const current = newestByKey.get(key);
				if (!current || row.createdAt > current.createdAt) {
					newestByKey.set(key, { id: row.id, createdAt: row.createdAt });
				}
			}
			const newestIds = pageKeys
				.map((key) => newestByKey.get(key)?.id)
				.filter((id): id is string => !!id);
			rows = newestIds.length
				? await db
						.select(messageListColumns)
						.from(messages)
						.where(and(where, inArray(messages.id, newestIds)))
				: [];
			const rowById = new Map(rows.map((row) => [row.id, row]));
			rows = newestIds.map((id) => rowById.get(id)).filter((row): row is ListMessage => !!row);
		} else {
			rows = [];
		}
		// The folder pager turns Next off when offset + page length >= total.
		// A finished walk knows the real thread count. A walk that already saw
		// threads past this page reports that count. A walk stopped by the scan
		// cap, with nothing past the page, reports one past the page so Next
		// stays on. This avoids count(distinct) over the whole mailbox.
		if (exhausted) total = distinctKeys.length;
		else if (distinctKeys.length > offset + rows.length) total = distinctKeys.length;
		else total = offset + rows.length + 1;
		const keys = rows.map((row) => row.threadId ?? row.id);
		if (keys.length > 0) {
			const members = await db
				.select({ id: messages.id, key: threadKey })
				.from(messages)
				.where(and(where, inArray(threadKey, keys)));
			for (const member of members) {
				const list = threadMessageIds.get(member.key) ?? [];
				list.push(member.id);
				threadMessageIds.set(member.key, list);
			}
		}
	} else {
		const [totalRow] = await db.select({ total: count() }).from(messages).where(where);
		total = totalRow?.total ?? 0;
		rows = await db
			.select(messageListColumns)
			.from(messages)
			.where(where)
			.orderBy(desc(messages.createdAt))
			.limit(limit)
			.offset(offset);
	}
	// Conversation sizes for the rows on this page, so the list can show "(3)"
	// next to a subject the way threaded clients do.
	const threadIds = Array.from(new Set(rows.map((row) => row.threadId).filter((id): id is string => !!id)));
	const threadCounts = new Map<string, { total: number; unread: number }>();
	if (threadIds.length > 0) {
		const scope = mailboxId
			? eq(messages.mailboxId, mailboxId)
			: accessibleMailboxIds.length > 0
				? inArray(messages.mailboxId, accessibleMailboxIds)
				: eq(messages.userId, user.id);
		const countRows = await db
			.select({
				threadId: messages.threadId,
				total: count(),
				unread: sum(sql`case when ${messages.read} = 0 then 1 else 0 end`),
			})
			.from(messages)
			.where(and(scope, inArray(messages.threadId, threadIds), isNotNull(messages.threadId), notInArray(messages.status, ["draft", "trash"])))
			.groupBy(messages.threadId);
		for (const row of countRows) {
			if (row.threadId) threadCounts.set(row.threadId, { total: row.total, unread: Number(row.unread ?? 0) });
		}
	}
	const mailboxNameMap = new Map(
		accessibleMailboxes.map((mailbox) => [
			mailbox.id,
			mailbox.userId === user.id && tracksAccountIdentity(mailbox, user.email)
				? user.name
				: mailbox.displayName ?? mailbox.localPart,
		]),
	);
	const contactMapsByUserId = new Map(
		await Promise.all(
			Array.from(new Set(rows.map((message) => message.userId))).map(async (userId) => [
				userId,
				await getContactDisplayNameMap(
					env,
					userId,
					rows
						.filter((message) => message.userId === userId)
						.flatMap((message) => [message.fromAddr, getFirstEmailAddressEntry(message.toAddr)]),
				),
			] as const),
		),
	);
	// `Message.textBody`/`htmlBody` are optional on the wire type and the
	// reading pane loads them from /api/messages/[id]/thread, so they are
	// neither selected nor sent here.
	const enrichedRows = rows.map(({ rawR2Key: _rawR2Key, ...message }) => {
		const contactMap = contactMapsByUserId.get(message.userId);
		const accountName = message.mailboxId ? mailboxNameMap.get(message.mailboxId) : null;
		return {
			...message,
			snippet: message.snippet,
			fromContactName:
				(message.direction === "outbound" ? accountName : null) ??
				contactMap?.get(normalizeEmailAddress(message.fromAddr)) ??
				null,
			toContactName: contactMap?.get(normalizeEmailAddress(getFirstEmailAddressEntry(message.toAddr))) ?? null,
			threadCount: (message.threadId && threadCounts.get(message.threadId)?.total) || 1,
			threadUnread: (message.threadId && threadCounts.get(message.threadId)?.unread) || 0,
			...(groupByThread
				? { threadMessageIds: threadMessageIds.get(message.threadId ?? message.id) ?? [message.id] }
				: {}),
		};
	});

	return NextResponse.json({ messages: enrichedRows, total, limit, offset, grouped: groupByThread });
}
