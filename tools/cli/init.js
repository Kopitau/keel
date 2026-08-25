import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fail, ok } from "./result.js";
import { EXEC_REQUIRED, INIT_COPY, flag, parseHuman, readInstallerVersion } from "./layout.js";

function git(cwd, args) {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: cwd });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function copyTree(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function looksLikeLegacyFramework(cwd) {
  const hints = [];
  if (existsSync(join(cwd, ".trellis"))) hints.push(".trellis/");
  if (existsSync(join(cwd, "SUPERPOWERS.md"))) hints.push("SUPERPOWERS.md");
  const sp = join(cwd, ".agents", "skills");
  if (existsSync(sp)) {
    try {
      const names = readdirSync(sp);
      if (names.some(function (n) {
        return /superpowers/i.test(n);
      })) hints.push(".agents/skills/*superpowers*");
    } catch {
      /* ignore */
    }
  }
  return hints;
}

export function buildCleanConfig(opts) {
  const version = readInstallerVersion(opts.source);
  const humans =
    opts.humanName && opts.humanEmail
      ? [{ name: opts.humanName, email: opts.humanEmail }]
      : [];
  const primary = opts.platformsKeep === false
    ? []
    : ["claude-code", "codex", "opencode", "grok-build", "deepseek-harness"];
  const body = {
    schema_version: 1,
    project_name: opts.name || basename(opts.cwd),
    records_dir: "keel",
    enforcement_tier: opts.tier || "local",
    keel_version: version,
    profiles: {
      active: "unset",
      "python-cli": { language: "python", test_command: "python -m pytest -q", core_marker: "core" },
      "ds-ml": { language: "python", test_command: "python -m pytest -q", core_marker: "core" },
      "ts-js": { language: "typescript", test_command: "npx vitest run" },
      other: { language: "other", test_command: "echo 'configure junit-compatible command'", junit_compatible: true },
    },
    identities: {
      humans: humans,
      agents: [{ name: "keel-agent", email: "agent@keel.local" }],
    },
    platforms: { primary: primary, compatible: ["pi"] },
    budget: {
      agents_md_max_lines: 150,
      agents_md_chain_max_bytes: 32768,
      skill_max_lines: 500,
      skill_description_max_chars: 1024,
      autoload_max_bytes: 10240,
      skill_count_cap: 16,
    },
    optional: { no_mistakes: false, heterogeneous_review: false, recorder_medium_for_longform: true },
    oss_review_days: 28,
    knowledge_cap: 100,
    rules_area_cap: null,
  };
  return JSON.stringify(body, null, 2) + "\n";
}

function writeEmptyBaseline(cwd) {
  mkdirSync(join(cwd, "keel"), { recursive: true });
  writeFileSync(
    join(cwd, "keel", "test-baseline.json"),
    JSON.stringify({ schema_version: 1, names: [] }, null, 2) + "\n",
    "utf8",
  );
}

function syncSkills(cwd) {
  const src = join(cwd, ".agents", "skills");
  const dest = join(cwd, ".claude", "skills");
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

function projectCheck(cwd) {
  const gate = join(cwd, "tools", "gate", "gate.ts");
  const r = spawnSync(process.execPath, [gate, "check", "--quick"], { encoding: "utf8", cwd: cwd });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export function runInit(opts) {
  const cwd = opts.cwd;
  const source = opts.source;
  if (existsSync(join(cwd, "keel", "config.json"))) {
    return fail("keel/config.json already exists; use k-change / k-impl, not keel init\n");
  }
  const notes = [];
  const legacy = looksLikeLegacyFramework(cwd);
  if (legacy.length > 0) {
    notes.push("legacy traces " + legacy.join(", ") + ": 迁移旧记录请用 k-migrate（F22）");
  }
  for (let i = 0; i < INIT_COPY.length; i++) {
    const rel = INIT_COPY[i];
    const src = join(source, rel);
    if (!existsSync(src)) return fail("installer missing " + rel + "\n");
    copyTree(src, join(cwd, rel));
  }
  mkdirSync(join(cwd, "keel"), { recursive: true });
  mkdirSync(join(cwd, "keel", "requirements"), { recursive: true });
  mkdirSync(join(cwd, "keel", "plan"), { recursive: true });
  mkdirSync(join(cwd, "keel", "features"), { recursive: true });
  mkdirSync(join(cwd, "keel", "issues"), { recursive: true });
  mkdirSync(join(cwd, "keel", "decisions"), { recursive: true });
  mkdirSync(join(cwd, "tests"), { recursive: true });
  writeFileSync(join(cwd, "keel", "config.json"), buildCleanConfig(opts), "utf8");
  writeFileSync(
    join(cwd, ".gitignore"),
    "node_modules/\nkeel/evidence/*.json\nkeel/evidence/*.xml\n",
    "utf8",
  );
  writeEmptyBaseline(cwd);
  syncSkills(cwd);
  if (!existsSync(join(cwd, ".git"))) {
    git(cwd, ["init"]);
  }
  git(cwd, ["config", "core.hooksPath", ".githooks"]);
  git(cwd, ["add", "-A"]);
  git(cwd, ["update-index", "--chmod=+x", "--"].concat(EXEC_REQUIRED));
  const chk = projectCheck(cwd);
  notes.push("profiles.active is unset until the unified plan picks a test profile");
  const out = ["keel init " + (opts.name || basename(cwd))]
    .concat(notes.map(function (n) {
      return "note: " + n;
    }))
    .concat([chk.stdout.trim(), ""])
    .join("\n");
  return chk.code === 0 ? ok(out) : { code: chk.code, stdout: out, stderr: chk.stderr };
}

export function initFromArgs(cwd, source, args) {
  const human = flag(args, "human");
  const parsed = human
    ? parseHuman(human)
    : { name: flag(args, "human-name") || "", email: flag(args, "human-email") || "" };
  const tier = flag(args, "tier") || "local";
  if (["local", "github", "gitee"].indexOf(tier) < 0) {
    return fail("tier must be local | github | gitee\n");
  }
  return runInit({
    cwd: cwd,
    source: source,
    name: flag(args, "name") || basename(cwd),
    tier: tier,
    humanName: parsed.name,
    humanEmail: parsed.email,
    platformsKeep: flag(args, "platforms") !== "none",
  });
}
