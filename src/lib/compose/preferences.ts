import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userComposePreferences } from "@/db/schema";
import { isMissingTableError } from "@/lib/database-errors";
import type { ComposePreferences } from "./types";

const DEFAULTS: ComposePreferences = { trackOpensDefault: false };

export class ComposePreferencesUnavailableError extends Error {
	constructor() {
		super("Apply pending database migrations first");
	}
}

/** The user's composer defaults; before migration 0072 everyone gets the defaults. */
export async function getComposePreferences(env: CloudflareEnv, userId: string): Promise<ComposePreferences> {
	try {
		const [row] = await getDb(env)
			.select({ trackOpensDefault: userComposePreferences.trackOpensDefault })
			.from(userComposePreferences)
			.where(eq(userComposePreferences.userId, userId))
			.limit(1);
		return row ?? DEFAULTS;
	} catch (error) {
		if (isMissingTableError(error)) return DEFAULTS;
		throw error;
	}
}

export async function setComposePreferences(env: CloudflareEnv, userId: string, preferences: ComposePreferences): Promise<ComposePreferences> {
	const values = { trackOpensDefault: preferences.trackOpensDefault, updatedAt: new Date() };
	try {
		await getDb(env)
			.insert(userComposePreferences)
			.values({ userId, ...values })
			.onConflictDoUpdate({ target: userComposePreferences.userId, set: values });
	} catch (error) {
		if (isMissingTableError(error)) throw new ComposePreferencesUnavailableError();
		throw error;
	}
	return { trackOpensDefault: preferences.trackOpensDefault };
}
