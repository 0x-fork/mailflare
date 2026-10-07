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
	ru: { label: "Русский", load: async () => (await import("./ru.json")).default },
	"zh-CN": { label: "中文（简体）", load: async () => (await import("./zh-CN.json")).default },
	ja: { label: "日本語", load: async () => (await import("./ja.json")).default },
	id: { label: "Bahasa Indonesia", load: async () => (await import("./id.json")).default },
	tr: { label: "Türkçe", load: async () => (await import("./tr.json")).default },
	vi: { label: "Tiếng Việt", load: async () => (await import("./vi.json")).default },
	hi: { label: "हिन्दी", load: async () => (await import("./hi.json")).default },
	ar: { label: "العربية", dir: "rtl", load: async () => (await import("./ar.json")).default },
	bn: { label: "বাংলা", load: async () => (await import("./bn.json")).default },
	ur: { label: "اردو", dir: "rtl", load: async () => (await import("./ur.json")).default },
} satisfies Record<string, LocaleEntry>;

export type Locale = keyof typeof locales;
export const DEFAULT_LOCALE = "en" satisfies Locale;
export const supportedLocales = Object.keys(locales) as Locale[];
