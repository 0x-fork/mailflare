"use client";

import { useEffect, useState } from "react";
import { loadComposePreferences, updateComposePreferences } from "@/components/compose/compose-preferences-utils";
import { useLanguage } from "@/components/language-provider";
import { Switch } from "@/components/ui/switch";

/** Account-wide composer defaults; each message can still change them in the composer. */
export function ComposeDefaultsSettings() {
	const { t } = useLanguage();
	const [trackOpens, setTrackOpens] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		void loadComposePreferences()
			.then((preferences) => {
				if (active) setTrackOpens(preferences.trackOpensDefault);
			})
			.catch(() => {
				if (active) setError(t("settings.compose.failed"));
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [t]);

	function change(next: boolean) {
		const previous = trackOpens;
		setTrackOpens(next);
		setSaving(true);
		setError(null);
		void updateComposePreferences({ trackOpensDefault: next })
			.catch((saveError) => {
				setTrackOpens(previous);
				setError(saveError instanceof Error && saveError.message === "MIGRATION_REQUIRED" ? t("settings.compose.migrationRequired") : t("settings.compose.failed"));
			})
			.finally(() => setSaving(false));
	}

	return (
		<div>
			<label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4">
				<span className="flex-1">
					<span className="block text-sm font-medium text-neutral-900">{t("settings.compose.trackOpensTitle")}</span>
					<span className="mt-1 block text-sm text-neutral-500">{t("settings.compose.trackOpensDescription")}</span>
				</span>
				<Switch
					checked={trackOpens}
					disabled={loading || saving}
					onCheckedChange={change}
					aria-label={t("settings.compose.trackOpensTitle")}
				/>
			</label>
			{error && <p role="alert" className="mt-2 px-4 text-sm text-red-600">{error}</p>}
		</div>
	);
}
