import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";

export function knowledgeDir(): string {
  return join(homedir(), ".keel", "knowledge");
}

export function countKnowledge(dir = knowledgeDir()): { dir: string; exists: boolean; count: number } {
  if (!existsSync(dir)) return { dir, exists: false, count: 0 };
  let count = 0;
  try {
    for (const n of readdirSync(dir)) {
      if (/^KLES-\d+/i.test(n) && n.endsWith(".md")) count += 1;
    }
  } catch {
    return { dir, exists: true, count: 0 };
  }
  return { dir, exists: true, count };
}

export type KnowledgeSummary = { id: string; summary: string };

/** C-84: the session-facing view is frontmatter summary only; KLES bodies stay lazy. */
export function knowledgeIndex(dir = knowledgeDir()): KnowledgeSummary[] {
  if (!existsSync(dir)) return [];
  const out: KnowledgeSummary[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((name) => /^KLES-\d+.*\.md$/i.test(name)).sort();
  } catch {
    return [];
  }
  for (const name of names) {
    try {
      const { attrs } = parseFrontmatter(readFileSync(join(dir, name), "utf8"));
      const id = (attrs.id ?? name.replace(/\.md$/, "")).trim();
      const summary = (attrs.summary ?? "")
        .split(/\\n|\|/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("\n")
        .slice(0, 360);
      if (id && summary) out.push({ id, summary });
    } catch {
      /* one unreadable entry does not expose its body or suppress safe siblings */
    }
  }
  return out;
}
