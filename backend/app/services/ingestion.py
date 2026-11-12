"""Pipeline de ingestão, enriquecimento e Upsert Preservativo de Leads (ingestion.py).

Conforme especificado em docs/03 - SDD (Seção 6) e docs/04 - DATA (Seção 5):
1. Filtra registros contendo termos institucionais bloqueados (blocked_terms_in_name).
2. Preserva leads.name íntegro exatamente como extraído do Google Maps (para Google Dork).
3. Sanitiza telefones com phonenumbers (região BR).
4. Valida URLs assincronamente em lote com httpx (stream=True, semáforo de 30, anti-redirect).
5. Calcula Lead Score com Hard Gate, penalidade de incontactabilidade e clamping [0, 100].
6. Executa Upsert Preservativo na tabela leads (preservando pipeline_status, notes e telefones manuais)
   e vincula na tabela associativa search_leads.
7. Recalcula searches.total_leads via COUNT(*).
"""

import json
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.sanitizer import sanitize_phone
from app.engines.scorer import calculate_lead_score
from app.engines.validator import validate_leads_urls
from app.verticals import is_blocked_business_name, load_vertical_rules

UPSERT_LEAD_SQL = text(
    """
    INSERT INTO leads (
        place_id, name, category, address, neighborhood, city,
        phone_raw, phone_sanitized, phone_type, whatsapp_url,
        google_maps_url, website_url, website_status, website_http_code,
        rating, reviews_count, is_claimed, opening_hours, extracted_reviews,
        score, score_breakdown,
        pipeline_status, notes, last_checked_at
    ) VALUES (
        :place_id, :name, :category, :address, :neighborhood, :city,
        :phone_raw, :phone_sanitized, :phone_type, :whatsapp_url,
        :google_maps_url, :website_url, :website_status, :website_http_code,
        :rating, :reviews_count, :is_claimed, :opening_hours, CAST(:extracted_reviews AS jsonb),
        :score, CAST(:score_breakdown AS jsonb),
        'NOVO', NULL, NOW()
    )
    ON CONFLICT (place_id) DO UPDATE SET
        rating = CASE WHEN leads.is_manually_edited THEN leads.rating ELSE EXCLUDED.rating END,
        reviews_count = CASE WHEN leads.is_manually_edited THEN leads.reviews_count ELSE EXCLUDED.reviews_count END,
        website_url = CASE WHEN leads.is_manually_edited THEN leads.website_url ELSE EXCLUDED.website_url END,
        google_maps_url = COALESCE(NULLIF(leads.google_maps_url, ''), EXCLUDED.google_maps_url),
        is_claimed = leads.is_claimed OR EXCLUDED.is_claimed,
        opening_hours = COALESCE(NULLIF(EXCLUDED.opening_hours, ''), leads.opening_hours),
        extracted_reviews = CASE
            WHEN jsonb_array_length(EXCLUDED.extracted_reviews) > 0 THEN EXCLUDED.extracted_reviews
            ELSE leads.extracted_reviews
        END,
        phone_raw = COALESCE(NULLIF(leads.phone_raw, ''), EXCLUDED.phone_raw),
        phone_sanitized = COALESCE(NULLIF(leads.phone_sanitized, ''), EXCLUDED.phone_sanitized),
        phone_type = CASE
            WHEN NULLIF(leads.phone_sanitized, '') IS NULL THEN EXCLUDED.phone_type
            ELSE leads.phone_type
        END,
        whatsapp_url = COALESCE(NULLIF(leads.whatsapp_url, ''), EXCLUDED.whatsapp_url),
        website_status = CASE WHEN leads.is_manually_edited THEN leads.website_status ELSE EXCLUDED.website_status END,
        website_http_code = CASE WHEN leads.is_manually_edited THEN leads.website_http_code ELSE EXCLUDED.website_http_code END,
        score = CASE WHEN leads.is_manually_edited THEN leads.score ELSE EXCLUDED.score END,
        score_breakdown = CASE WHEN leads.is_manually_edited THEN leads.score_breakdown ELSE EXCLUDED.score_breakdown END,
        last_checked_at = NOW()
    RETURNING id, phone_type, is_manually_edited;
    """
)

