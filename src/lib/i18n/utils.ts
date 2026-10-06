import en from "./en.json";
import { DEFAULT_LOCALE, locales } from "./locales";
import type { Locale, Messages, TranslationKey } from "./types";

export { DEFAULT_LOCALE } from "./locales";
export const LOCALE_COOKIE = "mailflare-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function resolveLocale(value: unknown): Locale {
	return typeof value === "string" && Object.hasOwn(locales, value) ? value as Locale : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
	return locales[locale].messages;
}

export function translate(messages: Partial<Messages>, key: TranslationKey): string {
	return messages[key] ?? en[key];
}

export function serializeLocaleCookie(locale: Locale, secure: boolean): string {
	return `${LOCALE_COOKIE}=${resolveLocale(locale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
