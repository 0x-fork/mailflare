import en from "./en.json";
import ptBR from "./pt-BR.json";
import type { Messages } from "./types";

// Register a catalog and its native display name here (add `dir: "rtl"` for right-to-left scripts). All locale consumers
// (types, validation, cookies, SSR and the selector) derive from this registry.
export const locales = {
	en: { label: "English", messages: en },
	"pt-BR": { label: "Português (Brasil)", messages: ptBR },
} satisfies Record<string, { label: string; messages: Messages; dir?: "rtl" }>;

export type Locale = keyof typeof locales;
export const DEFAULT_LOCALE = "en" satisfies Locale;
export const supportedLocales = Object.keys(locales) as Locale[];
