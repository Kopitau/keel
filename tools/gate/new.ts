import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { asciiSlug, nextNumber, pad2, pad3, type Kind } from "./ids.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";

const KINDS = new Set<Kind>(["dec", "res", "iss", "chg", "oss", "les", "apr", "feature"]);

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function template(ctx: Ctx, name: string): string {
  const p = join(ctx.records, "templates", name);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

function stamp(text: string, idBare: string, idFull: string, title: string, date: string): string {
  return text
    .replaceAll("DEC-000", idFull)
    .replaceAll("RES-000", idFull)
    .replaceAll("ISS-000", idFull)
    .replaceAll("CHG-000", idFull)
    .replaceAll("OSS-000", idFull)
    .replaceAll("LES-000", idFull)
    .replaceAll("APR-000", idFull)
    .replaceAll("F00", idBare)
    .replaceAll("f00-name", idFull)
    .replaceAll("short title", title)
    .replaceAll("标题", title)
    .replaceAll("YYYY-MM-DD", date);
}

export function runNew(ctx: Ctx, args: string[]): CmdResult {
  const kindRaw = (args[0] ?? "").toLowerCase();
  if (!KINDS.has(kindRaw as Kind)) {
    return usage(
      "usage: gate new <dec|res|iss|chg|oss|les|apr|feature> <title>\n",
    );
  }
  const kind = kindRaw as Kind;
  const title = args.slice(1).join(" ").trim() || "untitled";
  const n = nextNumber(ctx, kind);
  const date = today();
  if (kind === "feature") {
    const slug = asciiSlug(title, "feature");
    const dirName = `f${pad2(n)}-${slug}`;
    const dir = join(ctx.records, "features", dirName);
    if (existsSync(dir)) return fail(`already exists: ${dir}\n`);
    mkdirSync(join(dir, "plan"), { recursive: true });
    const fid = `F${n}`;
    const plan = stamp(template(ctx, "feature-plan.md") || "# plan\n", fid, dirName, title, date);
    const log = stamp(template(ctx, "worklog.md") || `# worklog — ${fid}\n`, fid, dirName, title, date);
    writeFileSync(join(dir, "plan", "v1.md"), plan, "utf8");
    writeFileSync(join(dir, "worklog.md"), log, "utf8");
    return ok(`created feature ${fid} ${dirName}\n`);
  }
  const prefix = kind.toUpperCase();
  const idFull = `${prefix}-${pad3(n)}`;
  const slug = asciiSlug(title, "item");
  const dirMap: { [k: string]: string } = {
    dec: "decisions",
    res: "research",
    iss: "issues",
    chg: "changes",
    oss: "oss",
    les: "lessons",
    apr: "approvals",
  };
  const dir = join(ctx.records, dirMap[kind] ?? kind);
  mkdirSync(dir, { recursive: true });
  const fname = slug === "item" ? `${idFull}.md` : `${idFull}-${slug}.md`;
  const dest = join(dir, fname);
  if (existsSync(dest)) return fail(`already exists: ${fname}\n`);
  const tplName: { [k: string]: string } = {
    dec: "DEC.md",
    res: "RES.md",
    iss: "ISS.md",
    chg: "CHG.md",
    oss: "OSS.md",
    les: "LES.md",
    apr: "APR.md",
  };
  const body = stamp(template(ctx, tplName[kind] ?? "") || `# ${idFull} ${title}\n`, idFull, idFull, title, date);
  writeFileSync(dest, body, "utf8");
  return ok(`created ${fname}\n`);
}
