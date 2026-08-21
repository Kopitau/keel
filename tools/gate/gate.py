#!/usr/bin/env python3
# keel gate — W1 stub. Real subcommands (check/new/index/trace/verify/…) land in W2.
# Python ≥3.11, stdlib only (C-101). Windows: python -X utf8.

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECORDS = ROOT / "keel"
CONFIG = RECORDS / "config.json"


def load_config() -> dict:
    if not CONFIG.is_file():
        return {}
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if not str(k).startswith("_")}


def cmd_status(argv: list[str]) -> int:
    cfg = load_config()
    tier = cfg.get("enforcement_tier", "unknown")
    print("keel status")
    print("wave: W1-stub")
    print(f"root: {ROOT}")
    print(f"records_dir: {RECORDS}")
    print(f"handoff: {RECORDS / 'handoff.md'}")
    print(f"overview: {RECORDS / 'OVERVIEW.md'}")
    print(f"plan_index: {RECORDS / 'plan' / 'INDEX.md'}")
    print(f"enforcement_tier: {tier}")
    print("note: full gates are W2; this stub only prints start-of-session paths (C-27/C-72).")
    if argv:
        print("ignored extra args: " + " ".join(argv), file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in {"-h", "--help", "help"}:
        print("usage: python -X utf8 tools/gate/gate.py status")
        print("W1 stub: only `status` is implemented.")
        return 0
    cmd, *rest = args
    if cmd == "status":
        return cmd_status(rest)
    print(f"unknown command {cmd!r}; W1 stub supports: status", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
