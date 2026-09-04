import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fail, ok } from "./result.js";
import { hasFlag, readInstallerVersion } from "./layout.js";
import { compareSemanticVersions, parseSemanticVersion } from "./migration.js";

const FULLY_MANAGED_DIRS = ["tools/gate", "keel/templates", ".githooks"];
// CHG-015: the reviewer checklist is keel knowledge, shipped and kept current like the templates.
const MANAGED_FILES = ["CLAUDE.md", ".gitattributes", "keel/review/checklist.md"];
const SKILL_ROOTS = [".agents/skills", ".claude/skills"];
// CHG-016: the keel-owned part of a project's AGENTS.md sits between these markers and
// follows the installer; whatever the project wrote outside them stays.
const AGENTS_BEGIN = "<!-- keel:begin -->";
const AGENTS_END = "<!-- keel:end -->";

function keelSection(text) {
  const a = text.indexOf(AGENTS_BEGIN);
  const b = text.indexOf(AGENTS_END);
  if (a < 0 || b < 0 || b < a) return null;
  return text.slice(a, b + AGENTS_END.length);
}

function mergedAgentsMd(source, cwd) {
  const srcPath = fsPath(source, "AGENTS.md");
  if (!existsSync(srcPath)) return { note: "" };
  const src = readFileSync(srcPath, "utf8");
  const srcSection = keelSection(src);
  if (!srcSection) return { note: "" };
  const dstPath = fsPath(cwd, "AGENTS.md");
  if (!existsSync(dstPath)) return { content: src, note: "" };
  const dst = readFileSync(dstPath, "utf8");
  const dstSection = keelSection(dst);
  if (!dstSection) {
    return {
      note: "AGENTS.md has no <!-- keel:begin --> / <!-- keel:end --> markers, so its keel section is not updated; wrap the keel part in them to let keel update manage it (CHG-016)",
    };
  }
  return { content: dst.replace(dstSection, srcSection), note: "" };
}

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

/** CHG-016: what this update installs, so the next one can tell a local patch from an upstream change. */
function manifestFor(version, desired) {
  const files = {};
  for (const rel of [...desired.files.keys()].sort()) files[rel] = sha256Hex(desired.files.get(rel).content);
  return JSON.stringify({ keel_version: version, files }, null, 2) + "\n";
}

function readManifest(node) {
  if (!node || node.kind !== "file") return {};
  try {
    const parsed = JSON.parse(node.content.toString("utf8"));
    return parsed && typeof parsed.files === "object" && parsed.files ? parsed.files : {};
  } catch {
    return {};
  }
}

function slash(path) {
  return path.split("\\").join("/");
}

function fsPath(root, rel) {
  return join(root, ...rel.split("/"));
}

function repoRelative(root, path) {
  return slash(relative(root, path));
}

function validRecordsDir(root, value) {
  if (typeof value !== "string" || value.trim() === "" || isAbsolute(value)) return null;
  const resolved = fsPath(root, slash(value));
  const rel = repoRelative(root, resolved);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return null;
  return rel;
}

function readProjectConfig(cwd) {
  const bootstrap = fsPath(cwd, "keel/config.json");
  if (!existsSync(bootstrap)) return { error: "not a keel project; run keel init\n" };
  let initial;
  try {
    initial = JSON.parse(readFileSync(bootstrap, "utf8"));
  } catch {
    return { error: "keel/config.json is not valid JSON\n" };
  }
  const records = validRecordsDir(cwd, initial.records_dir || "keel");
  if (!records) return { error: "records_dir must be a repository-relative directory\n" };
  const authoritativePath = fsPath(cwd, `${records}/config.json`);
  if (authoritativePath === bootstrap) return { config: initial, path: bootstrap, records };
  if (!existsSync(authoritativePath)) return { error: `${records}/config.json is missing\n` };
  try {
    return {
      config: JSON.parse(readFileSync(authoritativePath, "utf8")),
      path: authoritativePath,
      records,
    };
  } catch {
    return { error: `${records}/config.json is not valid JSON\n` };
  }
}

function addParents(dirs, rel) {
  let parent = slash(dirname(rel));
  while (parent && parent !== ".") {
    dirs.add(parent);
    parent = slash(dirname(parent));
  }
}

