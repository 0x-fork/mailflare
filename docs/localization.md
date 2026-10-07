# Interface languages

Mailflare defaults to English. The expanded sidebar has a **Language** selector with English and Português (Brasil). Expand the menu first if the sidebar is collapsed; on phones, open the menu to reach the selector.

## Current coverage

This first translation covers the email sidebar: system folders, expand/collapse controls, the custom-folder creation dialog, shortcut button, footer, and language selector. Custom folder names and mailbox names remain user content. Shared sidebar controls are also translated when used in other sections.

The rest of the interface is still in English, including account menus, login, message lists, the composer, calendar, settings, administration pages, shortcut help, API errors, notifications and system emails. Selecting Portuguese does not translate email content, change routes or system-folder identifiers, or change date/time formatting.

## Preference and rendering

The selection applies immediately and is saved in the host-only `mailflare-locale` cookie for one year (`Path=/`, `SameSite=Lax`, `Secure` on HTTPS). It is a browser preference shared across accounts on the same installation. If cookies are blocked, the current selection works until the page is reloaded.

The root layout reads the cookie with `await cookies()`, validates it against the locale registry, and uses the same value for `<html lang>` and the client language provider. This makes pages use request-time rendering, including otherwise static pages. A missing or unsupported cookie selects English. Client navigation preserves the provider state; reloading or opening a new tab restores the cookie selection. This version does not synchronize changes into tabs that are already open.

## Adding translations

Catalogs are flat JSON objects in `src/lib/i18n/`. English (`en.json`) defines `TranslationKey` and `Messages`; registered catalogs must contain all English keys with string values. Add new English keys and update registered translations together. `translate()` retains a per-key English fallback.

To add another language:

1. Copy `en.json` to a new catalog, for example `es.json`, and translate its values without changing the keys.
2. Import the catalog in `src/lib/i18n/locales.ts` and add one registry entry with its BCP 47 locale code and native display name:

   ```ts
   import es from "./es.json";

   // Inside locales:
   es: { label: "Español", messages: es },
   ```

That is the only registration point. The `Locale` type, supported-locale validation, cookie handling, server-rendered HTML and selector options all derive from it. No provider, layout, selector or utility changes are needed. English remains the default. For a right-to-left language add `dir: "rtl"` to the entry; the layout and provider then set `<html dir>`. Catalogs are currently bundled eagerly; this small initial scope does not add lazy loading or locale-specific date formatting.

Client components use `useLanguage().t(key, vars?)`; server code uses `createTranslator(locale)` from `src/lib/i18n/utils.ts`, which returns the same function. Strings interpolate `{name}` placeholders from `vars`. For plurals, add `key.one`, `key.other` (and any other CLDR categories the language needs) to **every** catalog, then call `t("key", { count })`; the variant is picked with `Intl.PluralRules`, falling back to the bare key. The dialog close button uses the translated `navigation.close` automatically.

 Keep routes, storage keys, permission checks, API values and user content independent of translated display text. Extend coverage gradually rather than replacing strings throughout the app in one change.

Run `node --test tests/i18n.test.mjs` for catalog parity, fallback, cookie attributes, selector labels, server rendering and root-layout locale agreement. An isolated test registers a third language and verifies that resolution, translations, cookie persistence, selector options and SSR pick it up without changing any consumers. Also run lint, `npx tsc --noEmit` and the applicable build when changing the integration.
