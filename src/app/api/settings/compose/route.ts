import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { ComposePreferencesUnavailableError, getComposePreferences, setComposePreferences } from "@/lib/compose/preferences";

export async function GET(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	return NextResponse.json(await getComposePreferences(env, auth.user.id));
}

export async function PATCH(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;
	const body = (await request.json().catch(() => null)) as { trackOpensDefault?: unknown } | null;
	if (typeof body?.trackOpensDefault !== "boolean") {
		return NextResponse.json({ error: "trackOpensDefault must be a boolean" }, { status: 400 });
	}
	try {
		return NextResponse.json(await setComposePreferences(env, auth.user.id, { trackOpensDefault: body.trackOpensDefault }));
	} catch (error) {
		if (error instanceof ComposePreferencesUnavailableError) {
			return NextResponse.json({ error: error.message, code: "MIGRATION_REQUIRED" }, { status: 409 });
		}
		throw error;
	}
}
