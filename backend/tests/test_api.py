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
from app.services.ingestion import (
    extract_user_reviews,
    format_open_hours,
    parse_and_filter_csv_rows,
)
from app.verticals import (
    is_blocked_business_name,
    load_vertical_rules,
    resolve_vertical_slug,
)


def test_vertical_resolution_and_blocked_terms() -> None:
    assert resolve_vertical_slug("Advogado Trabalhista") == "advocacia"
    assert resolve_vertical_slug("Dentista Odontologia") == "odonto"
    assert resolve_vertical_slug("Imobiliária") == "imobiliario"
    assert resolve_vertical_slug("Pet Shop") == "petshop"
    assert resolve_vertical_slug("Banho e Tosa") == "petshop"
    assert resolve_vertical_slug("Clínica Veterinária") == "petshop"
    assert resolve_vertical_slug("Barbearia") == "_shared"

    adv_rules = load_vertical_rules("Advogado")
    blocked = adv_rules["blocked_terms_in_name"]
    assert is_blocked_business_name("Subseção OAB Uberlândia", blocked) is True
    assert is_blocked_business_name("Defensoria Pública de MG", blocked) is True
    assert is_blocked_business_name("Silva & Costa Advogados", blocked) is False

    pet_rules = load_vertical_rules("Pet Shop & Veterinária")
    assert pet_rules["slug"] == "petshop"
    assert pet_rules["scoring"]["reviews_threshold_high"] == 40
    assert pet_rules["scoring"]["reviews_threshold_mid"] == 15
    pet_blocked = pet_rules["blocked_terms_in_name"]
    assert is_blocked_business_name("Centro de Controle de Zoonoses", pet_blocked) is True
    assert is_blocked_business_name("ONG Amigos dos Animais", pet_blocked) is True
    assert is_blocked_business_name("Villa Pet Center & Veterinária", pet_blocked) is False


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


def test_open_hours_and_user_reviews_extraction() -> None:
    raw_hours = json.dumps(
        {
            "domingo": ["Fechado"],
            "segunda-feira": ["08:00–18:00"],
            "terça-feira": ["08:00–18:00"],
            "quarta-feira": ["08:00–18:00"],
            "quinta-feira": ["08:00–18:00"],
            "sexta-feira": ["08:00–18:00"],
            "sábado": ["08:00–13:00"],
        }
    )
    formatted_hours = format_open_hours(raw_hours)
    assert formatted_hours is not None
    assert "Segunda a Sexta das 08:00–18:00" in formatted_hours
    assert "Sábados das 08:00–13:00" in formatted_hours

    raw_reviews = json.dumps(
        [
            {
                "Name": "Giovana Anjos",
                "Rating": 5,
                "Description": "Ótimo atendimento sempre no banho e tosa.",
            },
            {
                "Name": "Sem Texto",
                "Rating": 5,
                "Description": "   ",
            },
            {
                "Name": "Rubens Junior",
                "Rating": 5,
                "Description": "Excelentes profissionais veterinários.",
            },
        ]
    )
    reviews = extract_user_reviews(raw_reviews, max_reviews=5)
    assert len(reviews) == 2
    assert reviews[0] == {
        "author": "Giovana Anjos",
        "text": "Ótimo atendimento sempre no banho e tosa.",
        "stars": 5,
    }
    assert reviews[1]["author"] == "Rubens Junior"

    pet_rows = [
        {
            "cid": "pet_place_1",
            "title": "Centro Oeste Pet Store",
            "category": "Pet Shop",
            "address": "Av. Brasil, 500",
            "phone": "(34) 99988-7766",
            "website": "",
            "review_rating": "4.9",
            "review_count": "65",
            "owner": "true",
            "open_hours": raw_hours,
            "user_reviews": raw_reviews,
        }
    ]
    parsed_pet, _ = parse_and_filter_csv_rows(
        pet_rows, "Pet Shop", "Uberlândia", "Brasil"
    )
    assert len(parsed_pet) == 1
    assert parsed_pet[0]["opening_hours"] == formatted_hours
    assert len(parsed_pet[0]["extracted_reviews"]) == 2


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
    assert config["visuals"]["photo_url"] == "./assets/foto-advogado.jpg"
    assert config["visuals"]["office_image"] == "./assets/escritorio-fachada.jpg"
    assert config["visuals"]["logo_url"] == "./assets/logo-escritorio.png"
    assert "experience_years" in config["metrics"]
    assert "cases_handled" in config["metrics"]
    assert isinstance(config["testimonials"], list) and len(config["testimonials"]) >= 4
    for rev in config["testimonials"]:
        assert rev["stars"] == 5

    html = index_file.read_text(encoding="utf-8")
    for identifier in (
        "fixed top-0 left-0 w-full z-50",
        "pt-16 sm:pt-20",
        "hero-photo-wrapper",
        "hero-monogram-wrapper",
        "testimonials-marquee-wrapper",
        "testimonials-grid",
        "testimonials-fallback-banner",
        "services-grid",
        "faq-container",
        "floating-whatsapp",
        "mobile-menu-drawer",
        "mobile-menu-toggle",
        "mobile-quick-wa",
        "marquee-scroll",
    ):
        assert identifier in html


