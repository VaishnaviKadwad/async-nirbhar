from datetime import datetime, timezone
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.audit import audit_log
from apps.api.correlation import query
from apps.api.reasoning.explain import generate_explanation
from rag.retrieve import THRESHOLD, retrieve_sop


router = APIRouter()
SOP_CITATION = "Review Required"
LOGGER = logging.getLogger(__name__)


def list_incidents() -> list[dict]:
    return [incident.model_dump(mode="json") for incident in query.list_incidents()]


def get_incident(incident_id: str) -> dict | None:
    incident = query.get_incident(incident_id)
    return incident.model_dump(mode="json") if incident is not None else None


class DecisionRequest(BaseModel):
    action: Literal["approve", "modify", "reject"]
    reason: str | None = None
    officer_id: str


class DecisionResponse(BaseModel):
    incident_id: str
    action: Literal["approve", "modify", "reject"]
    reason: str | None
    officer_id: str
    ticket: None = None


class ExplanationResponse(BaseModel):
    summary: str
    citation: str
    uncertainty: Literal["low", "medium", "high"]
    escalate_if: str
    deescalate_if: str


def _with_sop_citation(incident: dict) -> dict:
    # The legacy test mock predates B1's unavailable_sources field and has no live SOP-backed query data.
    if "unavailable_sources" not in incident:
        return {**incident, "sop_citation": SOP_CITATION, "sop": None}

    evidence_text = " ".join(
        item["text"].strip()
        for item in incident.get("evidence", [])
        if isinstance(item.get("text"), str) and item["text"].strip()
    )
    query_text = evidence_text or incident.get("correlation_reason", "")
    citation = SOP_CITATION
    sop = None

    if query_text:
        try:
            result = retrieve_sop(query_text)
            match = result.get("match") if isinstance(result, dict) else None
            score = result.get("score") if isinstance(result, dict) else None
            if (
                isinstance(match, dict)
                and isinstance(match.get("id"), str)
                and match["id"]
                and isinstance(score, (int, float))
                and score >= THRESHOLD
            ):
                citation = match["id"]
                sop = {
                    "title": match.get("title"),
                    "text": match.get("text"),
                    "score": score,
                }
        except Exception:
            LOGGER.exception("SOP retrieval failed; requiring manual review")

    return {**incident, "sop_citation": citation, "sop": sop}


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


@router.get(
    "/incidents/{incident_id}/explanation",
    response_model=ExplanationResponse,
)
def get_incident_explanation(incident_id: str) -> dict:
    # The warm LLM call takes 8-14 seconds; the UI should fetch this separately from the incident.
    incident = get_incident(incident_id)
    if incident is None:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found",
        )
    citation = _with_sop_citation(incident)["sop_citation"]
    return generate_explanation(incident, citation)


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

    outcome = "decision_recorded"
    if decision.action in {"approve", "modify"}:
        outcome = audit_log.append_decision_event(
            _decision_payload(incident_id, decision, "decision_recorded"),
            reserves_incident=True,
        )
        if outcome == "already_decided":
            raise HTTPException(
                status_code=409,
                detail="Incident already has a recorded decision",
            )
    else:
        _record_decision(incident_id, decision, outcome)

    return DecisionResponse(
        incident_id=incident_id,
        action=decision.action,
        reason=decision.reason,
        officer_id=decision.officer_id,
    )
