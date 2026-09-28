from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class Evidence(BaseModel):
    id: str
    kind: Literal["report", "sensor"]
    category: str
    source_type: Literal[
        "student",
        "guard",
        "warden",
        "smoke_sensor",
        "temperature_sensor",
    ]
    zone_id: str
    occurred_at: datetime
    state: Literal["positive", "normal", "unavailable", "contradictory"]
    text: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    synthetic: bool = False
