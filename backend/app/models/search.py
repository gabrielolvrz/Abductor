"""Modelos ORM SQLAlchemy 2.0 para searches, search_leads, pitch_scripts, niches e system_notes."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Search(Base):
    """Histórico de buscas geográficas e controle de jobs do scraper."""

    __tablename__ = "searches"
    __table_args__ = (
        UniqueConstraint("category", "city", "neighborhood", name="uq_searches_query"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    city: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    neighborhood: Mapped[str] = mapped_column(
        CITEXT(), nullable=False, default=""
    )
    gosom_job_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    job_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING"
    )
    progress_phase: Mapped[str] = mapped_column(
        String(30), nullable=False, default="IDLE"
    )
    total_leads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_scraped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SearchLead(Base):
    """Tabela associativa N:N entre buscas (searches) e estabelecimentos (leads)."""

    __tablename__ = "search_leads"

    search_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("searches.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        primary_key=True,
    )
    found_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PitchScript(Base):
    """Roteiros de abordagem comercial contextuais armazenados no PostgreSQL."""

    __tablename__ = "pitch_scripts"
    __table_args__ = (
        UniqueConstraint(
            "category",
            "website_condition",
            "title",
            name="uq_pitch_scripts_category_condition_title",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    website_condition: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    upsell_focus: Mapped[str] = mapped_column(
        String(50), nullable=False, default="NONE"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Niche(Base):
    """Catálogo centralizado de nichos e categorias homologadas."""

    __tablename__ = "niches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(CITEXT(), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SystemNote(Base):
    """Backlog interno de ideias, bugs e lembretes do operador."""

    __tablename__ = "system_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    tag: Mapped[str] = mapped_column(
        String(50), nullable=False, default="IDEIA"
    )
    is_done: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
