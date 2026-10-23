"""Endpoints HTTP REST do Mini-CRM de Leads e Exportação Turnkey (leads.py)."""

import json
import uuid
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import PROJECT_ROOT
from app.core.database import get_db
from app.engines.cleaner import clean_business_name
from app.engines.sanitizer import sanitize_phone
from app.engines.scorer import calculate_lead_score
from app.engines.validator import check_url
from app.schemas.lead_dto import (
    LeadCreateManualRequest,
    LeadPipelineUpdateRequest,
    LeadResponse,
    LeadUpdateRequest,
)
from app.services.ingestion import LINK_SEARCH_LEAD_SQL, UPDATE_SEARCH_TOTAL_SQL
from app.verticals import load_vertical_rules

router = APIRouter(prefix="/leads", tags=["Leads & Mini-CRM"])
DbSession = Annotated[AsyncSession, Depends(get_db)]

SELECT_SINGLE_LEAD_SQL = text(
    """
    SELECT
        l.id,
        l.place_id,
        l.name,
        l.category,
        l.address,
        l.neighborhood,
        l.city,
        l.phone_raw,
        l.phone_sanitized,
        l.phone_type,
        l.whatsapp_url,
        l.google_maps_url,
        l.website_url,
        l.website_status,
        l.website_http_code,
        l.instagram_url,
        l.linkedin_url,
        l.rating,
        l.reviews_count,
        l.is_claimed,
        l.score,
        l.score_breakdown,
        l.pipeline_status,
        l.notes,
        l.created_manually,
        l.is_manually_edited,
        l.last_status_change_at,
        GREATEST(0, EXTRACT(DAY FROM (NOW() - l.last_status_change_at))::int) AS days_in_status,
        l.first_seen_at,
        l.last_checked_at,
        (
            l.phone_sanitized IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM leads l2
                WHERE l2.phone_sanitized = l.phone_sanitized
                  AND l2.id <> l.id
            )
        ) AS is_shared_phone
    FROM leads l
    WHERE l.id = :lead_id;
    """
)

SELECT_PIPELINE_LEADS_SQL = text(
    """
    SELECT
        l.id,
        l.place_id,
        l.name,
        l.category,
        l.address,
        l.neighborhood,
        l.city,
        l.phone_raw,
        l.phone_sanitized,
        l.phone_type,
        l.whatsapp_url,
        l.google_maps_url,
        l.website_url,
        l.website_status,
        l.website_http_code,
        l.instagram_url,
        l.linkedin_url,
        l.rating,
        l.reviews_count,
        l.is_claimed,
        l.score,
        l.score_breakdown,
        l.pipeline_status,
        l.notes,
        l.created_manually,
        l.is_manually_edited,
        l.last_status_change_at,
        GREATEST(0, EXTRACT(DAY FROM (NOW() - l.last_status_change_at))::int) AS days_in_status,
        l.first_seen_at,
        l.last_checked_at,
        (
            l.phone_sanitized IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM leads l2
                WHERE l2.phone_sanitized = l.phone_sanitized
                  AND l2.id <> l.id
            )
        ) AS is_shared_phone
    FROM leads l
    WHERE l.pipeline_status <> 'NOVO'
    ORDER BY l.last_status_change_at DESC;
    """
)


async def _get_lead_or_404(
    db: AsyncSession, lead_id: uuid.UUID
) -> LeadResponse:
    res = await db.execute(SELECT_SINGLE_LEAD_SQL, {"lead_id": lead_id})
    row = res.mappings().one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {lead_id} não encontrado.",
        )
    row_dict = dict(row)
    row_dict["rating"] = float(row_dict.get("rating") or 0.0)
    return LeadResponse(**row_dict)


