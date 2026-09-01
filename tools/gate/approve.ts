import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { sha256Body } from "./hash.ts";
import { gitIdentity } from "./git.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import { ancestorProcessNames, detectHarness } from "./harness.ts";
import { mdFiles } from "./walk.ts";
import { isRegularFile } from "./changechain.ts";
import { APPROVAL_EVIDENCE_KEYS, approvalEvidenceLines, evidenceFresh, readEvidence } from "./evidence.ts";

type Agent = { name?: string; email?: string };

function agentList(ctx: Ctx): Agent[] {
  const identities = (ctx.config.identities ?? {}) as { agents?: Agent[] };
  return identities.agents ?? [];
}

function humanList(ctx: Ctx): Agent[] {
  const identities = (ctx.config.identities ?? {}) as { humans?: Agent[] };
  return identities.humans ?? [];
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
  const humans = humanList(ctx);
  if (humans.length === 0) {
    return fail("refuse: identities.humans is empty; fill a human git identity before approve (C-107).\n");
  }
  if (!isAgent(ident, humans)) {
    return fail(
      `refuse: ${ident.name} <${ident.email}> is not in identities.humans (C-107).\n`,
    );
  }
  const dir = join(ctx.records, "approvals");
  // `gate new apr` writes APR-nnn-<slug>.md; resolve both that and the bare name.
  const candidates = [join(dir, `${id}.md`), join(dir, id.endsWith(".md") ? id : `${id}.md`)];
  let file = candidates.find((p) => existsSync(p));
  if (!file) {
    const token = id.replace(/\.md$/, "");
    file = mdFiles(dir, "APR-").find((p) => {
      const base = basename(p);
      return base === `${token}.md` || base.startsWith(`${token}-`);
    });
  }
  if (!file) return fail(`APR file not found: ${id}\n`);
  const raw = readFileSync(file, "utf8");
  const { attrs, body } = parseFrontmatter(raw);
  // DEC-166: run from an agent environment, approval is delegation — legal only
  // when the APR itself records the user's instruction, before approve runs.
  // ISS-059: environment markers first, process ancestry (codex / claude / …) as the fallback.
  const harness = detectHarness(process.env, { ancestors: ancestorProcessNames });
  if (harness && !(attrs.delegated ?? "").trim()) {
    return fail(
      `refuse: gate approve is running inside ${harness.agent} but ${id} has no 'delegated:' record.\n` +
        `Record the user's verbatim instruction first — delegated: "「原话」(YYYY-MM-DD)" — then rerun (C-107/DEC-166).\n`,
    );
  }
  const fmMatch = raw.match(/^---\n[\s\S]*?\n---/);
  const fm = fmMatch ? fmMatch[0] : "";
  const paths = artifactPaths(body, fm);
  if (paths.length === 0) return fail("APR has no artifact paths\n");
  let next = raw;
  for (const rel of paths) {
    const abs = join(ctx.root, rel);
    if (!existsSync(abs)) return fail(`artifact missing: ${rel}\n`);
    if (!isRegularFile(abs)) return fail(`artifact is not a file: ${rel} (name the file, not its directory)\n`);
    // CHG-011 / REQ-018 AC-1: bind the body; metadata edits never void an approval.
    const digest = sha256Body(readFileSync(abs));
    const pathEsc = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // ISS-053: the path may be quoted (`path: "keel/x.md"`); a block that cannot be
    // found must refuse, not silently leave content_sha256 at "pending".
    const block = new RegExp(`(path:\\s+"?${pathEsc}"?[\\s\\S]*?content_sha256:\\s+)\\S+`);
    if (!block.test(next)) {
      return fail(`artifact block for ${rel} has no content_sha256 line to fill (ISS-053)\n`);
    }
    next = next.replace(block, `$1${digest}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  next = next.replace(/status:\s+\S+/, "status: approved");
  if (/approver:\s*/.test(next)) {
    next = next.replace(/approver:\s*.*/, `approver: "${ident.name} <${ident.email}>"`);
  }
  if (/date:\s*/.test(next) && attrs.date !== undefined) {
    next = next.replace(/date:\s+\S+/, `date: ${today}`);
  }
  // DEC-187: freeze the verify facts of this very tree into the approval so the local
  // tier keeps its evidence after the worktree (and its gitignored verify.json) is gone.
  const ev = readEvidence(ctx);
  let note = "";
  if (ev && evidenceFresh(ctx, ev) && !ev.dirty && (ev.counts?.failed ?? 0) === 0 && (ev.counts?.passed ?? 0) > 0) {
    next = withApprovalEvidence(next, approvalEvidenceLines(ev));
    note = `evidence snapshot written: tree ${ev.tree_hash.slice(0, 12)}… passed=${ev.counts.passed} (DEC-187)\n`;
  } else {
    note = "no fresh green verify.json for this tree; approval carries no evidence snapshot (run gate verify first if this APR accepts a feature, DEC-187)\n";
  }
  writeFileSync(file, next, "utf8");
  return ok(
    `approved ${id} as ${ident.name} <${ident.email}>\n${note}commit this file with your human git identity.\n`,
  );
}

/** Replace or add the flat `evidence_*` lines just before the closing `---` of the front matter. */
export function withApprovalEvidence(text: string, lines: string[]): string {
  const src = text.replace(/\r\n/g, "\n").split("\n");
  if ((src[0] ?? "").trim() !== "---") return text;
  let close = -1;
  for (let i = 1; i < src.length; i++) {
    if ((src[i] ?? "").trim() === "---") {
      close = i;
      break;
    }
  }
  if (close < 0) return text;
  const keys = new Set<string>(APPROVAL_EVIDENCE_KEYS);
  const kept = src.slice(1, close).filter((l) => !keys.has(l.split(":")[0]?.trim() ?? ""));
  return ["---", ...kept, ...lines, ...src.slice(close)].join("\n");
}
