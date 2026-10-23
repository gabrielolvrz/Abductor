"""Testes unitários exaustivos para o motor de Lead Scoring (scorer.py)."""

from app.engines.scorer import calculate_lead_score


def test_hard_gate_for_active_website():
    # Mesmo com reputação perfeita, celular e ficha verificada, site ATIVO força Score = 0
    score, breakdown = calculate_lead_score(
        website_status="ATIVO",
        phone_type="MOBILE",
        reviews_count=100,
        rating=5.0,
        is_claimed=True,
        category="Advogado",
    )
    assert score == 0
    assert breakdown["hard_gate_triggered"] is True
    assert breakdown["final_score"] == 0
    assert breakdown["website_status"] == "ATIVO"


def test_perfect_score_maximum_100():
    # 30 (IMPROVISADO) + 20 (MOBILE) + 25 (Reviews >= 15 no G1) + 15 (Rating 4.9) + 10 (Ficha) = 100
    score, breakdown = calculate_lead_score(
        website_status="IMPROVISADO",
        phone_type="MOBILE",
        reviews_count=45,
        rating=4.9,
        is_claimed=True,
        category="Advogado Trabalhista",
    )
    assert score == 100
    assert breakdown["website_points"] == 30
    assert breakdown["phone_points"] == 20
    assert breakdown["reviews_points"] == 25
    assert breakdown["rating_points"] == 15
    assert breakdown["claimed_points"] == 10
    assert breakdown["hard_gate_triggered"] is False


def test_broken_website_and_landline():
    # 25 (QUEBRADO) + 0 (LANDLINE) + 25 (Reviews) + 15 (Rating 4.8) + 10 (Ficha) = 75
    score, breakdown = calculate_lead_score(
        website_status="QUEBRADO",
        phone_type="LANDLINE",
        reviews_count=20,
        rating=4.8,
        is_claimed=True,
        category="Dentista",
    )
    assert score == 75
    assert breakdown["website_points"] == 25
    assert breakdown["phone_points"] == 0


def test_no_site_and_uncontactable_penalty():
    # 15 (SEM_SITE) - 30 (NONE) + 15 (Reviews 8 no G1) + 15 (Rating 4.7) + 0 (Ficha) = 15
    score, breakdown = calculate_lead_score(
        website_status="SEM_SITE",
        phone_type="NONE",
        reviews_count=8,
        rating=4.7,
        is_claimed=False,
        category="Arquiteto",
    )
    assert score == 15
    assert breakdown["website_points"] == 15
    assert breakdown["phone_points"] == -30


def test_clamping_floor_at_zero():
    # Se a soma for negativa: 15 (SEM_SITE) - 30 (INVALID) - 10 (Rating 3.2) = -25 -> Clamp em 0
    score, breakdown = calculate_lead_score(
        website_status="SEM_SITE",
        phone_type="INVALID",
        reviews_count=10,
        rating=3.2,
        is_claimed=False,
        category="Advogado",
    )
    assert score == 0
    assert breakdown["raw_score"] == -10  # 15 - 30 + 15 - 10 = -10
    assert breakdown["final_score"] == 0


def test_niche_group_1_vs_group_2():
    # 20 reviews para Grupo 1 (Advogado) ganha +25 pts
    _score_g1, b_g1 = calculate_lead_score(
        website_status="SEM_SITE",
        phone_type="MOBILE",
        reviews_count=20,
        rating=4.5,
        category="Advogado",
    )
    assert b_g1["niche_group"] == 1
    assert b_g1["reviews_points"] == 25

    # 20 reviews para Grupo 2 (Barbearia) ganha +15 pts (precisa de 40 para +25)
    _score_g2, b_g2 = calculate_lead_score(
        website_status="SEM_SITE",
        phone_type="MOBILE",
        reviews_count=20,
        rating=4.5,
        category="Barbearia",
    )
    assert b_g2["niche_group"] == 2
    assert b_g2["reviews_points"] == 15


def test_zero_reviews_neutral_rating():
    # Lead novo com 0 avaliações não perde pontos de rating
    score, breakdown = calculate_lead_score(
        website_status="IMPROVISADO",
        phone_type="MOBILE",
        reviews_count=0,
        rating=0.0,
        is_claimed=False,
        category="Dentista",
    )
    # 30 (IMPROVISADO) + 20 (MOBILE) + 0 (Reviews) + 0 (Rating neutro) + 0 (Ficha) = 50
    assert score == 50
    assert breakdown["reviews_points"] == 0
    assert breakdown["rating_points"] == 0


def test_custom_thresholds_override():
    # Thresholds customizados passados via dicionário
    custom = {
        "reviews_threshold_high": 10,
        "reviews_points_high": 25,
        "reviews_threshold_mid": 3,
        "reviews_points_mid": 10,
    }
    _score, breakdown = calculate_lead_score(
        website_status="SEM_SITE",
        phone_type="MOBILE",
        reviews_count=12,
        rating=4.6,
        custom_thresholds=custom,
    )
    assert breakdown["reviews_points"] == 25
