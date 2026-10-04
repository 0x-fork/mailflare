import type { Locale, TranslationKey } from "@/lib/i18n/types";

export type LanguageState = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: TranslationKey) => string;
};
