from fastapi import FastAPI

from apps.api.routes.evidence import router as evidence_router


app = FastAPI()
app.include_router(evidence_router)
