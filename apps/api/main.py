from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

from apps.api.reasoning.explain import warm_up_ollama
from apps.api.routes.audit import router as audit_router
from apps.api.routes.incidents import list_incidents, router as incidents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    incidents = list_incidents()
    warm_up_ollama(incidents[0] if incidents else None)
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(audit_router)
app.include_router(incidents_router)
