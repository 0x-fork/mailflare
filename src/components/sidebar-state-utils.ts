const SIDEBAR_MINIMAL_STORAGE_KEY = "mailflare-sidebar-minimal";

export function readInitialSidebarMinimal(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const saved = localStorage.getItem(SIDEBAR_MINIMAL_STORAGE_KEY);
		if (saved !== null) return saved === "true";
		const userKeys = Object.keys(localStorage).filter((key) => key.startsWith(`${SIDEBAR_MINIMAL_STORAGE_KEY}:`));
		return userKeys.length === 1 && localStorage.getItem(userKeys[0]) === "true";
	} catch {
		return false;
	}
}

export function saveInitialSidebarMinimal(minimal: boolean): void {
	try {
		localStorage.setItem(SIDEBAR_MINIMAL_STORAGE_KEY, String(minimal));
	} catch {
		// Storage can be unavailable in private windows.
	}
}
