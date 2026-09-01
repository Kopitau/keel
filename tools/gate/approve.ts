import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { sha256Body } from "./hash.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import { mdFiles } from "./walk.ts";
import { isRegularFile } from "./changechain.ts";
import { APPROVAL_EVIDENCE_KEYS, approvalEvidenceLines, evidenceFresh, readEvidence } from "./evidence.ts";

type Human = { name?: string; email?: string };

function humanList(ctx: Ctx): Human[] {
  const identities = (ctx.config.identities ?? {}) as { humans?: Human[] };
  return identities.humans ?? [];
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

function flagValue(args: string[], name: string): string {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return "";
  return (args[i + 1] ?? "").trim();
}

/**
 * DEC-190: an approval is the user's decision, recorded verbatim in the APR
 * (`delegated:`), and names the human who decided (`approver:`). Who runs this
 * command or commits the file is not a rule any more — the pilots showed the git
 * author field neither proves anything nor stops anyone, while it stalled every
 * approval (C-107 identity clause retired; C-111 trust model unchanged).
 */
export function runApprove(ctx: Ctx, args: string[]): CmdResult {
  const id = args[0] ?? "";
  if (!id || id.startsWith("--")) return usage('usage: gate approve APR-001 [--approver "Name <email>"]\n');
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
  const words = (attrs.delegated ?? "").trim();
  if (!words) {
    return fail(
      `refuse: ${id} records no user words. Put the user's verbatim approval in the front matter first — ` +
        `delegated: "「原话」(YYYY-MM-DD)" — then rerun; who commits does not matter (DEC-190).\n`,
    );
  }
  const human = humanList(ctx)[0];
  const approver =
    flagValue(args, "approver") ||
    (attrs.approver ?? "").trim() ||
    (human?.name ? `${human.name}${human.email ? ` <${human.email}>` : ""}` : "");
  if (!approver) {
    return fail('refuse: no approver to name — pass --approver "Name <email>" or fill identities.humans in the config (DEC-190).\n');
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
    next = next.replace(/approver:\s*.*/, `approver: "${approver}"`);
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
    `approved ${id} for ${approver} on the user's words ${words.slice(0, 60)}\n${note}commit this file with any git identity (DEC-190).\n`,
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
