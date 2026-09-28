from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from apps.api.audit.audit_log_stub import append_event
from apps.api.models.evidence import Evidence
from apps.api.storage.evidence_store import store_evidence


router = APIRouter()


@router.post("/evidence", response_model=Evidence, status_code=status.HTTP_201_CREATED)
def create_evidence(payload: dict[str, Any] = Body(...)) -> Evidence:
    evidence_data = dict(payload)
    if "id" not in evidence_data:
        evidence_data["id"] = str(uuid4())

    try:
        evidence = Evidence(**evidence_data)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors(), body=payload) from exc

    stored_evidence = store_evidence(evidence)
    append_event("evidence_received", evidence.dict())
    return stored_evidence
