import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

/** OpenNext's Next dev proxy has no Worker exports, so it cannot host our Durable Object. */
export function createDevWranglerConfig(): string {
	const sourcePath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
	const parsed = ts.parseConfigFileTextToJson(sourcePath, readFileSync(sourcePath, "utf8"));
	if (parsed.error || !parsed.config || typeof parsed.config !== "object") {
		throw new Error("Could not read wrangler.jsonc for local development");
	}

	const devConfig = { ...parsed.config };
	delete devConfig.durable_objects;
	delete devConfig.migrations;
	const outputPath = join(dirname(sourcePath), ".wrangler.dev.json");
	const temporaryPath = `${outputPath}.${process.pid}.tmp`;
	writeFileSync(temporaryPath, JSON.stringify(devConfig));
	renameSync(temporaryPath, outputPath);
	return outputPath;
}
