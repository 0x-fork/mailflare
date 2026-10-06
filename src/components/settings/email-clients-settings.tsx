"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, KeyRound } from "lucide-react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJmapApiKey } from "./utils";

/** Upper bound `POST /api/api-keys` places on `mailboxIds`. */
const MAX_KEY_MAILBOXES = 30;

/**
 * Settings > App passwords card for connecting an external mail app over JMAP.
 * Mints a mailbox-scoped API key with the `jmap` scope and shows the details once.
 * `POST /api/api-keys` requires `mailboxIds` for mail scopes, and a JMAP session
 * only lists the mailboxes a key was granted, so the card asks which to include.
 */
export function EmailClientsSettings() {
	const { mailboxes, selectedMailbox, isLoading } = useSelectedMailbox();
	const [name, setName] = useState("");
	// `null` until the user changes the selection, which means every accessible mailbox —
	// the same set a key could see before keys were mailbox-scoped. The API accepts at
	// most 30 mailboxes per key, so past that the default is just the current mailbox.
	const [chosenMailboxIds, setChosenMailboxIds] = useState<string[] | null>(null);
	const mailboxIds = chosenMailboxIds ?? (mailboxes.length <= MAX_KEY_MAILBOXES ? mailboxes.map((mailbox) => mailbox.id) : [selectedMailbox?.id ?? mailboxes[0]?.id].filter((id): id is string => !!id));
	const [key, setKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [copied, setCopied] = useState<string | null>(null);
	const server = typeof window !== "undefined" ? window.location.origin : "";

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			setKey(await createJmapApiKey(name.trim() || "Mail app", mailboxIds));
			setName("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not create a key");
		} finally {
			setBusy(false);
		}
	}

	function copy(label: string, value: string) {
		void navigator.clipboard.writeText(value).then(() => setCopied(label));
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-neutral-500">
				App Password for email clients that support JMAP. Point the app at this server and sign in with your email address and an API key as the password.
			</p>
			{key ? (
				<div className="space-y-3 rounded-2xl bg-neutral-50 p-4">
					<Field label="Server" value={server} onCopy={copy} copied={copied} />
					<Field label="Username" value="any value" onCopy={copy} copied={copied} />
					<Field label="Password (API key)" value={key} onCopy={copy} copied={copied} mono />
					<p className="text-xs text-neutral-500">
						This key is shown once. You can revoke it in <Link href="/settings/api-keys" className="text-blue-700 underline">API keys</Link>. Session discovery is at <code>{server}/.well-known/jmap</code>.
					</p>
				</div>
			) : (
				<form onSubmit={submit} className="space-y-4">
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-56 flex-1 space-y-2">
							<Label htmlFor="jmap-key-name">Device or app name</Label>
							<Input id="jmap-key-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Phone" />
						</div>
						<Button type="submit" disabled={busy || isLoading || !mailboxIds.length || mailboxIds.length > MAX_KEY_MAILBOXES}>
							<KeyRound className="h-4 w-4" />
							{busy ? "Creating..." : "Create app password"}
						</Button>
					</div>
					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Mailboxes this app can use</legend>
						{isLoading ? (
							<p className="text-sm text-neutral-500">Loading mailboxes...</p>
						) : mailboxes.length === 0 ? (
							<p className="text-sm text-neutral-500">No accessible mailboxes.</p>
						) : (
							mailboxes.map((mailbox) => (
								<label key={mailbox.id} className="flex items-center gap-3 text-sm">
									<Checkbox
										checked={mailboxIds.includes(mailbox.id)}
										onChange={(event) => setChosenMailboxIds(event.target.checked ? [...mailboxIds, mailbox.id] : mailboxIds.filter((id) => id !== mailbox.id))}
									/>
									{mailbox.localPart}@{mailbox.hostname}
								</label>
							))
						)}
						<p className="text-xs text-neutral-500">Aliases share their parent mailbox and are included with it. Up to {MAX_KEY_MAILBOXES} mailboxes per key.</p>
					</fieldset>
					{error && <p className="w-full text-sm text-red-600">{error}</p>}
				</form>
			)}
		</div>
	);
}

function Field({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy: (label: string, value: string) => void; copied: string | null; mono?: boolean }) {
	return (
		<div className="flex items-center gap-3">
			<span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
			<code className={`min-w-0 flex-1 truncate rounded-md bg-white px-2 py-1 text-sm ${mono ? "font-mono" : "font-sans"}`}>{value}</code>
			<Button type="button" variant="ghost" size="sm" onClick={() => onCopy(label, value)} aria-label={`Copy ${label}`}>
				<Copy className="h-4 w-4" />
				{copied === label ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
