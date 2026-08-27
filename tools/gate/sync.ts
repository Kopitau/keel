import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { listSkillDirs, openaiYamlFor } from "./skills.ts";

/** DEC-170: one `agents/openai.yaml` per k-* skill, derived from SKILL.md — never hand-edited. */
export function writeOpenaiYaml(root: string): number {
  const skillsRoot = join(root, ".agents", "skills");
  let n = 0;
  for (const dir of listSkillDirs(skillsRoot)) {
    const skill = join(skillsRoot, dir, "SKILL.md");
    if (!existsSync(skill)) continue;
    const { attrs } = parseFrontmatter(readFileSync(skill, "utf8"));
    const body = openaiYamlFor(dir, attrs.description ?? "");
    const agentsDir = join(skillsRoot, dir, "agents");
    const dest = join(agentsDir, "openai.yaml");
    mkdirSync(agentsDir, { recursive: true });
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== body) writeFileSync(dest, body, "utf8");
    n += 1;
  }
  return n;
}

/** DEC-147: always copy, never symlink. */
export function runSync(ctx: Ctx): CmdResult {
  const src = join(ctx.root, ".agents", "skills");
  const dest = join(ctx.root, ".claude", "skills");
  if (!existsSync(src)) return fail("missing .agents/skills\n");
  const yamls = writeOpenaiYaml(ctx.root);
  mkdirSync(dest, { recursive: true });
  try {
    cpSync(src, dest, { recursive: true, force: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`sync copy failed: ${msg}\n`);
  }
  return ok(`synced .agents/skills -> .claude/skills (copy); agents/openai.yaml x${yamls} (DEC-170)\n`);
}
