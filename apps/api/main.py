from contextlib import asynccontextmanager
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from apps.api.reasoning.explain import warm_up_ollama
from apps.api.routes.audit import router as audit_router
from apps.api.routes.evidence import router as evidence_router
from apps.api.routes.incidents import list_incidents, router as incidents_router
from apps.api.routes.zones import router as zones_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    incidents = list_incidents()
    warm_up_ollama(incidents[0] if incidents else None)
    yield


app = FastAPI(lifespan=lifespan)
default_cors_origins = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:4173,http://127.0.0.1:4173,"
    "http://localhost:8080,http://127.0.0.1:8080"
)
cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", default_cors_origins).split(",")
    if origin.strip() and origin.strip() != "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)
app.include_router(audit_router)
app.include_router(evidence_router)
app.include_router(incidents_router)
app.include_router(zones_router)
