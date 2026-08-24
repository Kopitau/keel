/** Plain JavaScript. Used by bin/keel.js before any TypeScript is loaded. */

const MIN = [22, 18, 0];

export function nodeTooOld(ver) {
  const cleaned = String(ver).replace(/^v/i, "").split("-")[0] || "0.0.0";
  const parts = cleaned.split(".").map(function (p) {
    return parseInt(p, 10) || 0;
  });
  for (let i = 0; i < 3; i++) {
    const a = parts[i] || 0;
    const b = MIN[i] || 0;
    if (a > b) return false;
    if (a < b) return true;
  }
  return false;
}

export function refuseOldNodeMessage(ver) {
  return "keel: 需要 Node ≥22.18.0（当前 " + ver + "）";
}
