/**
 * Git exports state into hook processes: GIT_DIR / GIT_INDEX_FILE / GIT_WORK_TREE /
 * GIT_PREFIX (the real repo) and GIT_AUTHOR_* / GIT_COMMITTER_* (the real identity).
 * Any fixture `git` — spawned by a test or by the gate under test — inherits them and
 * lands on the real HEAD or under the real committer's name (KLES-002; ISS-045).
 *
 * One pattern, used by every test that touches git. Not a hand-written list: the
 * first incident (GIT_DIR) was fixed by naming the four variables seen that day, and
 * the author variables bit the next full-suite hook run (ISS-045, C-61 one level up).
 */
export const HOOK_LEAKED_GIT_ENV = /^GIT_(DIR|INDEX_FILE|WORK_TREE|PREFIX|AUTHOR_|COMMITTER_)/;

/** A copy of `env` without anything a git hook exports. */
export function scrubHookGitEnv(env: { [k: string]: string | undefined }): { [k: string]: string | undefined } {
  const out: { [k: string]: string | undefined } = {};
  for (const [k, v] of Object.entries(env)) {
    if (!HOOK_LEAKED_GIT_ENV.test(k)) out[k] = v;
  }
  return out;
}

/** Strip the same variables from process.env, for in-process gate git() calls. */
export function scrubProcessGitEnv(env: { [k: string]: string | undefined }): void {
  for (const k of Object.keys(env)) {
    if (HOOK_LEAKED_GIT_ENV.test(k)) delete env[k];
  }
}
