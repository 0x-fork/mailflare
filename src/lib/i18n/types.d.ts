import type en from "./en.json";

export type Locale = "en" | "pt-BR";
export type TranslationKey = keyof typeof en;
export type Messages = Record<TranslationKey, string>;
