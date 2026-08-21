# keel

A repo-local process layer for multi-agent development: numbered Chinese records, English skills, one Node+TS gate (no runtime dependencies), thin harness bridges.

This repository is the framework itself. Design norms: `DESIGN.md`. Living picture: `keel/OVERVIEW.md`.

Requires **Node ≥ 22.18.0**.

```text
node tools/gate/gate.ts status
npm test
npm run typecheck
```

Windows: `tools/gate/gate.ps1 status`. macOS/Linux: `tools/gate/gate.sh status`.

Enforcement tier today: **local** (no remotes yet). OS matrix: Windows + macOS + Linux.
