import { z } from "zod";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { getAgentProviderConfig, getAgentProviderPublicConfig, resolveAgentBaseUrl } from "@/lib/agent/provider";
import { AGENT_SETTINGS_ID, DEFAULT_CLOUDFLARE_MODEL } from "@/lib/agent/provider-constants";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";

const providerSchema = z.object({
	provider: z.enum(["cloudflare", "compatible"]),
	preset: z.enum(["openai", "openrouter", "groq", "custom"]),
	baseUrl: z.string().max(500),
	apiKey: z.string().max(2_000).optional(),
	model: z.string().trim().min(1).max(200),
});

async function authorize(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return { env, error: session.error };
	if (session.user.role !== "admin") return { env, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
	return { env, error: null };
}

export async function GET(request: Request) {
	const access = await authorize(request);
	if (access.error) return access.error;
	return Response.json({ config: await getAgentProviderPublicConfig(access.env), cloudflareAvailable: !!access.env.AI }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
	const access = await authorize(request);
	if (access.error) return access.error;
	if (!hasValidSessionMutationOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
	const parsed = providerSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: "Invalid provider settings" }, { status: 400 });
	const input = parsed.data;
	if (input.provider === "cloudflare" && !access.env.AI) return Response.json({ error: "Cloudflare Workers AI binding is unavailable" }, { status: 400 });
	let baseUrl: string | null = null;
	let apiKey: string | null = null;
	if (input.provider === "compatible") {
		try { baseUrl = resolveAgentBaseUrl(input.preset, input.baseUrl); }
		catch { return Response.json({ error: "Enter a valid HTTPS provider base URL" }, { status: 400 }); }
		const current = await getAgentProviderConfig(access.env);
		apiKey = input.apiKey?.trim() || (current.provider === "compatible" && current.preset === input.preset && current.baseUrl === baseUrl ? current.apiKey : "") || null;
		if (!apiKey) return Response.json({ error: "Enter an API key for this provider" }, { status: 400 });
	}
	const values = {
		agentProvider: input.provider,
		agentPreset: input.provider === "compatible" ? input.preset : null,
		agentBaseUrl: baseUrl,
		agentApiKey: apiKey,
		agentModel: input.provider === "cloudflare" ? input.model || DEFAULT_CLOUDFLARE_MODEL : input.model,
		updatedAt: new Date(),
	};
	await getDb(access.env).insert(appSettings).values({ id: AGENT_SETTINGS_ID, ...values }).onConflictDoUpdate({ target: appSettings.id, set: values });
	return Response.json({ config: await getAgentProviderPublicConfig(access.env), cloudflareAvailable: !!access.env.AI }, { headers: { "Cache-Control": "no-store" } });
}
