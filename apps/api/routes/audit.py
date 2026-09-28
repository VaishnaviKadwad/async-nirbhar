from fastapi import APIRouter

from apps.api.audit.audit_log import get_all_events


router = APIRouter()


@router.get("/audit")
def get_audit_events() -> list[dict]:
    return get_all_events()
