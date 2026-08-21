import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { sha256Normalized } from "./hash.ts";
import { gitIdentity } from "./git.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";

type Agent = { name?: string; email?: string };

function agentList(ctx: Ctx): Agent[] {
  const cfg = ctx.config;
  const identities = (cfg.identities ?? {}) as { agents?: Agent[] };
  return identities.agents ?? [];
}

function isAgent(ident: { name: string; email: string }, agents: Agent[]): boolean {
  const email = ident.email.toLowerCase();
  const name = ident.name.toLowerCase();
  return agents.some(
    (a) =>
      (a.email && a.email.toLowerCase() === email) ||
      (a.name && a.name.toLowerCase() === name),
  );
}

function artifactPaths(body: string, attrsBlock: string): string[] {
  const text = attrsBlock + "\n" + body;
  const paths: string[] = [];
  for (const m of text.matchAll(/path:\s+(\S+)/g)) {
    const p = (m[1] ?? "").replace(/^"|"$/g, "");
    if (p) paths.push(p);
  }
  return paths;
}

export function runApprove(ctx: Ctx, args: string[]): CmdResult {
  const id = args[0] ?? "";
  if (!id) return usage("usage: gate approve APR-001\n");
  const ident = gitIdentity(ctx);
  if (isAgent(ident, agentList(ctx))) {
    return fail(
      `refuse: git identity ${ident.name} <${ident.email}> is on the agent list (C-107). Run gate approve as a human.\n`,
    );
  }
  const dir = join(ctx.records, "approvals");
  const candidates = [join(dir, `${id}.md`), join(dir, id.endsWith(".md") ? id : `${id}.md`)];
  const file = candidates.find((p) => existsSync(p));
  if (!file) return fail(`APR file not found: ${id}\n`);
  const raw = readFileSync(file, "utf8");
  const { attrs, body } = parseFrontmatter(raw);
  const fmMatch = raw.match(/^---\n[\s\S]*?\n---/);
  const fm = fmMatch ? fmMatch[0] : "";
  const paths = artifactPaths(body, fm);
  if (paths.length === 0) return fail("APR has no artifact paths\n");
  let next = raw;
  for (const rel of paths) {
    const abs = join(ctx.root, rel);
    if (!existsSync(abs)) return fail(`artifact missing: ${rel}\n`);
    const digest = sha256Normalized(readFileSync(abs));
    const pathEsc = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = new RegExp(`(path:\\s+${pathEsc}[\\s\\S]*?content_sha256:\\s+)\\S+`);
    if (block.test(next)) {
      next = next.replace(block, `$1${digest}`);
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  next = next.replace(/status:\s+\S+/, "status: approved");
  if (/approver:\s*/.test(next)) {
    next = next.replace(/approver:\s*.*/, `approver: "${ident.name} <${ident.email}>"`);
  }
  if (/date:\s*/.test(next) && attrs.date !== undefined) {
    next = next.replace(/date:\s+\S+/, `date: ${today}`);
  }
  writeFileSync(file, next, "utf8");
  return ok(
    `approved ${id} as ${ident.name} <${ident.email}>\ncommit this file with your human git identity.\n`,
  );
}
