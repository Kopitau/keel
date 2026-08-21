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
