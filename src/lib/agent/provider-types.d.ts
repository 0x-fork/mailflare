export type AgentProviderKind = "cloudflare" | "compatible";
export type AgentProviderPreset = "openai" | "openrouter" | "groq" | "custom";

export type AgentProviderConfig = {
	provider: AgentProviderKind;
	preset: AgentProviderPreset;
	baseUrl: string;
	apiKey: string;
	model: string;
	source: "saved" | "environment" | "default";
};

export type AgentProviderPublicConfig = Omit<AgentProviderConfig, "apiKey"> & {
	hasApiKey: boolean;
	configured: boolean;
};

export type AgentModelOption = { id: string; name: string };
