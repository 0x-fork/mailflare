import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { AgentProviderConfig, AgentProviderPreset, AgentProviderPublicConfig } from "./provider-types";
import { AGENT_SETTINGS_ID, DEFAULT_CLOUDFLARE_MODEL, PROVIDER_BASE_URLS } from "./provider-constants";

export function resolveAgentBaseUrl(preset: AgentProviderPreset, customUrl: string) {
	if (preset !== "custom") return PROVIDER_BASE_URLS[preset];
	const url = new URL(customUrl.trim());
	if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Custom provider URL must be an HTTPS base URL without credentials or query parameters");
	return url.toString().replace(/\/$/, "");
}

export async function getAgentProviderConfig(env: CloudflareEnv): Promise<AgentProviderConfig> {
	const [saved] = await getDb(env).select({ provider: appSettings.agentProvider, preset: appSettings.agentPreset, baseUrl: appSettings.agentBaseUrl, apiKey: appSettings.agentApiKey, model: appSettings.agentModel }).from(appSettings).where(eq(appSettings.id, AGENT_SETTINGS_ID)).limit(1);
	if (saved?.provider === "cloudflare") return { provider: "cloudflare", preset: "openai", baseUrl: "", apiKey: "", model: saved.model || env.AI_MODEL || DEFAULT_CLOUDFLARE_MODEL, source: "saved" };
	if (saved?.provider === "compatible") {
		const preset = saved.preset || "custom";
		const baseUrl = resolveAgentBaseUrl(preset, saved.baseUrl || "");
		return { provider: "compatible", preset, baseUrl, apiKey: saved.apiKey || (env.AI_BASE_URL === baseUrl ? env.AI_API_KEY : "") || "", model: saved.model || "", source: "saved" };
	}
	if (env.AI) return { provider: "cloudflare", preset: "openai", baseUrl: "", apiKey: "", model: env.AI_MODEL || DEFAULT_CLOUDFLARE_MODEL, source: "environment" };
	if (env.AI_BASE_URL && env.AI_API_KEY) return { provider: "compatible", preset: "custom", baseUrl: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: env.AI_MODEL || "gpt-4o-mini", source: "environment" };
	return { provider: "cloudflare", preset: "openai", baseUrl: "", apiKey: "", model: DEFAULT_CLOUDFLARE_MODEL, source: "default" };
}

export async function getAgentProviderPublicConfig(env: CloudflareEnv): Promise<AgentProviderPublicConfig> {
	const { apiKey, ...config } = await getAgentProviderConfig(env);
	return { ...config, hasApiKey: !!apiKey, configured: config.provider === "cloudflare" ? !!env.AI : !!apiKey && !!config.baseUrl && !!config.model };
}
