from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import leads, niches, notes, scripts, searches

app = FastAPI(
    title="Abductor Core API",
    description="Plataforma local de inteligência de prospecção B2B e Sites Vitrine Turnkey",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(searches.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(scripts.router, prefix="/api")
app.include_router(niches.router, prefix="/api")
app.include_router(notes.router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Endpoint rápido de checagem de saúde da API."""
    return {"status": "ok", "service": "abductor-backend"}
