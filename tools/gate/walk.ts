import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP = new Set([
  ".git",
  "node_modules",
  ".keel-worktrees",
  "__pycache__",
  ".pytest_cache",
]);

export function posixRel(from: string, to: string): string {
  return relative(from, to).split("\\").join("/");
}

export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    let names: string[] = [];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      if (SKIP.has(name)) continue;
      const p = join(d, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out;
}

export function mdFiles(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.startsWith(prefix) && n.endsWith(".md"))
    .map((n) => join(dir, n));
}
