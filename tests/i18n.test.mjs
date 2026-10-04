import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-i18n-"));
after(() => rmSync(outDir, { recursive: true, force: true }));
const outfile = join(outDir, "i18n.mjs");

await build({
	stdin: {
		contents: `
			import { createElement } from "react";
			import { renderToStaticMarkup } from "react-dom/server";
			import RootLayout from "./src/app/layout";
			import { LanguageProvider, useLanguage } from "./src/components/language-provider";
			import { LanguageSelector } from "./src/components/language-selector";
			export * from "./src/lib/i18n/utils";
			function Probe() { return createElement("span", null, useLanguage().t("navigation.inbox")); }
			export function renderLanguage(locale) {
				return renderToStaticMarkup(createElement(LanguageProvider, { initialLocale: locale }, createElement(Probe), createElement(LanguageSelector)));
			}
			export async function renderLayout(cookieValue) {
				globalThis.testLocaleCookie = cookieValue;
				return renderToStaticMarkup(await RootLayout({ children: createElement(Probe) }));
			}
		`,
		resolveDir: root,
		loader: "tsx",
	},
	outfile,
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
	alias: { "@": join(root, "src") },
	banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
	plugins: [{
		name: "layout-runtime-stubs",
		setup(builder) {
			builder.onResolve({ filter: /^(next\/headers|next\/font\/google|@\/components\/providers)$/ }, (args) => ({ path: args.path, namespace: "stub" }));
			builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: path === "next/headers"
				? 'export async function cookies() { return { get(name) { return name === "mailflare-locale" && globalThis.testLocaleCookie !== undefined ? { value: globalThis.testLocaleCookie } : undefined; } }; }'
				: path === "next/font/google"
					? 'export const Geist = () => ({ variable: "sans" }); export const Geist_Mono = () => ({ variable: "mono" });'
					: 'export function Providers({ children }) { return children; }' }));
			builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
		},
	}],
});

const i18n = await import(pathToFileURL(outfile).href);
const en = JSON.parse(readFileSync(join(root, "src/lib/i18n/en.json"), "utf8"));
const ptBR = JSON.parse(readFileSync(join(root, "src/lib/i18n/pt-BR.json"), "utf8"));

test("Portuguese has exactly the English keys and all messages are nonempty strings", () => {
	assert.deepEqual(Object.keys(ptBR).sort(), Object.keys(en).sort());
	for (const catalog of [en, ptBR]) {
		for (const value of Object.values(catalog)) assert.ok(typeof value === "string" && value.trim().length > 0);
	}
});

test("missing, invalid and unsupported locale values fall back to English", () => {
	for (const value of [undefined, null, "", "pt", "pt-br", "fr", "pt-BR; Path=/", {}]) assert.equal(i18n.resolveLocale(value), "en");
	assert.equal(i18n.resolveLocale("en"), "en");
	assert.equal(i18n.resolveLocale("pt-BR"), "pt-BR");
});

test("translation uses the requested catalog and falls back per key", () => {
	assert.equal(i18n.translate(i18n.getMessages("pt-BR"), "navigation.inbox"), "Caixa de entrada");
	assert.equal(i18n.translate({}, "navigation.inbox"), "Inbox");
});

test("preference cookie persists for a year, covers every path and is Secure on HTTPS", () => {
	assert.equal(i18n.serializeLocaleCookie("pt-BR", true), "mailflare-locale=pt-BR; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
	assert.equal(i18n.serializeLocaleCookie("en", false), "mailflare-locale=en; Path=/; Max-Age=31536000; SameSite=Lax");
	assert.equal(i18n.serializeLocaleCookie("bad; Domain=example.com", true), "mailflare-locale=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
});

test("provider server rendering uses initial locale and labels the native language selector", () => {
	const pt = i18n.renderLanguage("pt-BR");
	assert.match(pt, /Caixa de entrada/);
	assert.match(pt, /<label for="[^"]+"[^>]*>Idioma<\/label>/);
	assert.match(pt, /<select id="[^"]+"/);
	assert.match(pt, /value="pt-BR" lang="pt-BR" selected=""/);
	assert.match(i18n.renderLanguage("en"), /value="en" lang="en" selected=""/);
});

test("root layout passes the same cookie locale to HTML and provider on first render", async () => {
	const pt = await i18n.renderLayout("pt-BR");
	assert.match(pt, /<html lang="pt-BR"/);
	assert.match(pt, /Caixa de entrada/);
	for (const value of [undefined, "bad"]) {
		const english = await i18n.renderLayout(value);
		assert.match(english, /<html lang="en"/);
		assert.match(english, />Inbox<\/span>/);
	}
});