@router.get("/pipeline", response_model=list[LeadResponse])
async def get_pipeline_leads(
    db: DbSession,
) -> list[LeadResponse]:
    """Retorna todos os leads com pipeline_status != 'NOVO' ordenados por last_status_change_at DESC."""
    res = await db.execute(SELECT_PIPELINE_LEADS_SQL)
    rows = res.mappings().all()
    leads: list[LeadResponse] = []
    for row in rows:
        row_dict = dict(row)
        row_dict["rating"] = float(row_dict.get("rating") or 0.0)
        leads.append(LeadResponse(**row_dict))
    return leads


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: DbSession,
) -> LeadResponse:
    """Retorna os detalhes completos de um Lead específico."""
    return await _get_lead_or_404(db, lead_id)


@router.patch("/{lead_id}/pipeline", response_model=LeadResponse)
async def update_lead_pipeline(
    lead_id: uuid.UUID,
    payload: LeadPipelineUpdateRequest,
    db: DbSession,
) -> LeadResponse:
    """Atualiza a etapa do funil comercial do Lead e registra last_status_change_at = NOW()."""
    await _get_lead_or_404(db, lead_id)

    await db.execute(
        text(
            """
            UPDATE leads
            SET pipeline_status = :pipeline_status,
                last_status_change_at = NOW()
            WHERE id = :lead_id;
            """
        ),
        {"lead_id": lead_id, "pipeline_status": payload.pipeline_status},
    )
    await db.commit()

    return await _get_lead_or_404(db, lead_id)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead_details(
    lead_id: uuid.UUID,
    payload: LeadUpdateRequest,
    db: DbSession,
) -> LeadResponse:
    """Edição manual e Override de Diagnóstico de Lead (RF15).

    Permite editar website_status, website_url, phone_raw, notes, rating e reviews_count.
    Se dados de site, telefone ou avaliações forem alterados:
    - Marca is_manually_edited = TRUE (protege contra sobrescritas de futuros scrapings).
    - Recalcula imediatamente o score e o score_breakdown via scorer.py.
    - Atualiza last_checked_at = NOW().
    """
    current = await _get_lead_or_404(db, lead_id)
    fields_set = payload.model_fields_set

    phone_raw = current.phone_raw
    phone_sanitized = current.phone_sanitized
    phone_type = current.phone_type
    whatsapp_url = current.whatsapp_url

    website_url = current.website_url
    website_status = current.website_status
    website_http_code = current.website_http_code or 0

    rating = current.rating
    reviews_count = current.reviews_count
    is_manually_edited = current.is_manually_edited

    recalculate_score = False

    if "phone_raw" in fields_set:
        phone_raw = (
            payload.phone_raw.strip()
            if payload.phone_raw and payload.phone_raw.strip()
            else None
        )
        sanitized = sanitize_phone(phone_raw)
        phone_sanitized = sanitized.phone_sanitized
        phone_type = sanitized.phone_type
        whatsapp_url = sanitized.whatsapp_url
        recalculate_score = True
        is_manually_edited = True

    if "website_url" in fields_set:
        website_url = (
            payload.website_url.strip()
            if payload.website_url and payload.website_url.strip()
            else None
        )
        if "website_status" not in fields_set or payload.website_status is None:
            website_status, website_http_code = await check_url(website_url)
        recalculate_score = True
        is_manually_edited = True

    if "website_status" in fields_set and payload.website_status is not None:
        website_status = payload.website_status
        recalculate_score = True
        is_manually_edited = True

    if "rating" in fields_set and payload.rating is not None:
        rating = round(float(payload.rating), 1)
        recalculate_score = True
        is_manually_edited = True

    if "reviews_count" in fields_set and payload.reviews_count is not None:
        reviews_count = int(payload.reviews_count)
        recalculate_score = True
        is_manually_edited = True

    instagram_url = (
        payload.instagram_url
        if "instagram_url" in fields_set
        else current.instagram_url
    )
    linkedin_url = (
        payload.linkedin_url
        if "linkedin_url" in fields_set
        else current.linkedin_url
    )
    notes = payload.notes if "notes" in fields_set else current.notes

    score = current.score
    score_breakdown = current.score_breakdown

    if recalculate_score:
        rules = load_vertical_rules(current.category)
        score, score_breakdown = calculate_lead_score(
            website_status=website_status,
            phone_type=phone_type,
            reviews_count=reviews_count,
            rating=rating,
            is_claimed=current.is_claimed,
            category=current.category,
            custom_thresholds=rules.get("scoring"),
        )

    await db.execute(
        text(
            """
            UPDATE leads
            SET phone_raw = :phone_raw,
                phone_sanitized = :phone_sanitized,
                phone_type = :phone_type,
                whatsapp_url = :whatsapp_url,
                website_url = :website_url,
                website_status = :website_status,
                website_http_code = :website_http_code,
                instagram_url = :instagram_url,
                linkedin_url = :linkedin_url,
                rating = :rating,
                reviews_count = :reviews_count,
                notes = :notes,
                score = :score,
                score_breakdown = CAST(:score_breakdown AS jsonb),
                is_manually_edited = :is_manually_edited,
                last_checked_at = NOW()
            WHERE id = :lead_id;
            """
        ),
        {
            "lead_id": lead_id,
            "phone_raw": phone_raw,
            "phone_sanitized": phone_sanitized,
            "phone_type": phone_type,
            "whatsapp_url": whatsapp_url,
            "website_url": website_url,
            "website_status": website_status,
            "website_http_code": website_http_code,
            "instagram_url": instagram_url,
            "linkedin_url": linkedin_url,
            "rating": Decimal(str(round(rating, 1))),
            "reviews_count": reviews_count,
            "notes": notes,
            "score": score,
            "score_breakdown": json.dumps(score_breakdown),
            "is_manually_edited": is_manually_edited,
        },
    )
    await db.commit()

    return await _get_lead_or_404(db, lead_id)