function desiredTree() {
  return { dirs: new Set(), files: new Map() };
}

function addDesiredDir(desired, rel) {
  desired.dirs.add(rel);
  addParents(desired.dirs, rel);
}

function addDesiredFile(desired, rel, content, mode = 0o644) {
  desired.files.set(rel, { content: Buffer.from(content), mode });
  addParents(desired.dirs, rel);
}

function collectSourceTree(source, sourceRel, targetRel, desired) {
  const sourcePath = fsPath(source, sourceRel);
  if (!existsSync(sourcePath)) return;
  const walk = (path, rel) => {
    const st = lstatSync(path);
    if (st.isSymbolicLink()) throw new Error(`installer contains unsupported symlink: ${repoRelative(source, path)}`);
    if (st.isDirectory()) {
      addDesiredDir(desired, rel);
      for (const name of readdirSync(path).sort()) walk(join(path, name), `${rel}/${name}`);
      return;
    }
    if (!st.isFile()) throw new Error(`installer contains unsupported node: ${repoRelative(source, path)}`);
    addDesiredFile(desired, rel, readFileSync(path), st.mode & 0o777);
  };
  walk(sourcePath, targetRel);
}

function collectDesired(source) {
  const desired = desiredTree();
  // CHG-015: a managed file an older installer may lack is shipped when present, never required.
  const optional = ["keel/review/checklist.md"];
  const required = ["package.json", ...FULLY_MANAGED_DIRS, ...MANAGED_FILES.filter((f) => !optional.includes(f)), ".agents/skills"];
  for (const rel of required) {
    if (!existsSync(fsPath(source, rel))) {
      throw new Error(`installer is incomplete (missing managed source ${rel})`);
    }
  }
  for (const rel of FULLY_MANAGED_DIRS) collectSourceTree(source, rel, rel, desired);
  for (const rel of MANAGED_FILES) {
    const path = fsPath(source, rel);
    if (!existsSync(path)) continue;
    const st = lstatSync(path);
    if (!st.isFile() || st.isSymbolicLink()) throw new Error(`installer ${rel} must be a regular file`);
    addDesiredFile(desired, rel, readFileSync(path), st.mode & 0o777);
  }
  const skillSource = fsPath(source, ".agents/skills");
  if (existsSync(skillSource)) {
    for (const name of readdirSync(skillSource).sort()) {
      if (!name.startsWith("k-")) continue;
      collectSourceTree(source, `.agents/skills/${name}`, `.agents/skills/${name}`, desired);
      collectSourceTree(source, `.agents/skills/${name}`, `.claude/skills/${name}`, desired);
    }
  }
  return desired;
}

function scanTargetTree(cwd, rel, nodes, recursive = true) {
  const path = fsPath(cwd, rel);
  if (!existsSync(path)) return;
  const st = lstatSync(path);
  if (st.isSymbolicLink()) throw new Error(`managed target is a symlink; refusing to follow it: ${rel}`);
  if (st.isDirectory()) {
    nodes.set(rel, { kind: "dir", mode: st.mode & 0o777, atime: st.atime, mtime: st.mtime });
    if (recursive) {
      for (const name of readdirSync(path).sort()) scanTargetTree(cwd, `${rel}/${name}`, nodes, true);
    }
    return;
  }
  if (!st.isFile()) throw new Error(`managed target is not a regular file: ${rel}`);
  nodes.set(rel, {
    kind: "file",
    content: readFileSync(path),
    mode: st.mode & 0o777,
    atime: st.atime,
    mtime: st.mtime,
  });
}

function collectTarget(cwd, desired, configRel, manifestRel) {
  const nodes = new Map();
  for (const rel of FULLY_MANAGED_DIRS) scanTargetTree(cwd, rel, nodes, true);
  for (const root of SKILL_ROOTS) {
    const path = fsPath(cwd, root);
    if (!existsSync(path)) continue;
    scanTargetTree(cwd, root, nodes, false);
    for (const name of readdirSync(path).sort()) {
      if (name.startsWith("k-")) scanTargetTree(cwd, `${root}/${name}`, nodes, true);
    }
  }
  for (const rel of MANAGED_FILES) scanTargetTree(cwd, rel, nodes, true);
  scanTargetTree(cwd, configRel, nodes, true);
  if (manifestRel) scanTargetTree(cwd, manifestRel, nodes, true);
  for (const rel of desired.files.keys()) {
    if (!nodes.has(rel) && existsSync(fsPath(cwd, rel))) scanTargetTree(cwd, rel, nodes, true);
  }
  for (const rel of desired.dirs) {
    if (!nodes.has(rel)) scanTargetTree(cwd, rel, nodes, false);
  }
  return nodes;
}

