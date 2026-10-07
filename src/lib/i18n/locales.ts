import en from "./en.json";

type LocaleEntry = {
	/** The language's own name, shown in the selector. */
	label: string;
	/** Set for right-to-left scripts. */
	dir?: "rtl";
	/** English ships in the main bundle as the fallback; every other catalog is fetched when first needed. */
	load: () => Promise<Record<string, string>>;
};

// Register a language here with its native name, and add its catalog file next to `en.json`.
// Types, validation, cookies, SSR and the selector all derive from this registry.
export const locales = {
	en: { label: "English", load: async () => en },
	"pt-BR": { label: "Português (Brasil)", load: async () => (await import("./pt-BR.json")).default },
	es: { label: "Español", load: async () => (await import("./es.json")).default },
	fr: { label: "Français", load: async () => (await import("./fr.json")).default },
	de: { label: "Deutsch", load: async () => (await import("./de.json")).default },
} satisfies Record<string, LocaleEntry>;

export type Locale = keyof typeof locales;
export const DEFAULT_LOCALE = "en" satisfies Locale;
export const supportedLocales = Object.keys(locales) as Locale[];