@router.post(
    "", response_model=LeadResponse, status_code=status.HTTP_201_CREATED
)
async def create_manual_lead(
    payload: LeadCreateManualRequest,
    db: DbSession,
) -> LeadResponse:
    """Cadastro avulso manual de estabelecimento com enriquecimento e scoring imediato (RF16)."""
    place_id = f"manual_{uuid.uuid4().hex}"
    sanitized = sanitize_phone(payload.phone_raw)
    website_status, website_http_code = await check_url(payload.website_url)

    rules = load_vertical_rules(payload.category)
    score, score_breakdown = calculate_lead_score(
        website_status=website_status,
        phone_type=sanitized.phone_type,
        reviews_count=payload.reviews_count,
        rating=payload.rating,
        is_claimed=payload.is_claimed,
        category=payload.category,
        custom_thresholds=rules.get("scoring"),
    )

    insert_res = await db.execute(
        text(
            """
            INSERT INTO leads (
                place_id, name, category, address, neighborhood, city,
                phone_raw, phone_sanitized, phone_type, whatsapp_url,
                google_maps_url, website_url, website_status, website_http_code,
                instagram_url, linkedin_url, rating, reviews_count, is_claimed,
                score, score_breakdown, pipeline_status, notes, created_manually,
                first_seen_at, last_checked_at
            ) VALUES (
                :place_id, :name, :category, :address, :neighborhood, :city,
                :phone_raw, :phone_sanitized, :phone_type, :whatsapp_url,
                :google_maps_url, :website_url, :website_status, :website_http_code,
                :instagram_url, :linkedin_url, :rating, :reviews_count, :is_claimed,
                :score, CAST(:score_breakdown AS jsonb), 'NOVO', :notes, TRUE,
                NOW(), NOW()
            )
            RETURNING id;
            """
        ),
        {
            "place_id": place_id,
            "name": payload.name.strip(),
            "category": payload.category.strip(),
            "address": payload.address.strip() if payload.address else None,
            "neighborhood": (payload.neighborhood or "").strip(),
            "city": payload.city.strip(),
            "phone_raw": (
                payload.phone_raw.strip() if payload.phone_raw else None
            ),
            "phone_sanitized": sanitized.phone_sanitized,
            "phone_type": sanitized.phone_type,
            "whatsapp_url": sanitized.whatsapp_url,
            "google_maps_url": payload.google_maps_url,
            "website_url": (
                payload.website_url.strip() if payload.website_url else None
            ),
            "website_status": website_status,
            "website_http_code": website_http_code,
            "instagram_url": payload.instagram_url,
            "linkedin_url": payload.linkedin_url,
            "rating": Decimal(str(round(payload.rating, 1))),
            "reviews_count": payload.reviews_count,
            "is_claimed": payload.is_claimed,
            "score": score,
            "score_breakdown": json.dumps(score_breakdown),
            "notes": payload.notes,
        },
    )
    new_lead_id: uuid.UUID = insert_res.scalar_one()

    if payload.search_id is not None:
        search_check = await db.execute(
            text("SELECT 1 FROM searches WHERE id = :search_id"),
            {"search_id": payload.search_id},
        )
        if search_check.scalar_one_or_none():
            await db.execute(
                LINK_SEARCH_LEAD_SQL,
                {"search_id": payload.search_id, "lead_id": new_lead_id},
            )
            await db.execute(
                UPDATE_SEARCH_TOTAL_SQL, {"search_id": payload.search_id}
            )

    await db.commit()
    return await _get_lead_or_404(db, new_lead_id)


