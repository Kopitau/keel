import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";

export const SKILL_CATALOG = [
  "k-init",
  "k-migrate",
  "k-new",
  "k-impl",
  "k-bugfix",
  "k-change",
  "k-review",
  "k-accept",
  "k-retro",
  "k-handoff",
  "k-status",
  "k-grill",
  "k-research",
  "k-decide",
  "k-evidence",
  "k-log",
] as const;

const ALLOWED = new Set(["name", "description"]);

export type SkillIssue = { skill: string; message: string };

export function listSkillDirs(skillsRoot: string): string[] {
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot)
    .filter((n) => n.startsWith("k-"))
    .filter((n) => {
      try {
        return statSync(join(skillsRoot, n)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

export function inspectSkills(
  root: string,
  maxLines: number,
  maxDesc: number,
  cap: number,
): SkillIssue[] {
  const issues: SkillIssue[] = [];
  const skillsRoot = join(root, ".agents", "skills");
  const dirs = listSkillDirs(skillsRoot);
  if (dirs.length > cap) {
    issues.push({ skill: "*", message: `${dirs.length} skills > cap ${cap} (C-121)` });
  }
  const catalog = new Set<string>(SKILL_CATALOG);
  for (const name of SKILL_CATALOG) {
    if (!dirs.includes(name)) issues.push({ skill: name, message: "missing from .agents/skills" });
  }
  for (const dir of dirs) {
    if (!catalog.has(dir)) issues.push({ skill: dir, message: "not in the §9 catalog" });
    const file = join(skillsRoot, dir, "SKILL.md");
    if (!existsSync(file)) {
      issues.push({ skill: dir, message: "SKILL.md missing" });
      continue;
    }
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    const n = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
    if (n > maxLines) issues.push({ skill: dir, message: `${n} lines > ${maxLines} (C-118)` });
    const { attrs } = parseFrontmatter(text);
    for (const key of Object.keys(attrs)) {
      if (!ALLOWED.has(key)) issues.push({ skill: dir, message: `non-standard field ${key} (C-95)` });
    }
    if (attrs.name !== dir) {
      issues.push({ skill: dir, message: `name ${attrs.name ?? "(missing)"} != directory` });
    }
    const desc = attrs.description ?? "";
    if (!desc) issues.push({ skill: dir, message: "description missing" });
    if (desc.length > maxDesc) {
      issues.push({ skill: dir, message: `description ${desc.length} chars > ${maxDesc}` });
    }
    if (desc && !/^use when\b/i.test(desc)) {
      issues.push({ skill: dir, message: "description must start with trigger 'Use when'" });
    }
  }
  return issues;
}