LINK_SEARCH_LEAD_SQL = text(
    """
    INSERT INTO search_leads (search_id, lead_id, found_at)
    VALUES (:search_id, :lead_id, NOW())
    ON CONFLICT (search_id, lead_id) DO NOTHING;
    """
)

UPDATE_SEARCH_TOTAL_SQL = text(
    """
    UPDATE searches
    SET total_leads = (
        SELECT COUNT(*) FROM search_leads WHERE search_id = :search_id
    )
    WHERE id = :search_id
    RETURNING total_leads;
    """
)

UPDATE_PROGRESS_PHASE_SQL = text(
    """
    UPDATE searches
    SET progress_phase = :phase
    WHERE id = :search_id;
    """
)


def _parse_int(value: str | int | None) -> int:
    if value is None:
        return 0
    try:
        cleaned = str(value).strip().split(".")[0]
        return max(0, int(cleaned))
    except (ValueError, TypeError):
        return 0


def _parse_rating(value: str | float | None) -> float:
    if value is None:
        return 0.0
    try:
        cleaned = str(value).strip().replace(",", ".")
        return round(max(0.0, min(5.0, float(cleaned))), 1)
    except (ValueError, TypeError):
        return 0.0


def _parse_claimed(owner_field: str | None) -> bool:
    if not owner_field:
        return False
    cleaned = str(owner_field).strip()
    return bool(cleaned and cleaned.lower() not in ("false", "0", "none", "null", "{}"))


def format_open_hours(raw_open_hours: str | None) -> str | None:
    """Converte a coluna open_hours (JSON do gosom ou string) em texto comercial legível."""
    if not raw_open_hours:
        return None
    cleaned = str(raw_open_hours).strip()
    if not cleaned or cleaned in ("{}", "null", "None", "[]"):
        return None

    if not cleaned.startswith("{"):
        return cleaned

    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict) or not parsed:
            return None
    except (ValueError, TypeError):
        return cleaned

    norm_map: dict[str, str] = {}
    for k, v in parsed.items():
        key_lower = str(k).strip().lower()
        if isinstance(v, list):
            intervals = [str(item).strip() for item in v if str(item).strip()]
            val_str = " e ".join(intervals)
        else:
            val_str = str(v).strip()
        if val_str:
            norm_map[key_lower] = val_str

    if not norm_map:
        return None

    def _get_day(keys: tuple[str, ...]) -> str:
        for k in keys:
            if k in norm_map:
                return norm_map[k]
        return ""

    mon = _get_day(("segunda-feira", "segunda", "monday"))
    tue = _get_day(("terça-feira", "terca-feira", "terça", "terca", "tuesday"))
    wed = _get_day(("quarta-feira", "quarta", "wednesday"))
    thu = _get_day(("quinta-feira", "quinta", "thursday"))
    fri = _get_day(("sexta-feira", "sexta", "friday"))
    sat = _get_day(("sábado", "sabado", "saturday"))
    sun = _get_day(("domingo", "sunday"))

    weekdays = [d for d in (mon, tue, wed, thu, fri) if d]
    parts: list[str] = []

    if len(weekdays) == 5 and len(set(weekdays)) == 1 and weekdays[0].lower() != "fechado":
        parts.append(f"Segunda a Sexta das {weekdays[0]}")
    else:
        day_labels = [
            ("Seg", mon),
            ("Ter", tue),
            ("Qua", wed),
            ("Qui", thu),
            ("Sex", fri),
        ]
        active_days = [
            f"{lbl}: {val}"
            for lbl, val in day_labels
            if val and val.lower() != "fechado"
        ]
        if active_days:
            parts.append(" • ".join(active_days))

    if sat and sat.lower() != "fechado":
        parts.append(f"Sábados das {sat}")
    if sun and sun.lower() != "fechado":
        parts.append(f"Domingos das {sun}")

    if not parts:
        return None

    return " • ".join(parts)


