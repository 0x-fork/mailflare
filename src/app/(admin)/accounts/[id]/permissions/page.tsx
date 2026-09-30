"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { ManagedAccount } from "../types";
import { fetchManagedAccount, saveManagedAccount } from "../utils";

export default function AccountPermissionsPage() {
	const { id } = useParams<{ id: string }>();
	const [account, setAccount] = useState<ManagedAccount | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		void fetchManagedAccount(id)
			.then(setAccount)
			.catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load permissions"));
	}, [id]);

	async function savePermissions() {
		if (!account) return;
		setSaving(true);
		setMessage(null);
		try {
			await saveManagedAccount(account);
			setMessage("Permissions updated");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to update permissions");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-medium text-neutral-900">Permissions</h1>
				<p className="mt-2 text-sm text-neutral-500">Control what this account can manage.</p>
			</div>
			<section className="space-y-3 rounded-3xl bg-white p-6">
				<label htmlFor="account-role" className="block text-sm font-semibold text-neutral-900">Role</label>
				<Select
					id="account-role"
					value={account?.role ?? "user"}
					disabled={!account || saving}
					containerClassName="w-full sm:w-64"
					className="h-10 text-sm"
					onChange={(event) => account && setAccount({ ...account, role: event.target.value === "admin" ? "admin" : "user" })}
				>
					<option value="user">User</option>
					<option value="admin">Admin</option>
				</Select>
				<p className="text-xs text-neutral-500">Admins can access administration pages and manage Team settings.</p>
			</section>
			<div className="overflow-hidden rounded-3xl bg-white">
				<table className="w-full text-left">
					<thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
						<tr>
							<th className="px-5 py-3">Permission</th>
							<th className="w-28 px-5 py-3 text-center">Allowed</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						<tr>
							<td className="px-5 py-4">
								<p className="text-sm font-semibold text-neutral-900">Manage mailboxes</p>
								<p className="mt-1 text-xs text-neutral-500">Allow this account to add and remove its own inboxes.</p>
							</td>
							<td className="px-5 py-4 text-center">
								<Checkbox
									aria-label="Allow mailbox management"
									checked={account?.canManageMailboxes ?? false}
									disabled={!account}
									onChange={(event) => account && setAccount({ ...account, canManageMailboxes: event.target.checked })}
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<Button onClick={() => void savePermissions()} disabled={!account || saving}>
				{saving ? "Saving..." : "Save permissions"}
			</Button>
			{message && <p className="text-sm text-neutral-500">{message}</p>}
		</div>
	);
}
