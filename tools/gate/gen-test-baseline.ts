import { writeFileSync } from "node:fs";
import process from "node:process";
import { makeCtx } from "./ctx.ts";
import { baselinePath, formatBaseline, testFileInventory } from "./testbase.ts";

const ctx = makeCtx(process.cwd());
const inv = testFileInventory(ctx.root);
if (inv.skipped > 0) {
  process.stderr.write(`C-34: tests/ still has skip=${inv.skipped}; will not write a green baseline\n`);
  process.exit(1);
}
writeFileSync(baselinePath(ctx), formatBaseline(inv.names), "utf8");
process.stdout.write(`wrote ${inv.names.length} names to ${baselinePath(ctx)}\n`);
