import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { normalizeText, sha256Normalized } from "./hash.ts";
import { readCurrent } from "./indexgen.ts";
import { claimPlanFiles, parseRequirementProtocols } from "./trace.ts";
import { approvalBinding } from "./changechain.ts";

export type Layers = { raw: string; explanation: string; legacy: string };
export type SourceFile = { path: string; hash: string | null; problem: string };
export type SpecRequirement = {
  id: string; title: string; text: string; source: string;
  acceptance: string[]; verification: string[];
};
export type SpecFeature = {
  id: string; title: string; plan: string; drafts: string[]; reqs: string[];
  implementation: SourceFile[]; related: SourceFile[];
  layers: Layers; technical: string; text: string; problems: string[];
  specHash: string; codeHash: string; fingerprint: string;
};
export type SpecModel = {
  requirements: SpecRequirement[]; features: SpecFeature[]; layers: Layers;
  requirementFile: string; problems: string[];
};

export function repoRelative(ctx: Ctx, path: string): string {
  return relative(ctx.root, path).replace(/\\/g, "/");
}

/** Exact repository paths only. Never follow even an in-repository symlink. */
export function safePath(ctx: Ctx, path: string): string {
  if (!path || /[\\\x00-\x1f:]/.test(path) || path.startsWith("/") ||
      path.split("/").some(p => !p || p === "." || p === ".." || p === ".git")) {
    throw new Error(`unsafe repository path: ${path}`);
  }
  let current = resolve(ctx.root);
  for (const part of path.split("/")) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`symbolic link not allowed: ${path}`);
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") throw error;
    }
  }
  return current;
}

export function sourceFile(ctx: Ctx, path: string): SourceFile {
  try {
    const absolute = safePath(ctx, path);
    if (!existsSync(absolute)) return { path, hash: null, problem: "missing" };
    if (!lstatSync(absolute).isFile()) return { path, hash: null, problem: "not a regular file" };
    return { path, hash: sha256Normalized(readFileSync(absolute)), problem: "" };
  } catch (error) {
    return { path, hash: null, problem: (error as Error).message };
  }
}

/** Guard directories before passing them to older readers that use stat(). */
export function assertSafeTree(ctx: Ctx, path: string): void {
  const absolute = safePath(ctx, path);
  if (!existsSync(absolute) || !lstatSync(absolute).isDirectory()) return;
  for (const name of readdirSync(absolute)) {
    if ([".git", "node_modules", ".keel-worktrees", "__pycache__", ".pytest_cache"].includes(name)) continue;
    assertSafeTree(ctx, `${path}/${name}`);
  }
}

/** H2 sections outside fenced code; subordinate headings stay in their section. */
export function sections(text: string): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = [{ title: "", text: "" }];
  let fence = "";
  for (const line of normalizeText(text).split("\n")) {
    const mark = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (mark) {
      const ticks = mark[1] ?? "";
      if (!fence) fence = ticks;
      else if (ticks[0] === fence[0] && ticks.length >= fence.length && !(mark[2] ?? "").trim()) fence = "";
      out[out.length - 1]!.text += line + "\n";
      continue;
    }
    const heading = !fence ? /^##\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (heading) out.push({ title: heading[1] ?? "", text: "" });
    else out[out.length - 1]!.text += line + "\n";
  }
  return out.map(s => ({ title: s.title, text: s.text.trim() }));
}

export function parseLayers(text: string): Layers {
  const parts = sections(text);
  const raw = parts.filter(s => /^(原始意图|raw source)$/i.test(s.title)).map(s => s.text).join("\n\n");
  const explanation = parts.filter(s => /^(工作解释|expanded spec)$/i.test(s.title)).map(s => s.text).join("\n\n");
  const layered = parts.some(s => /^(原始意图|工作解释|raw source|expanded spec)$/i.test(s.title));
  return { raw, explanation, legacy: layered ? "" : text.trim() };
}

function pathList(raw: string | undefined, field: string, problems: string[]): string[] {
  if (raw === undefined) return [];
  try {
    if (!raw.startsWith("[") || !raw.endsWith("]")) throw new Error("expected an inline list");
    const items: unknown = raw.includes('"') ? JSON.parse(raw) : raw.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    if (!Array.isArray(items) || items.some(s => typeof s !== "string" || !s.trim())) throw new Error("expected paths");
    const values = items as string[];
    if (new Set(values).size !== values.length) throw new Error("duplicate paths");
    return [...values].sort();
  } catch {
    problems.push(`${field}: expected a unique inline path list (use JSON quotes for special characters)`);
    return [];
  }
}

export function contentFingerprint(id: string, specHash: string, codeHash: string): string {
  return sha256Normalized(JSON.stringify({ id, specHash, codeHash }));
}

