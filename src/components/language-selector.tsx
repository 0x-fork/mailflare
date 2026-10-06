"use client";

import { useId } from "react";
import { locales, supportedLocales } from "@/lib/i18n/locales";
import { resolveLocale } from "@/lib/i18n/utils";
import { useLanguage } from "./language-provider";

export function LanguageSelector() {
	const id = useId();
	const { locale, setLocale, t } = useLanguage();
	return (
		<div className="flex flex-col gap-1 px-1">
			<label htmlFor={id} className="text-xs text-neutral-600">{t("language.label")}</label>
			<select id={id} value={locale} onChange={(event) => setLocale(resolveLocale(event.target.value))} className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
				{supportedLocales.map((value) => (
					<option key={value} value={value} lang={value}>{locales[value].label}</option>
				))}
			</select>
		</div>
	);
}
