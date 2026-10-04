# Interface languages

Mailflare defaults to English. The expanded sidebar has a **Language** selector with English and Português (Brasil). Expand the menu first if the sidebar is collapsed; on phones, open the menu to reach the selector.

## Current coverage

This first translation covers the email sidebar: system folders, expand/collapse controls, the custom-folder creation dialog, shortcut button, footer, and language selector. Custom folder names and mailbox names remain user content. Shared sidebar controls are also translated when used in other sections.

The rest of the interface is still in English, including account menus, login, message lists, the composer, calendar, settings, administration pages, shortcut help, API errors, notifications and system emails. Selecting Portuguese does not translate email content, change routes or system-folder identifiers, or change date/time formatting.

## Preference and rendering

The selection applies immediately and is saved in the host-only `mailflare-locale` cookie for one year (`Path=/`, `SameSite=Lax`, `Secure` on HTTPS). It is a browser preference shared across accounts on the same installation. If cookies are blocked, the current selection works until the page is reloaded.

The root layout reads the cookie with `await cookies()`, normalizes it to `en` or `pt-BR`, and uses the same value for `<html lang>` and the client language provider. This makes pages use request-time rendering, including otherwise static pages. A missing or unsupported cookie selects English. Client navigation preserves the provider state; reloading or opening a new tab restores the cookie selection. This version does not synchronize changes into tabs that are already open.

## Adding translations

Catalogs are flat JSON objects in `src/lib/i18n/en.json` and `src/lib/i18n/pt-BR.json`. Add the English key and the Portuguese translation together. `TranslationKey` derives from the English catalog, and each locale implements the same `Messages` type. `translate()` falls back to English for an absent entry.

Client components use `useLanguage().t(key)`. Keep routes, storage keys, permission checks, API values and user content independent of translated display text. Extend coverage gradually rather than replacing strings throughout the app in one change.

Run `node --test tests/i18n.test.mjs` for catalog parity, fallback, cookie attributes, selector labels, server rendering and root-layout locale agreement. Also run lint, `npx tsc --noEmit` and the applicable build when changing the integration.
