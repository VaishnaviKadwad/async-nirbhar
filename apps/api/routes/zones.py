from fastapi import APIRouter

from apps.api.correlation.query import zones_status


router = APIRouter()
HERO_ZONE_IDS = [
    "block-c-electrical-room",
    "room-a",
    "room-b",
    "room-c",
]


@router.get("/zones")
def get_zones() -> dict[str, dict]:
    return zones_status(HERO_ZONE_IDS)
