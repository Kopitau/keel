import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { mdFiles } from "./walk.ts";

export type OssRecord = {
  id: string;
  project: string;
  version: string;
  status: string;
  nextReview: string;
  file: string;
};

export type OssReport = {
  missing: string[];
  due: OssRecord[];
  versionMismatch: { project: string; oss: string; lock: string }[];
  records: OssRecord[];
  deps: string[];
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isReviewDue(nextReview: string, today = todayYmd()): boolean {
  if (!nextReview || nextReview === "none") return false;
  return nextReview < today;
}

export function packageDirectDeps(root: string): string[] {
  const p = join(root, "package.json");
  if (!existsSync(p)) return [];
  try {
    const data = JSON.parse(readFileSync(p, "utf8")) as {
      dependencies?: { [k: string]: string };
      devDependencies?: { [k: string]: string };
    };
    return [...Object.keys(data.dependencies ?? {}), ...Object.keys(data.devDependencies ?? {})].sort();
  } catch {
    return [];
  }
}

export function lockVersion(root: string, name: string): string | null {
  const p = join(root, "package-lock.json");
  if (!existsSync(p)) return null;
  try {
    const data = JSON.parse(readFileSync(p, "utf8")) as {
      packages?: { [k: string]: { version?: string } };
    };
    const v = data.packages?.[`node_modules/${name}`]?.version;
    return v ?? null;
  } catch {
    return null;
  }
}

export function loadOssRecords(ctx: Ctx): OssRecord[] {
  const dir = join(ctx.records, "oss");
  const out: OssRecord[] = [];
  for (const f of mdFiles(dir, "OSS-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    out.push({
      id: attrs.id ?? "",
      project: attrs.project ?? "",
      version: attrs.version ?? "",
      status: attrs.status ?? "",
      nextReview: attrs.next_review ?? "",
      file: f,
    });
  }
  return out;
}

export function inspectOss(ctx: Ctx): OssReport {
  const deps = packageDirectDeps(ctx.root);
  const records = loadOssRecords(ctx);
  const missing: string[] = [];
  const due: OssRecord[] = [];
  const versionMismatch: { project: string; oss: string; lock: string }[] = [];
  for (const dep of deps) {
    const hit = records.find((r) => r.project === dep);
    if (!hit) missing.push(dep);
  }
  for (const r of records) {
    if (r.status === "retired") continue;
    if (isReviewDue(r.nextReview)) due.push(r);
    const locked = r.project ? lockVersion(ctx.root, r.project) : null;
    if (locked && r.version && locked !== r.version) {
      versionMismatch.push({ project: r.project, oss: r.version, lock: locked });
    }
  }
  return { missing, due, versionMismatch, records, deps };
}
