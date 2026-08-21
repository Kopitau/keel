/** Tiny consumer-app kernel for the W5 smoke sample. */
function greet(name) {
  const n = String(name ?? "").trim();
  if (!n) throw new Error("name required");
  return "hello " + n;
}

module.exports = { greet };
