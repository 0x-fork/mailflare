import en from "./en.json";
import { DEFAULT_LOCALE, locales } from "./locales";
import type { Locale, Messages, TranslationKey } from "./types";

export { DEFAULT_LOCALE } from "./locales";
export const LOCALE_COOKIE = "mailflare-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function resolveLocale(value: unknown): Locale {
	return typeof value === "string" && Object.hasOwn(locales, value) ? value as Locale : DEFAULT_LOCALE;
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
	return (locales[locale] as { dir?: "rtl" }).dir ?? "ltr";
}

export function getMessages(locale: Locale): Messages {
	return locales[locale].messages;
}

export type TranslationVars = Record<string, string | number>;
export type Translator = (key: TranslationKey, vars?: TranslationVars) => string;

function interpolate(template: string, vars?: TranslationVars): string {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : match));
}

export function translate(messages: Partial<Messages>, key: TranslationKey, vars?: TranslationVars): string {
	return interpolate(messages[key] ?? en[key], vars);
}

// Server-safe translator. A numeric `count` var selects a plural variant: with
// `inbox.unread.one` / `inbox.unread.other` catalog entries, `t("inbox.unread", { count })`
// uses the locale's CLDR category and falls back to the bare key when no variant exists.
export function createTranslator(locale: Locale): Translator {
	const messages: Partial<Record<string, string>> = getMessages(locale);
	const rules = new Intl.PluralRules(locale);
	return (key, vars) => {
		const count = vars?.count;
		if (typeof count === "number") {
			const variant = `${key}.${rules.select(count)}` as TranslationKey;
			if (messages[variant] !== undefined || (en as Record<string, string>)[variant] !== undefined) return translate(getMessages(locale), variant, vars);
		}
		return translate(getMessages(locale), key, vars);
	};
}

export function serializeLocaleCookie(locale: Locale, secure: boolean): string {
	return `${LOCALE_COOKIE}=${resolveLocale(locale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
