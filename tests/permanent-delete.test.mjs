import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = mkdtempSync(join(root, "node_modules", "mailflare-permanent-delete-test-"));
after(() => rmSync(directory, { recursive: true, force: true }));
await build({
	stdin: {
		contents: `
			export { isAllowedBulkMessageAction, getStatusForBulkAction, getReadValueForBulkAction, isPermanentlyDeletableStatus, isPermanentDeleteFolder } from "./src/app/api/messages/bulk/utils.ts";
			export { supportsPermanentDelete, getEmptyFolderLabel, getPermanentDeleteConfirmText, getEmptyFolderConfirmText } from "./src/lib/messages/permanent-delete-utils.ts";
		`,
		resolveDir: root,
		sourcefile: "permanent-delete-test-entry.ts",
	},
	outfile: join(directory, "entry.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	packages: "external",
	logLevel: "silent",
});
const m = await import(pathToFileURL(join(directory, "entry.mjs")).href);

test("delete is an accepted bulk action that changes neither status nor read state", () => {
	assert.equal(m.isAllowedBulkMessageAction("delete"), true);
	assert.equal(m.getStatusForBulkAction("delete"), null);
	assert.equal(m.getReadValueForBulkAction("delete"), null);
	assert.equal(m.isAllowedBulkMessageAction("destroy"), false);
});

test("only Trash and Spam messages can be permanently deleted", () => {
	for (const status of ["trash", "spam"]) assert.equal(m.isPermanentlyDeletableStatus(status), true);
	for (const status of ["received", "sent", "draft", "archived", "", null, undefined]) {
		assert.equal(m.isPermanentlyDeletableStatus(status), false, String(status));
	}
	assert.equal(m.isPermanentDeleteFolder("trash"), true);
	assert.equal(m.isPermanentDeleteFolder("inbox"), false);
});

test("the UI offers permanent delete only in Trash and Spam", () => {
	assert.equal(m.supportsPermanentDelete("trash"), true);
	assert.equal(m.supportsPermanentDelete("spam"), true);
	assert.equal(m.supportsPermanentDelete("inbox"), false);
	assert.equal(m.supportsPermanentDelete(undefined), false);
	assert.equal(m.getEmptyFolderLabel("trash"), "Empty Trash");
	assert.equal(m.getEmptyFolderLabel("spam"), "Empty Spam");
});

test("confirmation text says how much is lost and that it is irreversible", () => {
	assert.equal(m.getPermanentDeleteConfirmText(1), "Permanently delete this message? This cannot be undone.");
	assert.equal(m.getPermanentDeleteConfirmText(3), "Permanently delete these 3 messages? This cannot be undone.");
	assert.equal(m.getEmptyFolderConfirmText("trash", 12), "Permanently delete all 12 messages in Trash? This cannot be undone.");
	assert.equal(m.getEmptyFolderConfirmText("spam", 1), "Permanently delete the 1 message in Spam? This cannot be undone.");
	assert.equal(m.getEmptyFolderConfirmText("trash"), "Permanently delete every message in Trash? This cannot be undone.");
});