def extract_user_reviews(
    raw_user_reviews: str | None, max_reviews: int = 5
) -> list[dict[str, Any]]:
    """Processa a coluna user_reviews do CSV do gosom e extrai até 5 avaliações reais com texto e autor."""
    if not raw_user_reviews:
        return []
    cleaned = str(raw_user_reviews).strip()
    if not cleaned or cleaned in ("[]", "null", "None", "{}"):
        return []

    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            return []
    except (ValueError, TypeError):
        return []

    extracted: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for item in parsed:
        if not isinstance(item, dict):
            continue
        author = str(
            item.get("Name") or item.get("author") or item.get("name") or ""
        ).strip()
        text_val = str(
            item.get("Description")
            or item.get("text_original")
            or item.get("text")
            or ""
        ).strip()

        if not author or not text_val:
            continue

        raw_rating = (
            item.get("Rating")
            or item.get("rating_float")
            or item.get("stars")
            or 5
        )
        try:
            stars = max(1, min(5, round(float(raw_rating))))
        except (ValueError, TypeError):
            stars = 5

        dedup_key = (author.lower(), text_val.lower())
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        extracted.append(
            {
                "author": author,
                "text": text_val,
                "stars": stars,
            }
        )

    five_star = [r for r in extracted if r["stars"] >= 5]
    if five_star:
        return five_star[:max_reviews]
    extracted.sort(key=lambda r: int(r["stars"]), reverse=True)
    return extracted[:max_reviews]


