"""Append-only local audit log backed by SQLite."""

from datetime import datetime, timezone
from contextlib import closing
import json
import os
from pathlib import Path
import sqlite3


_DEFAULT_DB_PATH = Path(__file__).with_name("audit.db")
DB_PATH = Path(os.environ.get("NIRBHAR_AUDIT_DB_PATH", _DEFAULT_DB_PATH))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _initialize_database() -> None:
    with closing(_connect()) as connection:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
                """
            )


def append_event(event_type: str, payload: dict) -> None:
    """Append one event to the audit log."""

    timestamp = datetime.now(timezone.utc).isoformat()
    with closing(_connect()) as connection:
        with connection:
            connection.execute(
                "INSERT INTO audit_events (event_type, payload, timestamp) VALUES (?, ?, ?)",
                (event_type, json.dumps(payload), timestamp),
            )


def append_decision_event(payload: dict, *, reserves_incident: bool) -> str:
    """Atomically record a decision and prevent duplicate approvals for an incident."""

    decision_payload = dict(payload)
    with closing(_connect()) as connection:
        connection.execute("BEGIN IMMEDIATE")
        has_ticket = False
        if reserves_incident:
            for event in connection.execute(
                "SELECT event_type, payload FROM audit_events"
            ):
                stored = json.loads(event["payload"])
                if (
                    event["event_type"] == "incident.decision"
                    and stored.get("incident_id") == decision_payload["incident_id"]
                    and stored.get("outcome") in {"decision_recorded", "ticket_created"}
                ):
                    has_ticket = True
                    break

        outcome = (
            "already_decided"
            if has_ticket
            else "decision_recorded"
            if reserves_incident
            else decision_payload["outcome"]
        )
        decision_payload["outcome"] = outcome
        timestamp = datetime.now(timezone.utc).isoformat()
        connection.execute(
            "INSERT INTO audit_events (event_type, payload, timestamp) VALUES (?, ?, ?)",
            ("incident.decision", json.dumps(decision_payload), timestamp),
        )
        connection.commit()

    return outcome


def get_all_events() -> list[dict]:
    """Return all audit events in their insertion order."""

    with closing(_connect()) as connection:
        rows = connection.execute(
            "SELECT id, event_type, payload, timestamp FROM audit_events ORDER BY id ASC"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "event_type": row["event_type"],
            "payload": json.loads(row["payload"]),
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


_initialize_database()
