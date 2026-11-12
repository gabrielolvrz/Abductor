"""Modelo ORM SQLAlchemy 2.0 para a entidade única global de estabelecimentos (leads)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Lead(Base):
    """Representa um estabelecimento ou profissional liberal único por place_id."""

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    place_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone_raw: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone_sanitized: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    phone_type: Mapped[str] = mapped_column(
        String(15), nullable=False, default="UNKNOWN"
    )
    whatsapp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_maps_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="SEM_SITE"
    )
    website_http_code: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=0
    )
    instagram_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[Decimal] = mapped_column(
        Numeric(2, 1), nullable=False, default=Decimal("0.0")
    )
    reviews_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_claimed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    opening_hours: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_reviews: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    pipeline_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="NOVO"
    )
    deal_value: Mapped[int] = mapped_column(Integer, nullable=False, default=350)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_manually: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_manually_edited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    last_status_change_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
