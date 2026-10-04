"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, getMessages, resolveLocale, serializeLocaleCookie, translate } from "@/lib/i18n/utils";
import type { Locale } from "@/lib/i18n/types";
import type { LanguageState } from "./language-provider-types";

const LanguageContext = createContext<LanguageState>({
	locale: DEFAULT_LOCALE,
	setLocale: () => undefined,
	t: (key) => translate(getMessages(DEFAULT_LOCALE), key),
});

export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
	const [locale, updateLocale] = useState(initialLocale);

	function setLocale(value: Locale) {
		const nextLocale = resolveLocale(value);
		// Preference cookies can be disabled; the selection still works for this session.
		try {
			document.cookie = serializeLocaleCookie(nextLocale, window.location.protocol === "https:");
		} catch {
			// Keep the in-memory preference when cookie storage is unavailable.
		}
		document.documentElement.lang = nextLocale;
		updateLocale(nextLocale);
	}

	return (
		<LanguageContext.Provider value={{ locale, setLocale, t: (key) => translate(getMessages(locale), key) }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	return useContext(LanguageContext);
}
