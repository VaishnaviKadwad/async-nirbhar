from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.audit import audit_log
from apps.api.correlation import query


router = APIRouter()


def list_incidents() -> list[dict]:
    return [incident.model_dump(mode="json") for incident in query.list_incidents()]


def get_incident(incident_id: str) -> dict | None:
    incident = query.get_incident(incident_id)
    return incident.model_dump(mode="json") if incident is not None else None


class DecisionRequest(BaseModel):
    action: Literal["approve", "modify", "reject"]
    reason: str | None = None
    officer_id: str


class SimulatedResponseTicket(BaseModel):
    ticket_id: str
    incident_id: str
    zone_id: str
    response: str
    decision_action: Literal["approve", "modify"]
    officer_id: str
    reason: str | None
    created_at: str


class DecisionResponse(BaseModel):
    incident_id: str
    action: Literal["approve", "modify", "reject"]
    reason: str | None
    officer_id: str
    ticket: SimulatedResponseTicket | None


def _with_sop_citation(incident: dict) -> dict:
    return {**incident, "sop_citation": "Review Required"}


@router.get("/incidents")
def get_incidents() -> list[dict]:
    return [_with_sop_citation(incident) for incident in list_incidents()]


@router.get("/incidents/{incident_id}")
def get_incident_by_id(incident_id: str) -> dict:
    incident = get_incident(incident_id)
    if incident is None:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found",
        )
    return _with_sop_citation(incident)


def _decision_payload(
    incident_id: str,
    decision: DecisionRequest,
    outcome: str,
) -> dict:
    return {
        "incident_id": incident_id,
        "action": decision.action,
        "reason": decision.reason,
        "officer_id": decision.officer_id,
        "outcome": outcome,
    }


def _record_decision(incident_id: str, decision: DecisionRequest, outcome: str) -> None:
    audit_log.append_event(
        "incident.decision",
        _decision_payload(incident_id, decision, outcome),
    )


# Pydantic schema failures are intentionally unaudited; this log covers requests that reach business logic.
@router.post("/incidents/{incident_id}/decision", response_model=DecisionResponse)
def submit_incident_decision(
    incident_id: str,
    decision: DecisionRequest,
) -> DecisionResponse:
    incident = get_incident(incident_id)
    if incident is None:
        _record_decision(incident_id, decision, "incident_not_found")
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found",
        )

    if decision.action in {"modify", "reject"} and not (
        decision.reason and decision.reason.strip()
    ):
        _record_decision(incident_id, decision, "invalid_reason")
        raise HTTPException(
            status_code=422,
            detail="A non-empty reason is required for modify and reject decisions",
        )

    ticket = None
    outcome = "recorded_no_ticket"
    if decision.action in {"approve", "modify"}:
        outcome = audit_log.append_decision_event(
            _decision_payload(incident_id, decision, "ticket_created"),
            ticket_creating=True,
        )
        if outcome == "already_decided":
            raise HTTPException(
                status_code=409,
                detail="Incident already has a recorded decision",
            )

        # TEST_PLAN.md still says modify creates no ticket; B2 requires one.
        ticket = SimulatedResponseTicket(
            ticket_id=str(uuid4()),
            incident_id=incident_id,
            zone_id=incident["zone_id"],
            response=incident["response"],
            decision_action=decision.action,
            officer_id=decision.officer_id,
            reason=decision.reason,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    else:
        _record_decision(incident_id, decision, outcome)

    return DecisionResponse(
        incident_id=incident_id,
        action=decision.action,
        reason=decision.reason,
        officer_id=decision.officer_id,
        ticket=ticket,
    )
