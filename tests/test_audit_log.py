import importlib


def test_audit_events_persist_and_keep_insertion_order(monkeypatch, tmp_path):
    database_path = tmp_path / "audit.db"
    monkeypatch.setenv("NIRBHAR_AUDIT_DB_PATH", str(database_path))

    from apps.api.audit import audit_log

    audit_log = importlib.reload(audit_log)
    expected_events = [
        ("evidence.received", {"evidence_id": "evt-001"}),
        ("incident.created", {"incident_id": "INC-DEMO-001"}),
        ("decision.approved", {"incident_id": "INC-DEMO-001", "actor": "officer-demo"}),
    ]

    for event_type, payload in expected_events:
        audit_log.append_event(event_type, payload)

    events_before_restart = audit_log.get_all_events()

    importlib.reload(audit_log)
    events_after_restart = audit_log.get_all_events()

    assert events_after_restart == events_before_restart
    assert [event["id"] for event in events_after_restart] == sorted(
        event["id"] for event in events_after_restart
    )
    assert [(event["event_type"], event["payload"]) for event in events_after_restart] == expected_events