function sameBytes(left, right) {
  return left.length === right.length && left.equals(right);
}

function makeOperations(desired, current) {
  const operations = [];
  const paths = new Set([...desired.dirs, ...desired.files.keys(), ...current.keys()]);
  for (const path of [...paths].sort()) {
    const wantFile = desired.files.get(path);
    const wantDir = desired.dirs.has(path) && !wantFile;
    const have = current.get(path);
    if (!wantFile && !wantDir) {
      if (have) operations.push({ action: "delete", path, node: have.kind });
      continue;
    }
    if (wantDir) {
      if (!have) operations.push({ action: "add", path, node: "dir" });
      else if (have.kind !== "dir") {
        operations.push({ action: "delete", path, node: have.kind });
        operations.push({ action: "add", path, node: "dir" });
      }
      continue;
    }
    if (!have) operations.push({ action: "add", path, node: "file", desired: wantFile });
    else if (have.kind !== "file") {
      operations.push({ action: "delete", path, node: have.kind });
      operations.push({ action: "add", path, node: "file", desired: wantFile });
    } else if (!sameBytes(have.content, wantFile.content)) {
      operations.push({ action: "overwrite", path, node: "file", desired: wantFile });
    }
  }
  return operations;
}

function depth(rel) {
  return rel.split("/").length;
}

function applyOperations(cwd, operations, current) {
  const deletes = operations
    .filter((op) => op.action === "delete")
    .sort((a, b) => (a.node === b.node ? depth(b.path) - depth(a.path) : a.node === "file" ? -1 : 1));
  const dirs = operations
    .filter((op) => op.action === "add" && op.node === "dir")
    .sort((a, b) => depth(a.path) - depth(b.path));
  const files = operations.filter((op) => op.node === "file" && op.action !== "delete");
  const touched = [...new Set(operations.map((op) => op.path))];
  try {
    for (const op of deletes) {
      const path = fsPath(cwd, op.path);
      if (op.node === "dir") rmdirSync(path);
      else rmSync(path, { force: true });
    }
    for (const op of dirs) mkdirSync(fsPath(cwd, op.path));
    for (const op of files) {
      const path = fsPath(cwd, op.path);
      writeFileSync(path, op.desired.content);
      if (process.platform !== "win32") chmodSync(path, op.desired.mode);
    }
  } catch (error) {
    // Confirmation never creates backup files. The in-memory pre-write snapshot
    // is enough to put every planned path back if an operation fails midway.
    for (const path of touched.sort((a, b) => depth(b) - depth(a))) {
      const abs = fsPath(cwd, path);
      if (!existsSync(abs)) continue;
      const st = lstatSync(abs);
      if (st.isDirectory()) {
        try {
          rmdirSync(abs);
        } catch {
          // Children are handled first; unrelated children are preserved.
        }
      } else {
        rmSync(abs, { force: true });
      }
    }
    const originalDirs = [...current.entries()]
      .filter(([path, node]) => touched.includes(path) && node.kind === "dir")
      .sort(([a], [b]) => depth(a) - depth(b));
    for (const [path] of originalDirs) mkdirSync(fsPath(cwd, path), { recursive: true });
    for (const [path, node] of current) {
      if (!touched.includes(path) || node.kind !== "file") continue;
      const abs = fsPath(cwd, path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, node.content);
      if (process.platform !== "win32") chmodSync(abs, node.mode);
    }
    return { error };
  }
  return {};
}

function displayOperation(op) {
  const label = op.action === "add" ? "ADD" : op.action === "overwrite" ? "OVERWRITE" : "DELETE";
  return `${label} ${op.path}${op.node === "dir" ? "/" : ""}`;
}

function formatPreview(sourceVersion, targetVersion, operations) {
  const lines = [`keel update preview ${sourceVersion} -> ${targetVersion}`];
  if (operations.length === 0) lines.push("NO FILE CHANGES");
  else lines.push(...operations.map(displayOperation));
  lines.push("Proceed? [y/N] ");
  return lines.join("\n");
}

