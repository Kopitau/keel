"""W1 skeleton / bootstrap format tests (C-139 templates; C-32 req markers)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
KEEL = ROOT / "keel"


@pytest.mark.core
@pytest.mark.req("REQ-016")
def test_claude_md_is_single_bridge_line() -> None:
    text = (ROOT / "CLAUDE.md").read_text(encoding="utf-8").strip()
    assert text == "@AGENTS.md"


@pytest.mark.core
@pytest.mark.req("REQ-020")
def test_agents_md_line_and_byte_budget() -> None:
    raw = (ROOT / "AGENTS.md").read_bytes()
    text = raw.decode("utf-8")
    lines = text.splitlines()
    assert len(lines) <= 150, f"AGENTS.md has {len(lines)} lines"
    assert len(raw) <= 32768, f"AGENTS.md is {len(raw)} bytes"


@pytest.mark.core
@pytest.mark.req("REQ-021")
def test_config_json_required_keys() -> None:
    data = json.loads((KEEL / "config.json").read_text(encoding="utf-8"))
    for key in (
        "schema_version",
        "project_name",
        "records_dir",
        "enforcement_tier",
        "profiles",
        "identities",
        "platforms",
        "budget",
        "optional",
    ):
        assert key in data
    assert data["enforcement_tier"] == "local"
    assert data["records_dir"] == "keel"
    assert "python-cli" in data["profiles"]["active"]


@pytest.mark.core
@pytest.mark.req("REQ-004")
def test_plan_index_has_unique_current() -> None:
    text = (KEEL / "plan" / "INDEX.md").read_text(encoding="utf-8")
    currents = [ln for ln in text.splitlines() if ln.startswith("- current:")]
    assert currents == ["- current: overview-v1.md"]
    assert (KEEL / "plan" / "overview-v1.md").is_file()


@pytest.mark.core
@pytest.mark.req("REQ-011")
def test_requirements_index_unique_current() -> None:
    text = (KEEL / "requirements" / "INDEX.md").read_text(encoding="utf-8")
    currents = [ln for ln in text.splitlines() if ln.startswith("- current:")]
    assert currents == ["- current: v1.md"]
    body = (KEEL / "requirements" / "v1.md").read_text(encoding="utf-8")
    for i in range(1, 24):
        assert f"## REQ-{i:03d}" in body


@pytest.mark.core
@pytest.mark.req("REQ-023")
def test_id_map_covers_design_ledger() -> None:
    data = json.loads(
        (KEEL / "features" / "f23-bootstrap" / "id-map.json").read_text(encoding="utf-8")
    )
    assert len(data["features"]) == 23
    assert len(data["decisions"]) == 142
    assert data["decisions"]["C-01"] == "DEC-001"
    assert data["decisions"]["C-142"] == "DEC-142"
    assert data["research"]["R1"] == "RES-001"
    assert data["research"]["R7"] == "RES-008"
    for cid, dec in data["decisions"].items():
        path = KEEL / "decisions" / f"{dec}-{cid}.md"
        assert path.is_file(), path.name


@pytest.mark.core
@pytest.mark.req("REQ-023")
def test_sources_marked_not_deleted() -> None:
    assert (ROOT / "DESIGN.md").is_file()
    assert (ROOT / "docs" / "features.md").is_file()
    assert (ROOT / "docs" / "decisions.md").is_file()
    marker = "keel-migrated: 2026-08-21"
    assert marker in (ROOT / "DESIGN.md").read_text(encoding="utf-8")
    assert marker in (ROOT / "docs" / "features.md").read_text(encoding="utf-8")


@pytest.mark.core
@pytest.mark.req("REQ-022")
def test_mapping_tables_exist() -> None:
    for name in ("trellis.md", "superpowers.md", "unstructured.md"):
        assert (KEEL / "templates" / "migrate" / name).is_file()


@pytest.mark.core
@pytest.mark.req("REQ-012")
def test_gate_status_prints_handoff_path() -> None:
    proc = subprocess.run(
        [sys.executable, "-X", "utf8", str(ROOT / "tools" / "gate" / "gate.py"), "status"],
        check=False,
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    assert proc.returncode == 0, proc.stderr
    assert "handoff:" in proc.stdout
    assert "keel" in proc.stdout.replace("\\", "/")


@pytest.mark.req("REQ-004")
def test_every_feature_has_plan_and_worklog() -> None:
    feats = sorted(p for p in (KEEL / "features").iterdir() if p.is_dir())
    assert len(feats) == 23
    for d in feats:
        assert (d / "plan" / "v1.md").is_file(), d.name
        assert (d / "worklog.md").is_file(), d.name
