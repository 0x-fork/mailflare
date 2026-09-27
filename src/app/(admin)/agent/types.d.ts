import type { AgentModelOption, AgentProviderKind, AgentProviderPreset, AgentProviderPublicConfig } from "@/lib/agent/provider-types";

export type AgentAdminConfig = AgentProviderPublicConfig;
export type AgentAdminSettingsResponse = { config: AgentAdminConfig; cloudflareAvailable: boolean; error?: string };
export type AgentAdminModelsResponse = { models: AgentModelOption[]; source: "catalog" | "suggested"; error?: string };
export type AgentAdminForm = { provider: AgentProviderKind; preset: AgentProviderPreset; baseUrl: string; apiKey: string; model: string };
