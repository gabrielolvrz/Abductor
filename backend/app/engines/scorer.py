"""Motor matemático de Lead Scoring com Hard Gate e clamping (scorer.py).

Conforme especificado em docs/02 - SRS (Seção 2) e docs/05 - ADR (ADR 008):
- Hard Gate estrito: se website_status == 'ATIVO', o score é fixado em 0 absoluto.
- Penalidade de incontactabilidade: phone_type em ('NONE', 'INVALID') aplica -30 pts.
- Pontuação de Site: IMPROVISADO (+30), QUEBRADO (+25), SEM_SITE (+15), ATIVO (0 via Hard Gate).
- Pontuação de Contato: MOBILE (+20), LANDLINE (0), NONE/INVALID (-30).
- Prova Social (Reviews) calibrada por grupo de nicho:
    - Grupo 1 (Alto Ticket: Advocacia, Odonto, Medicina, Arquitetura, Imobiliárias):
        >= 15 reviews -> +25 pts; 5 a 14 reviews -> +15 pts; < 5 reviews -> 0 pts.
    - Grupo 2 (Serviços Gerais / Frequentes: Estética, Pet Shop, Barbearias, etc.):
        >= 40 reviews -> +25 pts; 15 a 39 reviews -> +15 pts; < 15 reviews -> 0 pts.
- Reputação (Rating):
    - 4.5 a 5.0 -> +15 pts
    - 4.0 a 4.4 -> +5 pts
    - < 4.0 (com reviews > 0) -> -10 pts
    - reviews == 0 ou rating == 0 -> 0 pts (neutro para novos negócios)
- Ficha Reivindicada (is_claimed == True) -> +10 pts
- Clamping obrigatório: score = max(0, min(100, round(score_calculado)))
- Retorna tupla (final_score, score_breakdown) para persistência em JSONB e exibição em tooltip.
"""

from typing import Any

# Categorias mapeadas para o Grupo 1 (Alto Ticket / Decisão Lenta)
GROUP_1_CATEGORIES: set[str] = {
    "advogado",
    "advocacia",
    "direito",
    "juridico",
    "dentista",
    "odontologia",
    "odonto",
    "medico",
    "medicina",
    "clinica medica",
    "psicologo",
    "psicologia",
    "arquiteto",
    "arquitetura",
    "engenheiro",
    "engenharia",
    "corretor",
    "corretor de imoveis",
    "imobiliaria",
    "imoveis",
}


def _determine_niche_group(category: str | None) -> int:
    """Classifica a categoria comercial em Grupo 1 (Alto Ticket) ou Grupo 2 (Geral)."""
    if not category:
        return 2

    cleaned = str(category).strip().casefold()
    for item in GROUP_1_CATEGORIES:
        if item in cleaned:
            return 1

    return 2


def calculate_lead_score(
    website_status: str,
    phone_type: str,
    reviews_count: int = 0,
    rating: float = 0.0,
    is_claimed: bool = False,
    category: str | None = None,
    custom_thresholds: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any]]:
    """Calcula a pontuação matemática do Lead (0 a 100) com Hard Gate e clamping.

    Args:
        website_status: 'SEM_SITE', 'IMPROVISADO', 'QUEBRADO' ou 'ATIVO'.
        phone_type: 'MOBILE', 'LANDLINE', 'INVALID' ou 'NONE'.
        reviews_count: Quantidade total de avaliações no Google Maps.
        rating: Nota média de avaliação (0.0 a 5.0).
        is_claimed: True se a ficha foi reivindicada pelo proprietário.
        category: Nicho comercial para calibração de prova social.
        custom_thresholds: Dicionário opcional vindo de rules.json.

    Returns:
        Tupla (final_score, score_breakdown).
    """
    normalized_status = str(website_status).strip().upper()
    normalized_phone_type = str(phone_type).strip().upper()
    n_reviews = max(0, int(reviews_count or 0))
    n_rating = max(0.0, min(5.0, float(rating or 0.0)))
    claimed = bool(is_claimed)
    niche_group = _determine_niche_group(category)

    # 1. HARD GATE: se o site estiver funcional/ativo, o score é forçado a zero absoluto
    if normalized_status == "ATIVO":
        breakdown = {
            "website_status": "ATIVO",
            "website_points": 0,
            "phone_type": normalized_phone_type,
            "phone_points": 0,
            "reviews_count": n_reviews,
            "reviews_points": 0,
            "rating": n_rating,
            "rating_points": 0,
            "is_claimed": claimed,
            "claimed_points": 0,
            "niche_group": niche_group,
            "hard_gate_triggered": True,
            "raw_score": 0,
            "final_score": 0,
        }
        return 0, breakdown

    # 2. Pontos por Situação do Site
    if normalized_status == "IMPROVISADO":
        website_points = 30
    elif normalized_status == "QUEBRADO":
        website_points = 25
    elif normalized_status == "SEM_SITE":
        website_points = 15
    else:
        website_points = 0

    # 3. Pontos por Canal de Contato
    if normalized_phone_type == "MOBILE":
        phone_points = 20
    elif normalized_phone_type == "LANDLINE":
        phone_points = 0
    else:
        # NONE, INVALID, UNKNOWN recebem penalidade severa
        phone_points = -30

    # 4. Pontos por Volume de Reviews (Prova Social)
    if custom_thresholds:
        high_thresh = custom_thresholds.get("reviews_threshold_high", 15)
        high_pts = custom_thresholds.get("reviews_points_high", 25)
        mid_thresh = custom_thresholds.get("reviews_threshold_mid", 5)
        mid_pts = custom_thresholds.get("reviews_points_mid", 15)
    elif niche_group == 1:
        # Grupo 1 (Alto Ticket: Advocacia, Odonto, Imobiliário)
        high_thresh, high_pts = 15, 25
        mid_thresh, mid_pts = 5, 15
    else:
        # Grupo 2 (Serviços Gerais / Frequentes)
        high_thresh, high_pts = 40, 25
        mid_thresh, mid_pts = 15, 15

    if n_reviews >= high_thresh:
        reviews_points = high_pts
    elif n_reviews >= mid_thresh:
        reviews_points = mid_pts
    else:
        reviews_points = 0

    # 5. Pontos por Reputação (Rating)
    if n_reviews == 0 or n_rating == 0.0:
        # Perfil recém-criado sem reviews não sofre penalidade de nota
        rating_points = 0
    elif n_rating >= 4.5:
        rating_points = 15
    elif n_rating >= 4.0:
        rating_points = 5
    else:
        rating_points = -10

    # 6. Ficha Reivindicada
    claimed_points = 10 if claimed else 0

    # 7. Soma Pura e Clamping [0, 100]
    raw_score = (
        website_points
        + phone_points
        + reviews_points
        + rating_points
        + claimed_points
    )
    final_score = max(0, min(100, round(raw_score)))

    breakdown = {
        "website_status": normalized_status,
        "website_points": website_points,
        "phone_type": normalized_phone_type,
        "phone_points": phone_points,
        "reviews_count": n_reviews,
        "reviews_points": reviews_points,
        "rating": n_rating,
        "rating_points": rating_points,
        "is_claimed": claimed,
        "claimed_points": claimed_points,
        "niche_group": niche_group,
        "hard_gate_triggered": False,
        "raw_score": raw_score,
        "final_score": final_score,
    }

    return final_score, breakdown
