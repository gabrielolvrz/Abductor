"""Carregador de regras modulares por vertical comercial (verticals)."""

import json
import re
from pathlib import Path
from typing import Any

from app.core.normalizer import normalize_search_param

VERTICALS_DIR = Path(__file__).resolve().parent

DEFAULT_BLOCKED_TERMS: list[str] = [
    "Defensoria",
    "OAB",
    "Tribunal",
    "Fórum",
    "Sindicato",
]


def resolve_vertical_slug(category: str | None) -> str:
    """Mapeia uma categoria de busca para o slug da vertical homologada."""
    norm = normalize_search_param(category)
    if any(k in norm for k in ("advog", "direito", "juridic")):
        return "advocacia"
    if any(k in norm for k in ("dentist", "odonto", "ortodont", "implante")):
        return "odonto"
    if any(k in norm for k in ("corretor", "imobili", "imoveis", "imovel")):
        return "imobiliario"
    return "_shared"


def load_vertical_rules(category: str | None = None) -> dict[str, Any]:
    """Carrega o dicionário rules.json da vertical correspondente ou o fallback padrão."""
    slug = resolve_vertical_slug(category)
    if slug != "_shared":
        rule_path = VERTICALS_DIR / slug / "rules.json"
        if rule_path.exists():
            return dict(json.loads(rule_path.read_text(encoding="utf-8")))

    default_path = VERTICALS_DIR / "_shared" / "default_rules.json"
    if default_path.exists():
        return dict(json.loads(default_path.read_text(encoding="utf-8")))

    return {
        "slug": "default",
        "blocked_terms_in_name": DEFAULT_BLOCKED_TERMS,
    }


def is_blocked_business_name(
    name: str | None, blocked_terms: list[str] | None = None
) -> bool:
    """Verifica se o nome do estabelecimento contém termos institucionais bloqueados."""
    if not name or not str(name).strip():
        return True

    terms = blocked_terms if blocked_terms is not None else DEFAULT_BLOCKED_TERMS
    norm_name = normalize_search_param(name)

    for term in terms:
        norm_term = normalize_search_param(term)
        if not norm_term:
            continue
        pattern = rf"\b{re.escape(norm_term)}"
        if re.search(pattern, norm_name):
            return True

    return False
