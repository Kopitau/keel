import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";
import { listSkillDirs } from "./skills.ts";

export type AutoloadParts = {
  agents: number;
  claude: number;
  catalog: number;
  total: number;
};

function utf8Bytes(s: string): number {
  return Buffer.from(s, "utf8").byteLength;
}

/** C-26/C-118: root instructions + skill name/description catalog, not skill bodies. */
export function measureAutoload(root: string): AutoloadParts {
  const agentsPath = join(root, "AGENTS.md");
  const agents = existsSync(agentsPath) ? readFileSync(agentsPath).byteLength : 0;
  const claudePath = join(root, "CLAUDE.md");
  const claude = existsSync(claudePath) ? readFileSync(claudePath).byteLength : 0;
  let catalog = 0;
  const skillsRoot = join(root, ".agents", "skills");
  for (const name of listSkillDirs(skillsRoot)) {
    const file = join(skillsRoot, name, "SKILL.md");
    if (!existsSync(file)) continue;
    const { attrs } = parseFrontmatter(readFileSync(file, "utf8"));
    catalog += utf8Bytes(`name: ${attrs.name ?? name}\n`);
    catalog += utf8Bytes(`description: ${attrs.description ?? ""}\n`);
  }
  return { agents, claude, catalog, total: agents + claude + catalog };
}
