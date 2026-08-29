import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { ok, type CmdResult } from "./result.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { SKILL_CATALOG } from "./skills.ts";

export const PRIMARY_CLIS: { id: string; bin: string; role: "primary" | "compatible" }[] = [
  { id: "claude-code", bin: "claude", role: "primary" },
  { id: "codex", bin: "codex", role: "primary" },
  { id: "opencode", bin: "opencode", role: "primary" },
  { id: "grok-build", bin: "grok", role: "primary" },
  { id: "deepseek-harness", bin: "dsh", role: "primary" },
  { id: "pi", bin: "pi", role: "compatible" },
  // CHG-012: the Cursor desktop client; `cursor --version` is the IDE version. Its CLI is
  // named `agent` (collides with Grok Build's) and is not part of the contract.
  { id: "cursor", bin: "cursor", role: "compatible" },
];

/** Skill / instruction roots each harness reads (R2). Structural, not a live invoke. */
export const HARNESS_DISCOVERY: { id: string; instructions: string; skills: string }[] = [
  { id: "claude-code", instructions: "CLAUDE.md", skills: ".claude/skills" },
  { id: "codex", instructions: "AGENTS.md", skills: ".agents/skills" },
  { id: "opencode", instructions: "AGENTS.md", skills: ".agents/skills" },
  { id: "grok-build", instructions: "AGENTS.md", skills: ".agents/skills" },
  { id: "deepseek-harness", instructions: "AGENTS.md", skills: ".agents/skills" },
  { id: "pi", instructions: "AGENTS.md", skills: ".agents/skills" },
  { id: "cursor", instructions: "AGENTS.md", skills: ".agents/skills" },
];

export function whichBin(bin: string): string | null {
  const cmd = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(cmd, [bin], { encoding: "utf8", timeout: 8000 });
  if ((r.status ?? 1) !== 0) return null;
  const line = (r.stdout ?? "").split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0);
  return line ?? null;
}

function spawnCli(
  binPath: string,
  args: string[],
  timeout = 20000,
): { status: number | null; stdout: string; stderr: string } {
  const isWin = process.platform === "win32";
  let cmd = binPath;
  if (isWin && !/\.(exe|cmd|bat)$/i.test(binPath)) {
    if (existsSync(`${binPath}.cmd`)) cmd = `${binPath}.cmd`;
    else if (existsSync(`${binPath}.CMD`)) cmd = `${binPath}.CMD`;
    else if (existsSync(`${binPath}.exe`)) cmd = `${binPath}.exe`;
  }
  const needsShell = isWin && !/\.exe$/i.test(cmd);
  return spawnSync(cmd, args, {
    encoding: "utf8",
    timeout,
    shell: needsShell,
    maxBuffer: 5 * 1024 * 1024,
  });
}

export function probeVersion(binPath: string): string | null {
  const r = spawnCli(binPath, ["--version"], 8000);
  const text = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const line = text.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0);
  return line ? line.slice(0, 120) : null;
}

export type ProbeRow = {
  id: string;
  bin: string;
  role: "primary" | "compatible";
  path: string | null;
  live: boolean;
  version: string | null;
};

export function probeHarnesses(): ProbeRow[] {
  return PRIMARY_CLIS.map((h) => {
    const path = whichBin(h.bin);
    return { ...h, path, live: Boolean(path), version: null };
  });
}

export function enrichVersions(rows: ProbeRow[]): ProbeRow[] {
  return rows.map((r) => {
    if (!r.path) return r;
    return { ...r, version: probeVersion(r.path) };
  });
}

export function skillTriggerGaps(root: string): string[] {
  const gaps: string[] = [];
  for (const name of SKILL_CATALOG) {
    const file = join(root, ".agents", "skills", name, "SKILL.md");
    if (!existsSync(file)) {
      gaps.push(`${name}: missing`);
      continue;
    }
    const { attrs } = parseFrontmatter(readFileSync(file, "utf8"));
    const desc = attrs.description ?? "";
    if (!desc.includes(name)) gaps.push(`${name}: description lacks token ${name}`);
    if (!/^use when\b/i.test(desc)) gaps.push(`${name}: description lacks Use when`);
    if (!/\bdo not\b/i.test(desc)) gaps.push(`${name}: description lacks negative Do not`);
  }
  return gaps;
}

export function kSkillsFromInspect(raw: string): string[] {
  const data = JSON.parse(raw) as { skills?: { name?: string }[] };
  const names = new Set((data.skills ?? []).map((s) => s.name ?? "").filter((n) => n.length > 0));
  return SKILL_CATALOG.filter((n) => names.has(n));
}

