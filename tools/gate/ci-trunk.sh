#!/bin/bash
# DEC-138: judge this tree with the trunk copy of tools/gate, then restore.
set -euo pipefail
if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  echo "ci-trunk: no origin/main; skip"
  exit 0
fi
if ! git cat-file -e origin/main:tools/gate/gate.ts 2>/dev/null; then
  echo "ci-trunk: trunk has no gate.ts; skip"
  exit 0
fi
git checkout origin/main -- tools/gate
node tools/gate/gate.ts check --quick
git checkout HEAD -- tools/gate
echo "ci-trunk: trunk gate check --quick passed"
