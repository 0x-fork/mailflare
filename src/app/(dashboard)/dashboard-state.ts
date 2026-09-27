"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth/client";

const emailPath = /^\/(?:inbox|sent|archived|spam|trash|starred|snoozed|drafts)\/[^/]+$|^\/folders\/[^/]+\/[^/]+$/;

export function useDashboardState() {
	const pathname = usePathname();
	const router = useRouter();
	const [assistantOpen, setAssistantOpen] = useState(false);
	const [assistantFullSize, setAssistantFullSize] = useState(false);
	const [storagePrefix, setStoragePrefix] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void authFetch("/api/auth/me", { redirectOnUnauthorized: false }).then(async (response) => {
			if (!response.ok) return;
			const data = await response.json() as { user?: { id?: string } };
			if (cancelled || !data.user?.id) return;
			const prefix = `mailflare-dashboard:${data.user.id}`;
			try {
				setAssistantOpen(localStorage.getItem(`${prefix}:assistant-open`) === "true");
				setAssistantFullSize(localStorage.getItem(`${prefix}:assistant-full-size`) === "true");
				if (window.location.pathname === "/inbox") {
					const savedEmail = localStorage.getItem(`${prefix}:current-email`);
					if (savedEmail && emailPath.test(savedEmail)) router.replace(savedEmail);
				}
			} catch { /* Storage is optional. */ }
			setStoragePrefix(prefix);
		}).catch(() => undefined);
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		if (!storagePrefix) return;
		try {
			localStorage.setItem(`${storagePrefix}:assistant-open`, String(assistantOpen));
			localStorage.setItem(`${storagePrefix}:assistant-full-size`, String(assistantFullSize));
		} catch { /* Storage is optional. */ }
	}, [storagePrefix, assistantOpen, assistantFullSize]);

	useEffect(() => {
		if (!storagePrefix || !emailPath.test(pathname)) return;
		try { localStorage.setItem(`${storagePrefix}:current-email`, pathname); }
		catch { /* Storage is optional. */ }
	}, [storagePrefix, pathname]);

	return { assistantOpen, setAssistantOpen, assistantFullSize, setAssistantFullSize };
}
