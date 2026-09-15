#!/bin/bash
# DEC-138: judge this tree with the trunk copy of tools/gate, then restore.
set -euo pipefail
trunk_ref="${KEEL_TRUNK_REF:-origin/main}"
if ! git rev-parse --verify "$trunk_ref" >/dev/null 2>&1; then
  if [ -n "${KEEL_TRUNK_REF:-}" ]; then
    echo "ci-trunk: configured trunk $trunk_ref not found" >&2
    exit 1
  fi
  echo "ci-trunk: no $trunk_ref; skip"
  exit 0
fi
if ! git cat-file -e "$trunk_ref:tools/gate/gate.ts" 2>/dev/null; then
  echo "ci-trunk: trunk has no gate.ts; skip"
  exit 0
fi
git checkout "$trunk_ref" -- tools/gate
node tools/gate/gate.ts check --quick
git checkout HEAD -- tools/gate
echo "ci-trunk: trunk gate check --quick passed"
