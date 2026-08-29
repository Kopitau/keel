import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

/** DEC-144: hash normalized content (UTF-8, no BOM, LF), never raw disk bytes. */
export function normalizeText(input: string | Uint8Array): string {
  const text = typeof input === "string" ? input : Buffer.from(input).toString("utf8");
  const noBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return noBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function sha256Normalized(input: string | Uint8Array): string {
  const normalized = normalizeText(input);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * CHG-011 / REQ-018 AC-1: approvals bind the body — the normalized text after a
 * leading front-matter block. Metadata edits (status, date, ids) never move it.
 */
export function bodyText(input: string | Uint8Array): string {
  const text = normalizeText(input);
  const fm = text.match(/^---\n[\s\S]*?\n---\n?/);
  return fm ? text.slice(fm[0].length) : text;
}

export function sha256Body(input: string | Uint8Array): string {
  return createHash("sha256").update(bodyText(input), "utf8").digest("hex");
}
