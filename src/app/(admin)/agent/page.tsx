"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CLOUDFLARE_MODEL } from "@/lib/agent/provider-constants";
import type { AgentModelOption, AgentProviderPreset } from "@/lib/agent/provider-types";
import type { AgentAdminForm } from "./types";
import { baseUrlForPreset, loadAgentAdminSettings, loadAgentModels, PROVIDER_PRESETS, saveAgentAdminSettings } from "./utils";

const initialForm: AgentAdminForm = { provider: "cloudflare", preset: "openai", baseUrl: "", apiKey: "", model: DEFAULT_CLOUDFLARE_MODEL };

export default function AdminAgentPage() {
	const [form, setForm] = useState<AgentAdminForm>(initialForm);
	const [loaded, setLoaded] = useState(false);
	const [cloudflareAvailable, setCloudflareAvailable] = useState(false);
	const [hasSavedKey, setHasSavedKey] = useState(false);
	const [savedEndpoint, setSavedEndpoint] = useState("");
	const [models, setModels] = useState<AgentModelOption[]>([]);
	const [modelSource, setModelSource] = useState<"catalog" | "suggested" | null>(null);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelError, setModelError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let active = true;
		void loadAgentAdminSettings().then((data) => {
			if (!active) return;
			setForm({ provider: data.config.provider, preset: data.config.preset, baseUrl: data.config.baseUrl, apiKey: "", model: data.config.model });
			setCloudflareAvailable(data.cloudflareAvailable);
			setHasSavedKey(data.config.hasApiKey);
			setSavedEndpoint(`${data.config.preset}|${data.config.baseUrl}`);
			setLoaded(true);
		}).catch((error) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load agent settings"); });
		return () => { active = false; };
	}, []);

	const canUseSavedKey = hasSavedKey && savedEndpoint === `${form.preset}|${form.baseUrl}`;
	useEffect(() => {
		if (!loaded) return;
		setModels([]);
		setModelSource(null);
		setModelError(null);
		if (form.provider === "compatible" && (!form.baseUrl || (!form.apiKey.trim() && !canUseSavedKey))) {
			setModelError(form.preset === "custom" && !form.baseUrl ? "Enter an HTTPS base URL to load models." : "Enter an API key to load models.");
			return;
		}
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			setModelsLoading(true);
			void loadAgentModels(form, controller.signal).then((data) => {
				setModels(data.models);
				setModelSource(data.source);
			}).catch((error) => {
				if (!controller.signal.aborted) setModelError(error instanceof Error ? error.message : "Could not load models");
			}).finally(() => { if (!controller.signal.aborted) setModelsLoading(false); });
		}, form.provider === "cloudflare" ? 0 : 500);
		return () => { window.clearTimeout(timer); controller.abort(); };
	}, [loaded, form.provider, form.preset, form.baseUrl, form.apiKey, canUseSavedKey]);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setStatus(null);
		try {
			const data = await saveAgentAdminSettings(form);
			setForm((current) => ({ ...current, apiKey: "" }));
			setHasSavedKey(data.config.hasApiKey);
			setSavedEndpoint(`${data.config.preset}|${data.config.baseUrl}`);
			setStatus("Agent provider saved. New chats and auto-drafts will use this model.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Could not save agent settings");
		} finally { setSaving(false); }
	}

	return <div className="space-y-6">
		<div><h1 className="text-3xl font-medium text-neutral-900">Agent</h1><p className="mt-2 text-sm text-neutral-500">Choose the AI provider and model used by the email assistant for chat and drafts.</p></div>
		<Card className="rounded-3xl border-0 bg-white p-6">
			<CardHeader className="py-0"><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />AI provider</CardTitle><CardDescription>Email content is sent to the selected provider when someone uses the assistant. Sending a draft still requires human approval.</CardDescription></CardHeader>
			<CardContent className="pt-6"><form onSubmit={submit} className="space-y-5">
				<div className="space-y-2"><Label htmlFor="agent-provider">Provider</Label><select id="agent-provider" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.provider} disabled={!loaded} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as AgentAdminForm["provider"], baseUrl: event.target.value === "compatible" ? baseUrlForPreset(current.preset, current.baseUrl) : "", model: event.target.value === "cloudflare" ? DEFAULT_CLOUDFLARE_MODEL : "" }))}><option value="cloudflare">Cloudflare Workers AI</option><option value="compatible">OpenAI-compatible provider</option></select>{form.provider === "cloudflare" && !cloudflareAvailable && <p className="text-xs text-amber-700">Cloudflare Workers AI requires an AI binding on this installation.</p>}</div>
				{form.provider === "compatible" && <>
					<div className="space-y-2"><Label htmlFor="agent-preset">Provider template</Label><select id="agent-preset" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.preset} onChange={(event) => { const preset = event.target.value as AgentProviderPreset; setForm((current) => ({ ...current, preset, baseUrl: baseUrlForPreset(preset), apiKey: "", model: "" })); }}>{PROVIDER_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
					<div className="space-y-2"><Label htmlFor="agent-url">API base URL</Label><Input id="agent-url" type="url" value={form.baseUrl} readOnly={form.preset !== "custom"} placeholder="https://provider.example/v1" onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value, model: "" }))} required /></div>
					<div className="space-y-2"><Label htmlFor="agent-key">API key</Label><Input id="agent-key" type="password" value={form.apiKey} autoComplete="new-password" placeholder={canUseSavedKey ? "Saved key (leave blank to keep)" : "Enter API key"} onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))} /><p className="text-xs text-neutral-500">{canUseSavedKey ? "An API key is saved on the server. Enter a new one to replace it." : "The API key is stored on the server and is never shown again."}</p></div>
				</>}
				<div className="space-y-2"><Label htmlFor="agent-model">Model</Label><select id="agent-model" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={models.some((item) => item.id === form.model) ? form.model : ""} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} disabled={!models.length}><option value="">{modelsLoading ? "Loading models…" : models.length ? "Choose a model" : "Models unavailable"}</option>{models.map((item) => <option key={item.id} value={item.id}>{item.name === item.id ? item.id : `${item.name} · ${item.id}`}</option>)}</select>{modelSource === "suggested" && <p className="text-xs text-neutral-500">Showing suggested Cloudflare models because a full catalog is unavailable.</p>}{modelError && <p className="text-xs text-amber-700">{modelError}</p>}<Label htmlFor="agent-model-id" className="block pt-2 text-xs text-neutral-500">Or enter a model ID</Label><Input id="agent-model-id" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder={form.provider === "cloudflare" ? DEFAULT_CLOUDFLARE_MODEL : "provider/model-id"} required /><p className="text-xs text-neutral-500">Choose a model that supports tool calling so the assistant can read mail and create drafts.</p></div>
				{status && <p role="status" className="text-sm text-neutral-700">{status}</p>}
				<Button type="submit" disabled={!loaded || saving || !form.model.trim() || (form.provider === "cloudflare" && !cloudflareAvailable) || (form.provider === "compatible" && (!form.baseUrl || (!form.apiKey.trim() && !canUseSavedKey))) }>{saving ? "Saving…" : "Save agent settings"}</Button>
			</form></CardContent>
		</Card>
	</div>;
}
