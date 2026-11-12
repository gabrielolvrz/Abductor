from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.routers import leads, niches, notes, scripts, searches

logger = logging.getLogger(__name__)

STARTUP_SCHEMA_SYNC_SQL = text(
    """
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value INTEGER NOT NULL DEFAULT 350;
    ALTER TABLE pitch_scripts ADD COLUMN IF NOT EXISTS script_type VARCHAR(30) NOT NULL DEFAULT 'PITCH';
    ALTER TABLE pitch_scripts ADD COLUMN IF NOT EXISTS situation TEXT;
    """
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Garante colunas de evolução de schema (deal_value, script_type, situation) de forma idempotente."""
    try:
        async with AsyncSessionLocal() as session:
            for statement in STARTUP_SCHEMA_SYNC_SQL.text.strip().split(";"):
                stmt_str = statement.strip()
                if stmt_str:
                    await session.execute(text(stmt_str))
            await session.commit()
    except (SQLAlchemyError, OSError) as exc:
        logger.debug("Schema sync ignorado no boot: %s", exc)
    yield


app = FastAPI(
    title="Abductor Core API",
    description="Plataforma local de inteligência de prospecção B2B e Sites Vitrine Turnkey",
    version="2.0.0",
    lifespan=lifespan,
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
