import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import type { Ctx } from "./ctx.ts";
import type { Identity } from "./ctx.ts";

export function git(
  ctx: Ctx,
  args: string[],
  extraEnv?: { [k: string]: string | undefined },
): { status: number; stdout: string; stderr: string } {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const r = spawnSync("git", args, { encoding: "utf8", cwd: ctx.root, env });
  return {
    status: r.status ?? 1,
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
  };
}

export function gitIdentity(ctx: Ctx): Identity {
  if (ctx.identity) return ctx.identity;
  const name = git(ctx, ["config", "user.name"]).stdout || "unknown";
  const email = git(ctx, ["config", "user.email"]).stdout || "unknown";
  return { name, email };
}

export function gitBranch(ctx: Ctx): string {
  return git(ctx, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout;
}

export function gitHooksPath(ctx: Ctx): string {
  return git(ctx, ["config", "core.hooksPath"]).stdout;
}

export function gitHead(ctx: Ctx): string {
  return git(ctx, ["rev-parse", "HEAD"]).stdout;
}

export function gitDirty(ctx: Ctx): boolean {
  return git(ctx, ["status", "--porcelain"]).stdout !== "";
}

/** Real git directory (worktree-safe). `.git` may be a file. */
export function gitDir(ctx: Ctx): string {
  const r = git(ctx, ["rev-parse", "--git-dir"]);
  if (r.status !== 0 || !r.stdout) return "";
  const p = r.stdout;
  if (isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p)) return p;
  return resolve(ctx.root, p);
}

export function gitLogBodies(ctx: Ctx, n = 50): string[] {
  const r = git(ctx, ["log", `-${String(n)}`, "--format=%B%x1e"]);
  if (r.status !== 0 || !r.stdout) return [];
  return r.stdout.split("\x1e").map((s) => s.trim()).filter(Boolean);
}

export function gitLsFiles(ctx: Ctx): string[] {
  const r = git(ctx, ["ls-files", "-z"]);
  if (r.status !== 0 || !r.stdout) return [];
  return r.stdout.split("\0").map((s) => s.replace(/\\/g, "/")).filter(Boolean);
}

export function casefoldCollisions(rels: string[]): string[] {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const rel of rels) {
    const key = rel.toLowerCase();
    const prev = seen.get(key);
    if (prev && prev !== rel) collisions.push(`${prev} vs ${rel}`);
    else seen.set(key, rel);
  }
  return collisions;
}

export function gitLastAuthor(ctx: Ctx, rel: string): { name: string; email: string } {
  const r = git(ctx, ["log", "-1", "--format=%an%x09%ae", "--", rel]);
  const [name, email] = r.stdout.split("\t");
  return { name: (name ?? "").trim() || "unknown", email: (email ?? "").trim() || "unknown" };
}

/** Tree hash of the would-be commit, excluding keel/evidence (C-33). */
export function gitWriteTree(ctx: Ctx): string {
  const dir = gitDir(ctx);
  if (!dir || !existsSync(dir)) return "";
  const tmp = join(dir, `keel-wt-${process.pid}.idx`);
  const env = { GIT_INDEX_FILE: tmp };
  try {
    const headIdx = join(dir, "index");
    if (existsSync(headIdx)) copyFileSync(headIdx, tmp);
    git(ctx, ["add", "-A"], env);
    const ev = join("keel", "evidence");
    if (existsSync(join(ctx.root, ev))) {
      git(ctx, ["reset", "-q", "--", ev], env);
    }
    const r = git(ctx, ["write-tree"], env);
    return r.status === 0 ? r.stdout : "";
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}