export function inspectGrokKSkills(): { names: string[]; error?: string } {
  const grok = whichBin("grok");
  if (!grok) return { names: [], error: "grok not on PATH" };
  const r = spawnCli(grok, ["inspect", "--json"], 30000);
  if ((r.status ?? 1) !== 0) {
    return { names: [], error: (r.stderr || r.stdout || "inspect failed").slice(0, 200) };
  }
  try {
    return { names: kSkillsFromInspect(r.stdout ?? "") };
  } catch (e) {
    return { names: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export function formatLedger(
  root: string,
  rows: ProbeRow[],
  grokNames?: string[],
  grokError?: string,
): string {
  const gaps = skillTriggerGaps(root);
  const lines = [
    "# 技能触发探测账本（W5）",
    "",
    "现场跑 `node tools/gate/gate.ts triggers --write` 更新。未安装的 CLI 标 **[未实测]**。",
    "不把 PATH 探测当成付费对话里的技能实点（C-09）。Grok Build 用 `grok inspect --json` 做发现层校准（不调模型）。",
    "",
    "| harness | 档 | CLI | 本机 | 版本 |",
    "|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const found = r.live ? r.path : "**[未实测]**";
    const ver = r.version ?? (r.live ? "" : "—");
    lines.push(`| ${r.id} | ${r.role} | \`${r.bin}\` | ${found} | ${ver} |`);
  }
  lines.push("");
  lines.push("## 技能 description 机检");
  lines.push("");
  if (gaps.length === 0) {
    lines.push("16 个技能 description 均含 `Use when`、自身 `k-*` 名、以及否定 `Do not`。");
  } else {
    gaps.forEach((g) => lines.push(`- ${g}`));
  }
  lines.push("");
  lines.push("## 发现路径（结构，R2）");
  lines.push("");
  lines.push("| harness | 指令文件 | 技能目录 |");
  lines.push("|---|---|---|");
  for (const d of HARNESS_DISCOVERY) {
    lines.push(`| ${d.id} | ${d.instructions} | \`${d.skills}\` |`);
  }
  lines.push("");
  lines.push("Claude Code 是唯一需要 `CLAUDE.md` + `.claude/skills` 镜像的主力（C-94）。其余读 `AGENTS.md` + `.agents/skills`。");
  lines.push("");
  lines.push("## Grok Build inspect（发现层，非付费对话）");
  lines.push("");
  if (grokError && (!grokNames || grokNames.length === 0)) {
    lines.push(`未跑通：${grokError}`);
  } else if (grokNames) {
    lines.push(
      `\`grok inspect --json\` 载入 k-*：**${grokNames.length}/16**（${grokNames.join(", ") || "无"}）。`,
    );
    if (grokNames.length === SKILL_CATALOG.length) {
      lines.push("措辞校准：当前 `Use when` + `k-*` + `Do not` 被 Grok 原样载入，W5 不改 description。");
    } else {
      const missing = SKILL_CATALOG.filter((n) => !grokNames.includes(n));
      lines.push(`未出现：${missing.join(", ")}。先查目录再改措辞。`);
    }
  } else {
    lines.push("本机未跑 inspect（`grok` 不在 PATH，或未加 `--write` 现场探测）。");
  }
  lines.push("");
  lines.push("## Pi 冒烟");
  lines.push("");
  const pi = rows.find((r) => r.id === "pi");
  if (pi?.live) {
    lines.push(`CLI 在 PATH：${pi.path}。结构与 Codex/Grok 相同：\`AGENTS.md\` + \`.agents/skills\`。`);
  } else {
    lines.push(
      "CLI **[未实测]**。结构冒烟：Pi 原生读 `AGENTS.md` + `.agents/skills`（R2）；本仓 16 个技能仅为标准 `name`/`description`，无平台私有字段（C-95）。live 待安装 `pi`（`@earendil-works/pi-coding-agent`）。",
    );
  }
  lines.push("");
  lines.push("## 措辞校准（工作约定）");
  lines.push("");
  lines.push("- 平台中性：技能正文不写某家私有 slash（C-95）。");
  lines.push("- 用户入口技能名可当 slash：`/k-init` 等，由各家按目录名加载。");
  lines.push("- 四家已装 CLI 的版本见上表。dsh 未装；付费对话实点不做假账。");
  lines.push("- 实点各家模型触发后，把失败短语补进该技能 description，再跑本命令重写本账本。");
  lines.push("");
  return lines.join("\n");
}

export function runTriggers(ctx: Ctx, args: string[]): CmdResult {
  const rows = enrichVersions(probeHarnesses());
  const grok = inspectGrokKSkills();
  const names = grok.error ? undefined : grok.names;
  const text = formatLedger(ctx.root, rows, names, grok.error);
  const dest = join(ctx.records, "features", "f16-platforms", "trigger-ledger.md");
  if (args.includes("--write")) writeFileSync(dest, text.endsWith("\n") ? text : text + "\n", "utf8");
  return ok(text.endsWith("\n") ? text : text + "\n");
}
