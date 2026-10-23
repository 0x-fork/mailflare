import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(root, "tests", ".tmp-compose-preferences-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: {
		service: join(root, "src/lib/compose/preferences.ts"),
		database: join(root, "server/runtime/sqlite-database.ts"),
		migrate: join(root, "server/runtime/migrate.ts"),
	},
	outdir: outDir,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	tsconfig: join(root, "tsconfig.json"),
	external: ["better-sqlite3", "drizzle-orm", "drizzle-orm/*"],
	logLevel: "silent",
});

const load = (name) => import(pathToFileURL(join(outDir, `${name}.mjs`)).href);
const service = await load("service");
const { SqliteDatabase } = await load("database");
const { applyMigrations } = await load("migrate");

async function createFixture(t, { dropTable = false } = {}) {
	const database = new SqliteDatabase(join(outDir, `${crypto.randomUUID()}.sqlite`));
	t.after(() => database.db.close());
	await applyMigrations(database, join(root, "drizzle/migrations"));
	if (dropTable) database.db.exec("DROP TABLE user_compose_preferences");
	database.db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u1', 'kevin@example.com', 'Kevin', 'x', 0)").run();
	return { env: { DB: database }, database };
}

test("read receipts default to off and the saved choice persists per user", async (t) => {
	const { env } = await createFixture(t);
	assert.deepEqual(await service.getComposePreferences(env, "u1"), { trackOpensDefault: false });
	await service.setComposePreferences(env, "u1", { trackOpensDefault: true });
	assert.deepEqual(await service.getComposePreferences(env, "u1"), { trackOpensDefault: true });
	await service.setComposePreferences(env, "u1", { trackOpensDefault: false });
	assert.deepEqual(await service.getComposePreferences(env, "u1"), { trackOpensDefault: false });
});

test("preferences are removed with the user", async (t) => {
	const { env, database } = await createFixture(t);
	database.db.exec("PRAGMA foreign_keys = ON");
	await service.setComposePreferences(env, "u1", { trackOpensDefault: true });
	database.db.exec("DELETE FROM users WHERE id = 'u1'");
	assert.equal(database.db.prepare("SELECT count(*) AS n FROM user_compose_preferences").get().n, 0);
});

test("before migration 0072 reads fall back to off and saving asks for the migration", async (t) => {
	const { env } = await createFixture(t, { dropTable: true });
	assert.deepEqual(await service.getComposePreferences(env, "u1"), { trackOpensDefault: false });
	await assert.rejects(service.setComposePreferences(env, "u1", { trackOpensDefault: true }), service.ComposePreferencesUnavailableError);
});
