from __future__ import annotations

import json

from app.core.config import PROJECT_ROOT
from app.routers.niches import _slugify
from app.routers.scripts import _interpolate_template
from app.schemas.lead_dto import (
    LeadUpdateRequest,
    NicheCreateRequest,
    PitchScriptCreateRequest,
    SystemNoteCreateRequest,
)
from app.services.ingestion import parse_and_filter_csv_rows
from app.verticals import (
    is_blocked_business_name,
    load_vertical_rules,
    resolve_vertical_slug,
)


def test_vertical_resolution_and_blocked_terms() -> None:
    assert resolve_vertical_slug("Advogado Trabalhista") == "advocacia"
    assert resolve_vertical_slug("Dentista Odontologia") == "odonto"
    assert resolve_vertical_slug("Imobiliária") == "imobiliario"
    assert resolve_vertical_slug("Barbearia") == "_shared"

    adv_rules = load_vertical_rules("Advogado")
    blocked = adv_rules["blocked_terms_in_name"]
    assert is_blocked_business_name("Subseção OAB Uberlândia", blocked) is True
    assert is_blocked_business_name("Defensoria Pública de MG", blocked) is True
    assert is_blocked_business_name("Silva & Costa Advogados", blocked) is False


def test_csv_row_parsing_filters_blocked_and_deduplicates() -> None:
    rows = [
        {
            "cid": "place_1",
            "title": "OAB Subseção Centro",
            "category": "Advogado",
            "address": "Av. Rondon Pacheco, 100",
            "phone": "(34) 3232-1111",
            "website": "",
            "review_rating": "4.8",
            "review_count": "50",
            "owner": "true",
        },
        {
            "cid": "place_2",
            "title": "Dr. João Silva Advocacia LTDA",
            "category": "Advogado",
            "address": "Rua Machado de Assis, 200",
            "phone": "(34) 99876-5432",
            "website": "https://linktr.ee/joaosilvaadv",
            "review_rating": "4.9",
            "review_count": "28",
            "owner": "true",
        },
        {
            "cid": "place_2",
            "title": "Dr. João Silva Advocacia LTDA Duplicado",
            "category": "Advogado",
            "address": "Rua Machado de Assis, 200",
            "phone": "(34) 99876-5432",
            "website": "https://linktr.ee/joaosilvaadv",
            "review_rating": "4.9",
            "review_count": "28",
            "owner": "true",
        },
    ]

    parsed, _ = parse_and_filter_csv_rows(rows, "Advogado", "Uberlândia", "Centro")
    assert len(parsed) == 1
    assert parsed[0]["place_id"] == "place_2"
    assert parsed[0]["name"] == "Dr. João Silva Advocacia LTDA"


def test_script_interpolation_and_zero_reviews_fallback() -> None:
    template = (
        "Olá, equipe do {name}! Vi que vocês têm {reviews_count} avaliações "
        "excelentes (nota {rating}) em {city}."
    )
    msg_normal = _interpolate_template(
        template,
        clean_name="Dr. João Silva Advocacia",
        city="Uberlândia",
        category="Advogado",
        rating=4.9,
        reviews_count=32,
    )
    assert "Dr. João Silva Advocacia" in msg_normal
    assert "32 avaliações" in msg_normal

    msg_zero = _interpolate_template(
        template,
        clean_name="Dr. João Silva Advocacia",
        city="Uberlândia",
        category="Advogado",
        rating=5.0,
        reviews_count=0,
    )
    assert "0 avaliações" not in msg_zero
    assert "presença destacada" in msg_zero

    # Teste de precificação dinâmica e eliminação de preços estáticos hardcoded
    template_price = "Site Vitrine One-Page (R$ 350 base ou R$ 500 completo / ticket {price})."
    msg_dynamic_price = _interpolate_template(
        template_price,
        clean_name="Dra. Clara",
        city="Uberlândia",
        category="Advogada",
        rating=5.0,
        reviews_count=10,
        price=450,
    )
    assert "R$ 450" in msg_dynamic_price
    assert "R$ 600" in msg_dynamic_price
    assert "R$ 350" not in msg_dynamic_price
    assert "R$ 500" not in msg_dynamic_price


def test_vercel_advocacia_base_structure() -> None:
    base_dir = PROJECT_ROOT / "templates" / "vercel-advocacia" / "base"
    config_file = base_dir / "site.config.json"
    index_file = base_dir / "index.html"
    privacy_file = base_dir / "privacidade.html"
    vercel_file = base_dir / "vercel.json"
    guidelines_file = base_dir / "AI_GUIDELINES.md"
    monogram_file = base_dir / "assets" / "monograma.svg"
    clientes_dir = PROJECT_ROOT / "templates" / "vercel-advocacia" / "clientes"

    assert config_file.exists()
    assert index_file.exists()
    assert privacy_file.exists()
    assert vercel_file.exists()
    assert guidelines_file.exists()
    assert monogram_file.exists()
    assert clientes_dir.is_dir()

    config = json.loads(config_file.read_text(encoding="utf-8"))
    for key in ("business", "visuals", "metrics", "services", "testimonials", "faq", "compliance"):
        assert key in config

    assert "theme_preset" in config["visuals"]
    assert "use_profile_photo" in config["visuals"]
    assert "monogram_initials" in config["visuals"]

    html = index_file.read_text(encoding="utf-8")
    for identifier in (
        "hero-photo-wrapper",
        "hero-monogram-wrapper",
        "testimonials-grid",
        "testimonials-fallback-banner",
        "services-grid",
        "faq-container",
        "floating-whatsapp",
    ):
        assert identifier in html


def test_v2_schemas_and_niche_slugify() -> None:
    assert _slugify("Corretor de Imóveis") == "corretor-de-imoveis"
    assert _slugify("  Advogado Trabalhista  ") == "advogado-trabalhista"

    upd = LeadUpdateRequest(
        website_status="IMPROVISADO",
        rating=4.9,
        reviews_count=42,
        notes="Confirmado Linktree via DM",
    )
    assert upd.website_status == "IMPROVISADO"
    assert "website_status" in upd.model_fields_set

    niche = NicheCreateRequest(name="Fisioterapeuta")
    assert niche.name == "Fisioterapeuta"

    note = SystemNoteCreateRequest(
        title="Testar template odonto",
        content="Adaptar paleta esmeralda",
        tag="IDEIA",
    )
    assert note.tag == "IDEIA"

    script = PitchScriptCreateRequest(
        category="Advogado",
        website_condition="IMPROVISADO",
        title="Abordagem Linktree",
        message_template="Olá {name}",
        upsell_focus="GMB",
    )
    assert script.upsell_focus == "GMB"
