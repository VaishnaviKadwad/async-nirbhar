import os
import subprocess
import sys
from pathlib import Path


def test_nirbhar_db_path_configures_database_before_import(tmp_path):
    repository_root = Path(__file__).resolve().parents[3]
    default_database_path = Path(__file__).resolve().with_name("evidence.sqlite3")
    custom_database_path = tmp_path / "custom-evidence.sqlite3"

    default_before = (
        default_database_path.stat().st_mtime_ns,
        default_database_path.stat().st_size,
    ) if default_database_path.exists() else None

    script = """
import apps.api.storage.evidence_store as evidence_store
from apps.api.models.evidence import Evidence

evidence_store.store_evidence(Evidence(
    id="env-path-test-evidence",
    kind="report",
    category="fire",
    source_type="student",
    zone_id="env-path-test-zone",
    occurred_at="2026-01-01T12:00:00Z",
    state="positive",
))
"""
    environment = os.environ.copy()
    environment["NIRBHAR_DB_PATH"] = str(custom_database_path)
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=repository_root,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    default_after = (
        default_database_path.stat().st_mtime_ns,
        default_database_path.stat().st_size,
    ) if default_database_path.exists() else None

    assert result.returncode == 0, result.stderr
    assert default_after == default_before
    assert custom_database_path.exists()
    assert custom_database_path.stat().st_size > 0