def test_vercel_petshop_base_structure() -> None:
    base_dir = PROJECT_ROOT / "templates" / "vercel-petshop" / "base"
    config_file = base_dir / "site.config.json"
    index_file = base_dir / "index.html"
    privacy_file = base_dir / "privacidade.html"
    vercel_file = base_dir / "vercel.json"
    guidelines_file = base_dir / "AI_GUIDELINES.md"
    hero_asset = base_dir / "assets" / "hero-pet.svg"
    clientes_dir = PROJECT_ROOT / "templates" / "vercel-petshop" / "clientes"

    assert config_file.exists()
    assert index_file.exists()
    assert privacy_file.exists()
    assert vercel_file.exists()
    assert guidelines_file.exists()
    assert hero_asset.exists()
    assert clientes_dir.is_dir()

    config = json.loads(config_file.read_text(encoding="utf-8"))
    for key in (
        "business",
        "theme",
        "visuals",
        "metrics",
        "pricing",
        "pillars",
        "trust_badges",
        "testimonials",
        "faq",
        "compliance",
    ):
        assert key in config

    assert "grooming_starting_at" in config["pricing"]
    assert "plans_starting_at" in config["pricing"]
    assert "taxi_dog_fee" in config["pricing"]

    assert isinstance(config["testimonials"], list)
    for rev in config["testimonials"]:
        assert rev["stars"] == 5

    assert "has_taxi_dog" in config["business"]
    assert "has_vet" in config["business"]
    for img_key in (
        "hero_image",
        "service_grooming_image",
        "service_clinic_image",
        "service_shop_image",
        "service_hotel_image",
        "about_image",
    ):
        assert img_key in config["visuals"]

    pillar_ids = [p["id"] for p in config["pillars"]]
    assert "grooming" in pillar_ids
    assert "veterinary" in pillar_ids
    assert "petshop" in pillar_ids
    assert "hotel" in pillar_ids

    html = index_file.read_text(encoding="utf-8")
    for identifier in (
        "fixed top-0 left-0 w-full z-50",
        "pt-16 sm:pt-20",
        "taxi-dog-price-badge",
        "mobile-menu-toggle",
        "mobile-menu-drawer",
        "pillars-dynamic-container",
        "taxi-dog-banner",
        "trust-badges-grid",
        "testimonials-marquee-wrapper",
        "testimonials-grid",
        "testimonials-fallback-banner",
        "faq-container",
        "map-facade",
        "footer-crmv-badge",
        "floating-whatsapp",
        "teal-honey",
        "sage-earth",
        "lavender-mint",
        "navy-sunshine",
        "boutique-dark",
    ):
        assert identifier in html


def test_v2_schemas_and_niche_slugify() -> None:
    assert _slugify("Corretor de Imóveis") == "corretor-de-imoveis"
    assert _slugify("  Advogado Trabalhista  ") == "advogado-trabalhista"

    upd = LeadUpdateRequest(
        website_status="IMPROVISADO",
        rating=4.9,
        reviews_count=42,
        pipeline_status="FECHADO",
        deal_value=600,
        notes="Confirmado Linktree via DM",
    )
    assert upd.website_status == "IMPROVISADO"
    assert upd.pipeline_status == "FECHADO"
    assert upd.deal_value == 600
    assert "website_status" in upd.model_fields_set
    assert "deal_value" in upd.model_fields_set

    niche = NicheCreateRequest(name="Odontologia", slug="odonto")
    assert niche.name == "Odontologia"
    assert niche.slug == "odonto"

    note = SystemNoteCreateRequest(
        title="Testar template odonto",
        content="Adaptar paleta esmeralda",
        tag="IDEIA",
    )
    assert note.tag == "IDEIA"

    script = PitchScriptCreateRequest(
        category="Advogado",
        script_type="OBJECTION",
        website_condition="GERAL",
        title="“Não posso fazer propaganda (OAB)”",
        situation="Advogado receoso com Provimento 205/2021",
        message_template="Olá {name}, seguimos 100% a OAB ({price})",
        upsell_focus="NONE",
    )
    assert script.script_type == "OBJECTION"
    assert script.situation == "Advogado receoso com Provimento 205/2021"
