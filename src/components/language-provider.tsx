"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, createTranslator, getDirection, resolveLocale, serializeLocaleCookie } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/types";
import type { LanguageState } from "./language-provider-types";

const LanguageContext = createContext<LanguageState>({
	locale: DEFAULT_LOCALE,
	setLocale: () => undefined,
	t: createTranslator(DEFAULT_LOCALE),
});

export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
	const [locale, updateLocale] = useState(initialLocale);
	const value = useMemo<LanguageState>(() => ({ locale, setLocale, t: createTranslator(locale) }), [locale]);

	function setLocale(next: Locale) {
		const nextLocale = resolveLocale(next);
		// Preference cookies can be disabled; the selection still works for this session.
		try {
			document.cookie = serializeLocaleCookie(nextLocale, window.location.protocol === "https:");
		} catch {
			// Keep the in-memory preference when cookie storage is unavailable.
		}
		document.documentElement.lang = nextLocale;
		document.documentElement.dir = getDirection(nextLocale);
		updateLocale(nextLocale);
	}

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	return useContext(LanguageContext);
}
