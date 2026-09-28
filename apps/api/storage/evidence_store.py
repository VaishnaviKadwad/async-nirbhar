import os
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    Float,
    MetaData,
    String,
    Table,
    create_engine,
    insert,
    select,
)

from apps.api.models.evidence import Evidence


# NIRBHAR_DB_PATH is read once at import time; set it before importing the app or this module in tests.
DATABASE_PATH = (
    Path(os.environ["NIRBHAR_DB_PATH"])
    if os.environ.get("NIRBHAR_DB_PATH")
    else Path(__file__).resolve().with_name("evidence.sqlite3")
)
engine = create_engine(f"sqlite:///{DATABASE_PATH.as_posix()}")
metadata = MetaData()

evidence_table = Table(
    "evidence",
    metadata,
    Column("id", String, primary_key=True),
    Column("kind", String, nullable=False),
    Column("category", String, nullable=False),
    Column("source_type", String, nullable=False),
    Column("zone_id", String, nullable=False),
    Column("occurred_at", String, nullable=False),
    Column("state", String, nullable=False),
    Column("text", String, nullable=True),
    Column("value", Float, nullable=True),
    Column("unit", String, nullable=True),
    Column("synthetic", Boolean, nullable=False),
)


def store_evidence(evidence: Evidence) -> Evidence:
    metadata.create_all(engine)
    evidence_data = evidence.model_dump()

    with engine.begin() as connection:
        connection.execute(insert(evidence_table).values(**evidence_data))
        stored_data = connection.execute(
            select(evidence_table).where(evidence_table.c.id == evidence.id)
        ).mappings().one()

    return Evidence(**stored_data)
