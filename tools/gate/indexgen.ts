import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { ok, fail, type CmdResult } from "./result.ts";

export type CurrentRead = { file: string | null; error: string | null; count: number };

export function readCurrent(indexPath: string): CurrentRead {
  if (!existsSync(indexPath)) return { file: null, error: "INDEX.md missing", count: 0 };
  const text = readFileSync(indexPath, "utf8");
  const currents = text.split(/\n/).filter((ln) => ln.startsWith("- current:"));
  if (currents.length === 0) return { file: null, error: "no current pointer", count: 0 };
  if (currents.length > 1) {
    return { file: null, error: "multiple current pointers", count: currents.length };
  }
  const file = (currents[0] ?? "").replace(/^- current:\s*/, "").trim();
  if (!file) return { file: null, error: "empty current pointer", count: 1 };
  return { file, error: null, count: 1 };
}

function listMd(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.startsWith(prefix) && n.endsWith(".md") && n !== "INDEX.md")
    .sort();
}

function writeIndex(path: string, body: string): void {
  writeFileSync(path, body.endsWith("\n") ? body : body + "\n", "utf8");
}

function tableFor(
  ctx: Ctx,
  rel: string,
  prefix: string,
  extra: (name: string, attrs: { [k: string]: string }) => string[],
): string {
  const dir = join(ctx.records, rel);
  const names = listMd(dir, prefix);
  const rows = [
    `# ${rel} index (generated)`,
    "",
    `- generator: gate index`,
    `- count: ${names.length}`,
    "",
    "| ID | title | status | file |",
    "|---|---|---|---|",
  ];
  for (const name of names) {
    const { attrs, body } = parseFrontmatter(readFileSync(join(dir, name), "utf8"));
    const heading = (body.match(/^#\s+(.+)$/m) ?? [])[1] ?? "";
    const title = attrs.title || heading || name;
    const id = attrs.id || basename(name, ".md");
    const status = attrs.status || "";
    const more = extra(name, attrs).join(" | ");
    void more;
    rows.push(`| ${id} | ${title.replace(/\|/g, "/")} | ${status} | \`${name}\` |`);
  }
  rows.push("");
  return rows.join("\n");
}

function versionedIndex(
  dir: string,
  indexPath: string,
  pattern: RegExp,
  label: string,
): string {
  const prev = readCurrent(indexPath);
  const names = existsSync(dir)
    ? readdirSync(dir).filter((n) => pattern.test(n)).sort()
    : [];
  let current = prev.file && names.includes(prev.file) ? prev.file : "";
  if (!current && names.length > 0) current = names[names.length - 1] ?? "";
  return [
    `# ${label} index (generated)`,
    "",
    `- generator: gate index`,
    `- current: ${current}`,
    `- versions: ${names.join(", ")}`,
    "",
  ].join("\n");
}

export function runIndex(ctx: Ctx): CmdResult {
  try {
    for (const rel of [
      "decisions",
      "research",
      "issues",
      "changes",
      "oss",
      "lessons",
      "approvals",
      "plan",
      "requirements",
    ]) {
      mkdirSync(join(ctx.records, rel), { recursive: true });
    }
    writeIndex(
      join(ctx.records, "decisions", "INDEX.md"),
      tableFor(ctx, "decisions", "DEC-", () => []),
    );
    writeIndex(
      join(ctx.records, "research", "INDEX.md"),
      tableFor(ctx, "research", "RES-", () => []),
    );
    writeIndex(
      join(ctx.records, "issues", "INDEX.md"),
      tableFor(ctx, "issues", "ISS-", () => []),
    );
    writeIndex(
      join(ctx.records, "changes", "INDEX.md"),
      tableFor(ctx, "changes", "CHG-", () => []),
    );
    writeIndex(
      join(ctx.records, "oss", "INDEX.md"),
      tableFor(ctx, "oss", "OSS-", () => []),
    );
    writeIndex(
      join(ctx.records, "lessons", "INDEX.md"),
      tableFor(ctx, "lessons", "LES-", () => []),
    );
    writeIndex(
      join(ctx.records, "approvals", "INDEX.md"),
      tableFor(ctx, "approvals", "APR-", () => []),
    );
    writeIndex(
      join(ctx.records, "plan", "INDEX.md"),
      versionedIndex(
        join(ctx.records, "plan"),
        join(ctx.records, "plan", "INDEX.md"),
        /^overview-v\d+\.md$/,
        "plan",
      ),
    );
    writeIndex(
      join(ctx.records, "requirements", "INDEX.md"),
      versionedIndex(
        join(ctx.records, "requirements"),
        join(ctx.records, "requirements", "INDEX.md"),
        /^v\d+\.md$/,
        "requirements",
      ),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`index failed: ${msg}\n`);
  }
  return ok("index regenerated\n");
}
