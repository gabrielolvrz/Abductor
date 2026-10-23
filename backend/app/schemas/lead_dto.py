"""Schemas e DTOs Pydantic para Leads, Scripts de Abordagem, Nichos e Notas."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PipelineStatus = Literal[
    "NOVO", "CONTATADO", "RESPONDEU", "NEGOCIANDO", "FECHADO", "RECUSADO"
]
WebsiteStatus = Literal["ATIVO", "IMPROVISADO", "QUEBRADO", "SEM_SITE"]
UpsellFocus = Literal["NONE", "GMB", "ADS", "COMBO"]
NoteTag = Literal["IDEIA", "BUG", "LEMBRETE"]


class LeadResponse(BaseModel):
    """DTO completo de um Lead para renderização no cockpit."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    place_id: str
    name: str
    category: str | None = None
    address: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    phone_raw: str | None = None
    phone_sanitized: str | None = None
    phone_type: str = "UNKNOWN"
    whatsapp_url: str | None = None
    google_maps_url: str | None = None
    website_url: str | None = None
    website_status: str = "SEM_SITE"
    website_http_code: int | None = 0
    instagram_url: str | None = None
    linkedin_url: str | None = None
    rating: float = 0.0
    reviews_count: int = 0
    is_claimed: bool = False
    score: int = 0
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    pipeline_status: str = "NOVO"
    notes: str | None = None
    created_manually: bool = False
    is_manually_edited: bool = False
    is_shared_phone: bool = False
    days_in_status: int = 0
    last_status_change_at: datetime | None = None
    found_at: datetime | None = None
    first_seen_at: datetime | None = None
    last_checked_at: datetime | None = None


class LeadUpdateRequest(BaseModel):
    """Payload de edição manual e override de diagnóstico do Lead (PATCH /api/leads/{id})."""

    phone_raw: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    website_status: WebsiteStatus | None = None
    rating: float | None = Field(default=None, ge=0.0, le=5.0)
    reviews_count: int | None = Field(default=None, ge=0)
    notes: str | None = None


class LeadPipelineUpdateRequest(BaseModel):
    """Payload de alteração de status comercial no funil (PATCH /api/leads/{id}/pipeline)."""

    pipeline_status: PipelineStatus


class LeadCreateManualRequest(BaseModel):
    """Payload de cadastro manual avulso de estabelecimento (POST /api/leads)."""

    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    neighborhood: str | None = ""
    address: str | None = None
    phone_raw: str | None = None
    website_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    google_maps_url: str | None = None
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    reviews_count: int = Field(default=0, ge=0)
    is_claimed: bool = False
    notes: str | None = None
    search_id: uuid.UUID | None = None


class PitchScriptResponse(BaseModel):
    """DTO de template de script de abordagem comercial."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    website_condition: str
    title: str
    message_template: str
    upsell_focus: str
    created_at: datetime


class PitchScriptCreateRequest(BaseModel):
    """Payload para criação de um novo template de script."""

    category: str = Field(..., min_length=1, max_length=100)
    website_condition: Literal["SEM_SITE", "IMPROVISADO", "QUEBRADO", "GERAL"]
    title: str = Field(..., min_length=1, max_length=150)
    message_template: str = Field(..., min_length=1)
    upsell_focus: UpsellFocus = "NONE"


class PitchScriptUpdateRequest(BaseModel):
    """Payload para edição de um template de script existente."""

    category: str | None = None
    website_condition: (
        Literal["SEM_SITE", "IMPROVISADO", "QUEBRADO", "GERAL"] | None
    ) = None
    title: str | None = None
    message_template: str | None = None
    upsell_focus: UpsellFocus | None = None


class PitchInterpolateRequest(BaseModel):
    """Payload para interpolação dinâmica de um script para um lead."""

    lead_id: uuid.UUID
    script_id: uuid.UUID | None = None
    custom_template: str | None = None
    price: int | None = Field(
        default=None, description="Preço base customizado em R$ (ex.: 350, 450, 600)"
    )


class PitchInterpolateResponse(BaseModel):
    """Resultado da interpolação de script com nome limpo e link de disparo."""

    lead_id: uuid.UUID
    script_id: uuid.UUID | None = None
    script_title: str
    cleaned_name: str
    interpolated_message: str
    whatsapp_trigger_url: str | None = None
    upsell_focus: str = "NONE"


class NicheResponse(BaseModel):
    """DTO de nicho/categoria homologada."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime


class NicheCreateRequest(BaseModel):
    """Payload para cadastro de novo nicho."""

    name: str = Field(..., min_length=2, max_length=100)


class SystemNoteResponse(BaseModel):
    """DTO de anotação interna / item de backlog."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str | None = None
    tag: str = "IDEIA"
    is_done: bool = False
    created_at: datetime


class SystemNoteCreateRequest(BaseModel):
    """Payload para criação de anotação interna."""

    title: str = Field(..., min_length=1, max_length=255)
    content: str | None = None
    tag: NoteTag = "IDEIA"


class SystemNoteUpdateRequest(BaseModel):
    """Payload para atualização de anotação interna."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None
    tag: NoteTag | None = None
    is_done: bool | None = None
