import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { listFiles, mdFiles } from "./walk.ts";

export type IssueProtocolInspection = {
  checked: number;
  legacy: number;
  gaps: string[];
};

type IssueRecord = {
  file: string;
  id: string;
  schema: string;
  status: string;
  feature: string;
  fingerprint: string;
  recurrenceOf: string;
  priorFailure: string;
  escalation: string;
  defensePointer: string;
  source: string;
  body: string;
};

function sections(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let current = "";
  let lines: string[] = [];
  const flush = (): void => {
    if (current) out.set(current, lines.join("\n").trim());
  };
  for (const line of body.split(/\n/)) {
    const hit = line.match(/^##\s+(.+?)\s*\r?$/);
    if (hit) {
      flush();
      current = hit[1]?.trim() ?? "";
      lines = [];
    } else if (current) {
      lines.push(line.replace(/\r$/, ""));
    }
  }
  flush();
  return out;
}

function sectionValue(map: Map<string, string>, names: string[]): string {
  for (const name of names) {
    const value = map.get(name)?.trim() ?? "";
    if (value) return value;
  }
  return "";
}

function reproCommand(body: string): string {
  return (
    body.match(/复现命令：?\s*\r?\n\s*```[^\n]*\r?\n([\s\S]*?)\r?\n```/)?.[1]?.trim() ?? ""
  );
}

function pointerPaths(raw: string): string[] {
  const out: string[] = [];
  for (const entry of raw.split(/[;；,，\n]+/)) {
    const quoted = entry.match(/`([^`]+)`/)?.[1];
    const plain = entry.trim().match(/^([^\s()]+(?:[\\/][^\s()]+)+)/)?.[1];
    const value = (quoted ?? plain ?? "").replace(/[.)]+$/, "").trim();
    if (value) out.push(value);
  }
  return out;
}

function validRepoPath(ctx: Ctx, rel: string): boolean {
  if (isAbsolute(rel)) return false;
  const root = resolve(ctx.root);
  const target = resolve(ctx.root, rel);
  if (target !== root && !target.startsWith(root + "\\") && !target.startsWith(root + "/")) return false;
  return existsSync(target);
}

function issueNumber(id: string): number {
  return Number(id.match(/ISS-(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
}

function candidateBlob(ctx: Ctx): string {
  const files = listFiles(join(ctx.records, "features")).filter((file) => /worklog\.md$/i.test(file));
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

/**
 * Validate the 0.8.0 ISS lifecycle without rewriting historical issue records.
 * `schema: iss-v2` is the explicit compatibility boundary; older ISS files stay
 * readable but new files must satisfy the stricter state protocol.
 */
export function inspectIssueProtocol(ctx: Ctx): IssueProtocolInspection {
  const records: IssueRecord[] = [];
  let legacy = 0;
  for (const file of mdFiles(join(ctx.records, "issues"), "ISS-")) {
    const { attrs, body } = parseFrontmatter(readFileSync(file, "utf8"));
    const schema = attrs.schema ?? "";
    if (schema !== "iss-v2") legacy += 1;
    records.push({
      file,
      id: attrs.id || file.split(/[\\/]/).pop()?.replace(/\.md$/, "") || "ISS-?",
      schema,
      status: (attrs.status ?? "").toLowerCase(),
      feature: attrs.feature ?? "",
      fingerprint: attrs.fingerprint ?? "",
      recurrenceOf: attrs.recurrence_of ?? "",
      priorFailure: attrs.prior_defense_failure ?? "",
      escalation: attrs.defense_escalation ?? "",
      defensePointer: attrs.defense_pointer ?? "",
      source: attrs.source ?? "",
      body,
    });
  }

  const current = records.filter((record) => record.schema === "iss-v2");
  const gaps: string[] = [];
  for (const record of current) {
    const prefix = record.id;
    const bodySections = sections(record.body);
    if (!new Set(["open", "closed", "wontfix"]).has(record.status)) {
      gaps.push(`${prefix} status must be open|closed|wontfix`);
      continue;
    }
    if (!record.fingerprint.trim()) gaps.push(`${prefix} fingerprint missing`);

    if (record.status === "open") {
      if (!sectionValue(bodySections, ["现象"])) gaps.push(`${prefix} 现象 missing`);
      if (!sectionValue(bodySections, ["影响"])) gaps.push(`${prefix} 影响 missing`);
      if (!reproCommand(record.body)) gaps.push(`${prefix} 复现命令 missing`);
      if (!sectionValue(bodySections, ["待诊断防线"])) gaps.push(`${prefix} 待诊断防线 missing`);
      if (sectionValue(bodySections, ["根因"])) gaps.push(`${prefix} open 根因 must stay empty until diagnosed`);
      if (sectionValue(bodySections, ["修复"])) gaps.push(`${prefix} open 修复 must stay empty until diagnosed`);
      if (record.source === "review-loop") {
        const attack = sectionValue(bodySections, ["打开态攻击探针"]);
        for (const marker of ["probe_exit_code: 0", "probe_recorded_at:", "probe_tree_hash:", "probe_result: vulnerable"]) {
          if (!attack.includes(marker)) gaps.push(`${prefix} 打开态攻击探针 missing ${marker}`);
        }
      }
    } else {
      const required: [string, string[]][] = [
        ["根因", ["根因"]],
        ["修复", ["修复"]],
        ["为何未被更早发现", ["为何未被更早发现", "为什么没更早发现"]],
        ["闭环选择与理由", ["闭环选择与理由"]],
      ];
      for (const [label, names] of required) {
        if (!sectionValue(bodySections, names)) gaps.push(`${prefix} ${label} missing`);
      }
      const paths = pointerPaths(record.defensePointer);
      if (paths.length === 0) gaps.push(`${prefix} defense_pointer missing repository path`);
      for (const rel of paths) {
        if (!validRepoPath(ctx, rel)) gaps.push(`${prefix} defense_pointer missing file ${rel}`);
      }
    }
  }

  const groups = new Map<string, IssueRecord[]>();
  for (const record of records) {
    if (!record.feature || !record.fingerprint) continue;
    const key = `${record.feature}\u0000${record.fingerprint}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  const candidates = candidateBlob(ctx);
  for (const group of groups.values()) {
    group.sort((a, b) => issueNumber(a.id) - issueNumber(b.id));
    for (let i = 1; i < group.length; i += 1) {
      const record = group[i];
      if (!record || record.schema !== "iss-v2") continue;
      if (!record.recurrenceOf) gaps.push(`${record.id} recurrence_of missing for repeated fingerprint`);
      if (!record.priorFailure) gaps.push(`${record.id} prior_defense_failure missing for repeated fingerprint`);
      if (!record.escalation) gaps.push(`${record.id} defense_escalation missing for repeated fingerprint`);
    }
    if (group.length >= 3 && group.some((record) => record.schema === "iss-v2")) {
      const fp = group[0]?.fingerprint ?? "";
      const escaped = fp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const candidate = new RegExp(`#经验候选\\s+(?:same fingerprint|同指纹)\\s+${escaped}(?:\\s|$)`);
      if (!candidate.test(candidates)) gaps.push(`${group[0]?.feature}/${fp} third recurrence needs #经验候选 for F13`);
    }
  }

  return { checked: current.length, legacy, gaps };
}
