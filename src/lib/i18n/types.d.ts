import type en from "./en.json";

export type { Locale } from "./locales";
export type TranslationKey = keyof typeof en;
export type Messages = Record<TranslationKey, string>;
