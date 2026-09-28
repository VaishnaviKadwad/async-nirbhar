from fastapi import APIRouter

from apps.api.correlation.query import zones_status


router = APIRouter()
HERO_ZONE_IDS = [
    "block-c-electrical-room",
    "lab-2",
    "classroom-3",
]


@router.get("/zones")
def get_zones() -> dict[str, dict]:
    return zones_status(HERO_ZONE_IDS)
