import { join } from "node:path";
import { loadConfig, type JsonMap } from "./config.ts";
import { recordsDir } from "./paths.ts";

export type Identity = { name: string; email: string };

export type Ctx = {
  root: string;
  records: string;
  config: JsonMap;
  identity?: Identity;
};

export function makeCtx(root: string, identity?: Identity): Ctx {
  const guess = recordsDir(root, "keel");
  const config = loadConfig(guess);
  const name = typeof config.records_dir === "string" ? config.records_dir : "keel";
  const records = join(root, name);
  const cfg = records === guess ? config : loadConfig(records);
  // CHG-016 (zhaoxi ISS-047): consumers compile this file under exactOptionalPropertyTypes —
  // an absent property and an explicit undefined are different there.
  const ctx: Ctx = { root, records, config: cfg };
  if (identity !== undefined) ctx.identity = identity;
  return ctx;
}