def parse_and_filter_csv_rows(
    csv_rows: list[dict[str, str]],
    search_category: str,
    search_city: str,
    search_neighborhood: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Converte linhas brutas do CSV do gosom, filtrando termos institucionais bloqueados."""
    rules = load_vertical_rules(search_category)
    blocked_terms: list[str] = rules.get("blocked_terms_in_name", [])

    parsed_leads: list[dict[str, Any]] = []
    seen_place_ids: set[str] = set()

    for row in csv_rows:
        raw_name = (row.get("title") or "").strip()
        if not raw_name:
            continue

        # 1. Filtro de termos institucionais (Defensoria, OAB, Tribunal, Fórum, Sindicato)
        if is_blocked_business_name(raw_name, blocked_terms):
            continue

        # 2. Identificador estável (cid como primário, place_id ou data_id como fallback)
        place_id = (
            row.get("cid")
            or row.get("place_id")
            or row.get("data_id")
            or ""
        ).strip()
        if not place_id or place_id in seen_place_ids:
            continue
        seen_place_ids.add(place_id)

        # 3. Sanitização de telefone
        phone_raw = (row.get("phone") or "").strip() or None
        sanitized = sanitize_phone(phone_raw)

        # 4. Extração de métricas públicas, horários (open_hours) e reviews reais (user_reviews)
        reviews_count = _parse_int(row.get("review_count"))
        rating = _parse_rating(row.get("review_rating"))
        is_claimed = _parse_claimed(row.get("owner"))
        opening_hours = format_open_hours(row.get("open_hours"))
        extracted_reviews = extract_user_reviews(row.get("user_reviews"), max_reviews=5)

        lead_dict: dict[str, Any] = {
            "place_id": place_id,
            "name": raw_name,  # Preservado íntegro no banco para Google Dork
            "category": (row.get("category") or search_category).strip(),
            "address": (row.get("address") or "").strip() or None,
            "neighborhood": search_neighborhood.strip(),
            "city": search_city.strip(),
            "phone_raw": phone_raw,
            "phone_sanitized": sanitized.phone_sanitized,
            "phone_type": sanitized.phone_type,
            "whatsapp_url": sanitized.whatsapp_url,
            "google_maps_url": (row.get("link") or "").strip() or None,
            "website_url": (row.get("website") or "").strip() or None,
            "rating": rating,
            "reviews_count": reviews_count,
            "is_claimed": is_claimed,
            "opening_hours": opening_hours,
            "extracted_reviews": extracted_reviews,
        }
        parsed_leads.append(lead_dict)

    return parsed_leads, rules


async def set_search_phase(
    session: AsyncSession, search_id: uuid.UUID, phase: str
) -> None:
    """Atualiza progress_phase da busca ativa e faz commit imediato para visibilidade no polling."""
    await session.execute(
        UPDATE_PROGRESS_PHASE_SQL, {"search_id": search_id, "phase": phase}
    )
    await session.commit()


async def ingest_csv_rows_for_search(
    session: AsyncSession,
    search_id: uuid.UUID,
    search_category: str,
    search_city: str,
    search_neighborhood: str,
    csv_rows: list[dict[str, str]],
) -> int:
    """Executa o pipeline completo de ingestão (PARSING -> VALIDATING -> SCORING -> UPSERT)."""
    # Fase 1: PARSING
    await set_search_phase(session, search_id, "PARSING")
    parsed_leads, rules = parse_and_filter_csv_rows(
        csv_rows=csv_rows,
        search_category=search_category,
        search_city=search_city,
        search_neighborhood=search_neighborhood,
    )

    if not parsed_leads:
        result = await session.execute(
            UPDATE_SEARCH_TOTAL_SQL, {"search_id": search_id}
        )
        total = result.scalar() or 0
        await session.commit()
        return int(total)

    # Fase 2: VALIDATING (checagem concorrente de URLs via httpx com anti-redirect)
    await set_search_phase(session, search_id, "VALIDATING")
    validated_leads = await validate_leads_urls(parsed_leads)

    # Fase 3: SCORING (cálculo matemático com Hard Gate e clamping [0, 100])
    await set_search_phase(session, search_id, "SCORING")
    scoring_thresholds = rules.get("scoring")

    for lead in validated_leads:
        score, breakdown = calculate_lead_score(
            website_status=lead["website_status"],
            phone_type=lead["phone_type"],
            reviews_count=lead["reviews_count"],
            rating=lead["rating"],
            is_claimed=lead["is_claimed"],
            category=search_category,
            custom_thresholds=scoring_thresholds,
        )
        lead["score"] = score
        lead["score_breakdown"] = breakdown

    # Fase 4: Upsert Transacional Preservativo e vínculo N:N
    for lead in validated_leads:
        upsert_params = {
            "place_id": lead["place_id"],
            "name": lead["name"],
            "category": lead["category"],
            "address": lead["address"],
            "neighborhood": lead["neighborhood"],
            "city": lead["city"],
            "phone_raw": lead["phone_raw"],
            "phone_sanitized": lead["phone_sanitized"],
            "phone_type": lead["phone_type"],
            "whatsapp_url": lead["whatsapp_url"],
            "google_maps_url": lead["google_maps_url"],
            "website_url": lead["website_url"],
            "website_status": lead["website_status"],
            "website_http_code": lead["website_http_code"],
            "rating": Decimal(str(lead["rating"])),
            "reviews_count": lead["reviews_count"],
            "is_claimed": lead["is_claimed"],
            "opening_hours": lead.get("opening_hours"),
            "extracted_reviews": json.dumps(lead.get("extracted_reviews") or []),
            "score": lead["score"],
            "score_breakdown": json.dumps(lead["score_breakdown"]),
        }
        res = await session.execute(UPSERT_LEAD_SQL, upsert_params)
        row_ret = res.one()
        lead_id = row_ret[0]
        actual_phone_type = str(row_ret[1])
        is_manually_edited = bool(row_ret[2])

        # Se o banco preservou um telefone editado manualmente diferente do extraído no CSV
        # e o lead não está bloqueado por override completo (is_manually_edited),
        # recalcula o score respeitando o phone_type preservado
        if not is_manually_edited and actual_phone_type != lead["phone_type"]:
            adj_score, adj_breakdown = calculate_lead_score(
                website_status=lead["website_status"],
                phone_type=actual_phone_type,
                reviews_count=lead["reviews_count"],
                rating=lead["rating"],
                is_claimed=lead["is_claimed"],
                category=search_category,
                custom_thresholds=scoring_thresholds,
            )
            await session.execute(
                text(
                    "UPDATE leads SET score = :score, score_breakdown = CAST(:breakdown AS jsonb) WHERE id = :id"
                ),
                {
                    "id": lead_id,
                    "score": adj_score,
                    "breakdown": json.dumps(adj_breakdown),
                },
            )

        await session.execute(
            LINK_SEARCH_LEAD_SQL,
            {"search_id": search_id, "lead_id": lead_id},
        )

    # Recalcular total_leads da busca
    total_res = await session.execute(
        UPDATE_SEARCH_TOTAL_SQL, {"search_id": search_id}
    )
    total_leads = int(total_res.scalar() or 0)
    await session.commit()

    return total_leads
