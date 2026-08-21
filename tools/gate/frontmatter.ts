export type Attrs = { [key: string]: string };

export function parseFrontmatter(text: string): { attrs: Attrs; body: string } {
  const lines = text.split(/\n/);
  if ((lines[0] ?? "").trim() !== "---") return { attrs: {}, body: text };
  const attrs: Attrs = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "---") {
      i += 1;
      break;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^"|"$/g, "");
    attrs[key] = val;
  }
  return { attrs, body: lines.slice(i).join("\n") };
}

export function readAttrList(raw: string | undefined): string[] {
  if (!raw) return [];
  const inner = raw.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
