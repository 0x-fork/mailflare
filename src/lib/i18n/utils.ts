import en from "./en.json";
import ptBR from "./pt-BR.json";
import type { Locale, Messages, TranslationKey } from "./types";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "mailflare-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const catalogs: Record<Locale, Messages> = { en, "pt-BR": ptBR };

export function resolveLocale(value: unknown): Locale {
	return value === "pt-BR" ? "pt-BR" : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
	return catalogs[locale];
}

export function translate(messages: Partial<Messages>, key: TranslationKey): string {
	return messages[key] ?? en[key];
}

export function serializeLocaleCookie(locale: Locale, secure: boolean): string {
	return `${LOCALE_COOKIE}=${resolveLocale(locale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
