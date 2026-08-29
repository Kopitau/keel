# Platform hard limits (C-122)

Numbers have sources. Update when a vendor changes them. Soft budget over = warn; **hard limit over = gate fail** (C-119). Silent truncation equals rules gone.

| Limit | Value | Source (retrieved 2026-08-17 via R5 unless noted) |
|---|---|---|
| Codex `AGENTS.md` chain | **32 KiB hard**; overflow truncated silently | R5 / C-118; Codex docs cited in `docs/research/R5-enforcement-evidence-traceability-ci.md` |
| AGENTS.md lines (keel) | 150 soft | C-118 (keel policy, not a vendor hard cap) |
| CLAUDE.md | 1 line in keel (`@AGENTS.md`) | C-94 / C-118 |
| Anthropic CLAUDE.md guidance | ≤200 lines (guidance) | R5 [C3] Anthropic docs |
| SKILL.md lines | 500 soft | C-118 |
| Skill `description` | 1024 characters | C-95 / C-118 (Agent Skills standard field) |
| Autoload (root + catalog) | 10 KiB soft (W6 KEEP; measured 6427 bytes on 2026-08-21) | C-26 / C-118; Trellis SessionStart ~29 KB truncation lesson (R3a) |
| Skill count | ~16 cap | C-121; DESIGN §9 working list is 16 |
| Cursor client `AGENTS.md` | no documented cap (checked 2026-08-29) | RES-908; https://cursor.com/docs/context/rules |
| Node (gate runtime) | **≥22.18.0** hard | DEC-150; type stripping unflagged in 22.18.0 (2025-07-31). CI matrix: Node 22 LTS + 24 LTS × three OS |

Harness notes (not byte caps):

- Grok Build hooks are fail-open (R2/R5) → never treat L1 as authority.
- DeepSeek Harness Windows: Python SDK/PTY unsupported; use WSL (C-96).
- Claude Code is the only primary that needs the `CLAUDE.md` bridge (C-94).
