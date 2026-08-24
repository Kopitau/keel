#!/bin/sh
# DEC-146: POSIX launcher. Detects Node and refuses versions below 22.18.0 (DEC-150).
set -e
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v node >/dev/null 2>&1; then
  echo "keel: node not found. Need Node >= 22.18.0 (DEC-150)." >&2
  exit 1
fi
node -e "const c=process.versions.node.split('.').map(Number);const m=[22,18,0];for (let i=0;i<3;i++){if((c[i]||0)>(m[i]||0))process.exit(0);if((c[i]||0)<(m[i]||0))process.exit(2);}" || {
  echo "keel: Node $(node -p process.versions.node) is below 22.18.0 (DEC-150). Refusing to run." >&2
  exit 1
}
exec node "$here/gate.ts" "$@"
