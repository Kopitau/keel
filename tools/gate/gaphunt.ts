import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { mdFiles } from "./walk.ts";

export type GapHuntVerdict = { level: "fail" | "warn"; summary: string; fix: string };

/** Enumerated rows: list items, numbered items, or table rows (separators excluded). */
export function enumeratedRows(text: string): number {
  let n = 0;
  for (const raw of text.split(/\n/)) {
    const t = raw.trim();
    if (t.startsWith("|")) {
      if (!/^[|\s:-]+$/.test(t)) n += 1;
      continue;
    }
    if (/^[-*]\s+\S/.test(t) || /^\d+[.)]\s+\S/.test(t)) n += 1;
  }
  return n;
}

/**
 * Someone other than the interviewer is named as having done the hunt (C-06).
 * Accepts the explicit field or the plain-prose forms people actually write.
 */
export function hasHunterAttribution(text: string): boolean {
  if (/^\s*-?\s*\*\*hunter\*\*:\s*\S/m.test(text)) return true;
  if (/(未见过|未参与|没参与|没见过)[^\n]{0,24}(访谈|对话)/.test(text)) return true;
  if (/fresh[ -]context/i.test(text)) return true;
  if (/did not (see|run|take part in)[^\n]{0,24}interview/i.test(text)) return true;
  return false;
}

/** An explicit "nothing found", so a clean hunt is not mistaken for no hunt. */
export function declaresNoFindings(text: string): boolean {
  if (/无缺口|未发现|没有发现/.test(text)) return true;
  if (/no (gaps|findings)/i.test(text)) return true;
  return /^\s*无\s*$/m.test(text);
}

/** Gap-hunt records in keel/requirements/, by filename, regardless of naming style. */
export function huntFiles(ctx: Ctx): string[] {
  return mdFiles(join(ctx.records, "requirements"), "").filter((f) => /gap/i.test(basename(f)));
}

/**
 * C-06: before a requirements baseline, a fresh context that did not run the
 * interview hunts gaps independently. A promise in chat is not a record.
 *
 * Judge the substance, not the layout. The best real artifact this rule has
 * seen (zhaoxi `v1-gaps.md`, 2026-08-25) was a 45-row table named `vN-gaps.md`
 * with the attribution in a prose sentence and no `## 发现` heading at all. A
 * check that insisted on one filename, one field and one heading would have
 * failed the very practice it exists to require. So: no hunt at all is a fail,
 * a hunt with no findings listed is a fail, and anything that is merely shaped
 * unusually is a warn.
 */
export function gapHuntGaps(ctx: Ctx, reqFile: string): GapHuntVerdict | null {
  const stem = basename(reqFile, ".md");
  const hunts = huntFiles(ctx);
  if (hunts.length === 0) {
    return {
      level: "fail",
      summary: "requirements baselined (status: confirmed) but no gap-hunt record (C-06)",
      fix: `a fresh context that did not run the interview hunts gaps; record findings and their disposition in keel/requirements/gap-hunt-${stem}.md`,
    };
  }
  const mine = hunts.filter((f) => basename(f).includes(stem));
  if (mine.length === 0) {
    return {
      level: "warn",
      summary: `gap-hunt record(s) exist but none names ${stem}`,
      fix: `re-hunt when the requirements version changes materially, or name the record after ${stem} (C-06)`,
    };
  }
  for (const f of mine) {
    const t = readFileSync(f, "utf8");
    if (enumeratedRows(t) < 3 && !declaresNoFindings(t)) {
      return {
        level: "fail",
        summary: `${basename(f)} lists no findings (C-06)`,
        fix: "list each gap and its disposition; a hunt that found nothing must say so and state what it covered",
      };
    }
    if (!hasHunterAttribution(t)) {
      return {
        level: "warn",
        summary: `${basename(f)} does not say who hunted (C-06)`,
        fix: "add `- **hunter**: <the context that did not run the interview>`",
      };
    }
  }
  return null;
}
