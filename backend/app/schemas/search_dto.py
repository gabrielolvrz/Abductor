"""Schemas e DTOs Pydantic para Buscas e Controle de Jobs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lead_dto import LeadResponse


class SearchCreateRequest(BaseModel):
    """Payload de submissão de uma busca geográfica (POST /api/searches)."""

    category: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    neighborhood: str = Field(default="", max_length=100)
    force_sync: bool = False


class SearchStatusResponse(BaseModel):
    """DTO de status e resultado de uma busca (polling e cache-first)."""

    model_config = ConfigDict(from_attributes=True)

    search_id: uuid.UUID
    category: str
    city: str
    neighborhood: str = ""
    job_status: str
    progress_phase: str
    elapsed_seconds: int = 0
    total_leads: int = 0
    last_scraped_at: datetime | None = None
    started_at: datetime | None = None
    created_at: datetime | None = None
    cached: bool = False
    message: str | None = None
    leads: list[LeadResponse] | None = None
