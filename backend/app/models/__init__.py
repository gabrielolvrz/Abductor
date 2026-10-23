"""Exportação dos modelos ORM do Abductor."""

from app.models.lead import Lead
from app.models.search import Niche, PitchScript, Search, SearchLead, SystemNote

__all__ = ["Lead", "Niche", "PitchScript", "Search", "SearchLead", "SystemNote"]