export function loadSpecModel(ctx: Ctx): SpecModel {
  const model: SpecModel = {
    requirements: [], features: [], layers: { raw: "", explanation: "", legacy: "" },
    requirementFile: "", problems: [],
  };
  const records = repoRelative(ctx, ctx.records);
  try {
    safePath(ctx, `${records}/requirements/INDEX.md`);
    const cur = readCurrent(join(ctx.records, "requirements", "INDEX.md"));
    if (!cur.file || !/^v\d+\.md$/.test(cur.file)) throw new Error(cur.error || "invalid requirements current pointer");
    model.requirementFile = `${records}/requirements/${cur.file}`;
    const source = sourceFile(ctx, model.requirementFile);
    if (source.problem) throw new Error(`${source.path}: ${source.problem}`);
    const body = normalizeText(readFileSync(safePath(ctx, source.path), "utf8"));
    const parts = sections(body);
    const firstReq = parts.findIndex(s => /^REQ-\d{3}\b/.test(s.title));
    const intro = parts.slice(0, firstReq < 0 ? parts.length : firstReq).map(s => `${s.title ? "## " + s.title + "\n" : ""}${s.text}`).join("\n\n");
    model.layers = parseLayers(intro);
    for (const part of parts) {
      const id = /^(REQ-\d{3})\b/.exec(part.title)?.[1];
      if (!id) continue;
      if (model.requirements.some(r => r.id === id)) model.problems.push(`duplicate requirement: ${id}`);
      const text = `## ${part.title}\n\n${part.text}`;
      const protocol = parseRequirementProtocols(text)[0];
      model.requirements.push({
        id, title: part.title, text, source: source.path,
        acceptance: protocol?.acceptance ?? [], verification: protocol?.verification ?? [],
      });
    }
  } catch (error) { model.problems.push((error as Error).message); }
  const featuresDir = `${records}/features`;
  try {
    assertSafeTree(ctx, `${records}/approvals`);
    const root = safePath(ctx, featuresDir);
    if (!existsSync(root)) return model;
    for (const dir of readdirSync(root).sort()) {
      const path = `${featuresDir}/${dir}`;
      try {
        const abs = safePath(ctx, path);
        if (!lstatSync(abs).isDirectory()) continue;
        const planDir = safePath(ctx, `${path}/plan`);
        if (!existsSync(planDir)) continue;
        const versions = readdirSync(planDir).filter(p => /^v\d+\.md$/.test(p)).sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
        for (const p of versions) safePath(ctx, `${path}/plan/${p}`);
        const selected = claimPlanFiles(ctx, abs).at(-1);
        if (!selected) continue;
        const plan = repoRelative(ctx, selected);
        const text = normalizeText(readFileSync(safePath(ctx, plan), "utf8"));
        const { attrs, body } = parseFrontmatter(text);
        const id = attrs.feature ?? "";
        if (!/^F[1-9]\d*$/.test(id)) throw new Error(`${plan}: invalid feature id`);
        if (model.features.some(f => f.id === id)) throw new Error(`duplicate feature: ${id}`);
        const problems: string[] = [];
        const binding = approvalBinding(ctx, plan);
        if (binding.boundBy.length && !binding.matched) problems.push("bound plan body differs from its approval; content review cannot replace approval integrity");
        const reqs = [...new Set((attrs.req ?? "").match(/REQ-\d{3}/g) ?? [])];
        if (!reqs.length) problems.push("no requirements declared");
        for (const req of reqs) if (!model.requirements.some(r => r.id === req)) problems.push(`unknown requirement: ${req}`);
        const implementation = pathList(attrs.implementation, "implementation", problems).map(p => sourceFile(ctx, p));
        const related = pathList(attrs.related, "related", problems).map(p => sourceFile(ctx, p));
        for (const ref of implementation) if (related.some(r => r.path === ref.path)) problems.push(`path is both implementation and related: ${ref.path}`);
        const specHash = sha256Normalized(JSON.stringify({
          plan, text, requirementFile: model.requirementFile, layers: model.layers,
          requirements: reqs.map(id => model.requirements.find(r => r.id === id)?.text ?? id),
        }));
        const codeHash = sha256Normalized(JSON.stringify(implementation));
        const technical = sections(body).filter(s => /^(技术实现|technical implementation)$/i.test(s.title)).map(s => s.text).join("\n\n");
        model.features.push({
          id, title: /^#\s+(.+)$/m.exec(body)?.[1] ?? dir, plan,
          drafts: versions.map(p => `${path}/plan/${p}`).filter(p => Number(/v(\d+)\.md$/.exec(p)?.[1]) > Number(/v(\d+)\.md$/.exec(plan)?.[1])),
          reqs, implementation, related, layers: parseLayers(body), technical, text: body,
          problems, specHash, codeHash, fingerprint: contentFingerprint(id, specHash, codeHash),
        });
      } catch (error) { model.problems.push((error as Error).message); }
    }
  } catch (error) { model.problems.push((error as Error).message); }
  return model;
}