export function runUpdate(cwd, source, args, io) {
  const loaded = readProjectConfig(cwd);
  if (loaded.error) return fail(loaded.error);
  const cfg = loaded.config;
  const targetVersion = readInstallerVersion(source);
  const sourceVersion = typeof cfg.keel_version === "string" ? cfg.keel_version : "";
  if (!parseSemanticVersion(sourceVersion)) {
    return fail("project keel_version is missing or is not a valid semantic version; update made no changes\n");
  }
  if (!parseSemanticVersion(targetVersion)) {
    return fail("global CLI version is not a valid semantic version; update made no changes\n");
  }
  const comparison = compareSemanticVersions(targetVersion, sourceVersion);
  if (comparison < 0 && !hasFlag(args, "force")) {
    return fail(
      "global CLI " + targetVersion + " is older than project keel_version " + sourceVersion + "; pass --force to continue\n",
    );
  }

  try {
    const desired = collectDesired(source);
    const configRel = repoRelative(cwd, loaded.path);
    const nextConfig = { ...cfg, keel_version: targetVersion };
    addDesiredFile(desired, configRel, JSON.stringify(nextConfig, null, 2) + "\n");

    // CHG-016: AGENTS.md keel section follows the installer; project text outside the markers stays.
    const agents = mergedAgentsMd(source, cwd);
    if (agents.content !== undefined) addDesiredFile(desired, "AGENTS.md", agents.content);
    // CHG-016: the install manifest (hashes of every managed file) is itself a managed file.
    const manifestRel = `${loaded.records}/installed.json`;
    addDesiredFile(desired, manifestRel, manifestFor(targetVersion, desired));
    const current = collectTarget(cwd, desired, configRel, manifestRel);
    const operations = makeOperations(desired, current);
    // A managed file that differs from what the last update installed is a local patch:
    // say so before it is overwritten (zhaoxi patched ctx.ts and reviewloop.ts twice).
    const installed = readManifest(current.get(manifestRel));
    for (const op of operations) {
      if (op.action !== "overwrite" || !installed[op.path]) continue;
      const have = current.get(op.path);
      if (have && have.kind === "file" && sha256Hex(have.content) !== installed[op.path]) op.localPatch = true;
    }
    let preview = formatPreview(sourceVersion, targetVersion, operations);
    for (const op of operations) {
      if (!op.localPatch) continue;
      preview = preview.replace(
        `OVERWRITE ${op.path}`,
        `OVERWRITE ${op.path}  (LOCAL PATCH: differs from the installed copy — your edit is lost on apply; copy it out or file an ISS for keel)`,
      );
    }
    if (agents.note) preview = preview.replace("Proceed? [y/N] ", `note: ${agents.note}\nProceed? [y/N] `);
    if (typeof io?.emitUpdatePreview === "function") io.emitUpdatePreview(preview);
    // ISS-069: an agent session has no terminal to type y into; --yes is the audited way
    // to say it. A piped "y" still does not count (REQ-025/AC-7 keeps stray input out).
    const yes = hasFlag(args, "yes");
    let answer = yes ? "y" : null;
    if (!yes && typeof io?.confirmUpdate === "function") {
      try {
        answer = io.confirmUpdate();
      } catch {
        answer = null;
      }
    }
    const returnedPreview = typeof io?.emitUpdatePreview === "function" ? "" : preview;
    if (!/^y$/i.test(typeof answer === "string" ? answer.trim() : "")) {
      const hint = answer === null ? " (no terminal to confirm in? pass --yes)" : "";
      return ok(returnedPreview + `keel update cancelled; no files changed${hint}\n`);
    }
    const applied = applyOperations(cwd, operations, current);
    if (applied.error) {
      const message = applied.error instanceof Error ? applied.error.message : String(applied.error);
      return fail(`keel update failed and rolled back: ${message}\n`);
    }
    return ok(
      returnedPreview +
        "keel update applied " +
        targetVersion +
        (hasFlag(args, "force") ? " (--force)" : "") +
        (yes ? " (--yes)" : "") +
        "\n",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`keel update refused before confirmation: ${message}; update made no changes\n`);
  }
}
