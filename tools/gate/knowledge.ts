import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