@router.get("/{lead_id}/export-config")
async def export_lead_site_config(
    lead_id: uuid.UUID,
    db: DbSession,
) -> dict[str, Any]:
    """Exporta o arquivo site.config.json turnkey pré-preenchido com os dados do Lead (RF23).

    Regras estritas:
    - business.name higienizado via clean_business_name(lead.name)
    - business.whatsapp_number = "55" + lead.phone_sanitized (apenas dígitos numéricos)
    - compliance.enable_lgpd_banner = True
    """
    lead = await _get_lead_or_404(db, lead_id)

    template_config_path = (
        PROJECT_ROOT / "templates" / "vercel-advocacia" / "base" / "site.config.json"
    )

    if template_config_path.exists():
        base_config: dict[str, Any] = json.loads(
            template_config_path.read_text(encoding="utf-8")
        )
    else:
        base_config = {
            "business": {},
            "visuals": {
                "theme_preset": "navy-gold",
                "primary_color": "navy",
                "accent_color": "amber",
                "profile_photo_url": "./assets/doutor.svg",
            },
            "metrics": {},
            "services": [],
            "testimonials": [],
            "compliance": {
                "enable_lgpd_banner": False,
                "privacy_policy_url": "/privacidade.html",
            },
        }

    cleaned_name = clean_business_name(lead.name) or lead.name
    whatsapp_number = (
        f"55{lead.phone_sanitized}" if lead.phone_sanitized else ""
    )

    business_section = dict(base_config.get("business") or {})
    business_section.update(
        {
            "name": cleaned_name,
            "city": (lead.city or "Uberlândia").title(),
            "state": business_section.get("state", "MG"),
            "phone_display": lead.phone_raw or "",
            "whatsapp_number": whatsapp_number,
            "address_display": lead.address or lead.neighborhood or "",
        }
    )
    base_config["business"] = business_section

    metrics_section = dict(base_config.get("metrics") or {})
    metrics_section.update(
        {
            "rating": f"{float(lead.rating):.1f}",
            "reviews_count": int(lead.reviews_count),
        }
    )
    base_config["metrics"] = metrics_section

    compliance_section = dict(base_config.get("compliance") or {})
    compliance_section.update(
        {
            "enable_lgpd_banner": False,
            "privacy_policy_url": compliance_section.get(
                "privacy_policy_url", "/privacidade.html"
            ),
        }
    )
    base_config["compliance"] = compliance_section

    return base_config
