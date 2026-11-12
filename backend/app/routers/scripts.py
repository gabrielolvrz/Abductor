from __future__ import annotations

import re
import uuid
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.engines.cleaner import clean_business_name
from app.models.lead import Lead
from app.models.search import PitchScript, Search, SearchLead
from app.schemas.lead_dto import (
    PitchInterpolateRequest,
    PitchInterpolateResponse,
    PitchScriptCreateRequest,
    PitchScriptResponse,
    PitchScriptUpdateRequest,
)

router = APIRouter(prefix="/scripts", tags=["Scripts & Playbook"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _interpolate_template(
    template: str,
    *,
    clean_name: str,
    city: str,
    category: str,
    rating: float | None,
    reviews_count: int,
    price: int | None = None,
) -> str:
    """Interpola placeholders do script e aplica fallback de RF20 quando reviews_count == 0."""
    text = template
    if reviews_count == 0:
        # RF20: Se reviews_count == 0, substitui trechos de avaliações por menção neutra
        text = re.sub(
            r"com\s+\{reviews_count\}\s+avaliaç(?:ões|oes)(?:\s+excelentes)?(?:\s*\(nota\s*\{rating\}\))?",
            "com presença destacada no Google",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"\(\s*\{reviews_count\}\s+avaliaç(?:ões|oes)\s*\)",
            "(destaque no Google)",
            text,
            flags=re.IGNORECASE,
        )
        text = text.replace("{reviews_count} avaliações", "presença destacada")

    rating_str = f"{float(rating):.1f}" if rating is not None else "5.0"

    replacements = {
        "{name}": clean_name,
        "{city}": city,
        "{category}": category,
        "{niche}": category,
        "{rating}": rating_str,
        "{reviews_count}": str(reviews_count),
    }
    for placeholder, val in replacements.items():
        text = text.replace(placeholder, val)

    if price is not None:
        price_int = int(price)
        price_custom = price_int + 150
        text = text.replace("{price}", f"R$ {price_int}")
        text = text.replace("{price_custom}", f"R$ {price_custom}")
        text = text.replace("{ticket}", f"R$ {price_int}")
        # Elimina travamento de preços legados estáticos no template
        text = re.sub(r"R\$\s*350\b", f"R$ {price_int}", text)
        text = re.sub(r"R\$\s*500\b", f"R$ {price_custom}", text)

    return text.replace("\\n", "\n")


@router.get("", response_model=list[PitchScriptResponse])
async def list_scripts(
    db: DbSession,
    category: str | None = Query(default=None),
    website_condition: str | None = Query(default=None),
    script_type: str | None = Query(default=None),
) -> list[PitchScriptResponse]:
    """Lista os templates de abordagem e quebras de objeção cadastrados no banco."""
    stmt = select(PitchScript).order_by(PitchScript.created_at.asc())
    if category:
        stmt = stmt.where(PitchScript.category.ilike(f"%{category.strip()}%"))
    if website_condition:
        stmt = stmt.where(
            PitchScript.website_condition == website_condition.strip().upper()
        )
    if script_type:
        stmt = stmt.where(
            PitchScript.script_type == script_type.strip().upper()
        )

    res = await db.execute(stmt)
    scripts = res.scalars().all()
    return [PitchScriptResponse.model_validate(s) for s in scripts]


@router.post(
    "", response_model=PitchScriptResponse, status_code=status.HTTP_201_CREATED
)
async def create_script(
    payload: PitchScriptCreateRequest,
    db: DbSession,
) -> PitchScriptResponse:
    """Cria um novo template de script de abordagem ou quebra de objeção."""
    script = PitchScript(
        title=payload.title.strip(),
        category=payload.category.strip(),
        script_type=payload.script_type,
        website_condition=payload.website_condition,
        situation=payload.situation.strip() if payload.situation else None,
        message_template=payload.message_template,
        upsell_focus=payload.upsell_focus,
    )
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return PitchScriptResponse.model_validate(script)


@router.patch("/{script_id}", response_model=PitchScriptResponse)
async def update_script(
    script_id: uuid.UUID,
    payload: PitchScriptUpdateRequest,
    db: DbSession,
) -> PitchScriptResponse:
    """Atualiza um script de abordagem ou quebra de objeção existente."""
    res = await db.execute(
        select(PitchScript).where(PitchScript.id == script_id)
    )
    script = res.scalar_one_or_none()
    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} não encontrado.",
        )

    if payload.title is not None:
        script.title = payload.title.strip()
    if payload.category is not None:
        script.category = payload.category.strip()
    if payload.script_type is not None:
        script.script_type = payload.script_type
    if payload.website_condition is not None:
        script.website_condition = payload.website_condition
    if "situation" in payload.model_fields_set:
        script.situation = (
            payload.situation.strip() if payload.situation else None
        )
    if payload.message_template is not None:
        script.message_template = payload.message_template
    if payload.upsell_focus is not None:
        script.upsell_focus = payload.upsell_focus

    await db.commit()
    await db.refresh(script)
    return PitchScriptResponse.model_validate(script)


@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: uuid.UUID,
    db: DbSession,
) -> Response:
    """Remove um script ou quebra de objeção do catálogo."""
    res = await db.execute(
        select(PitchScript).where(PitchScript.id == script_id)
    )
    script = res.scalar_one_or_none()
    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} não encontrado.",
        )
    await db.delete(script)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/interpolate", response_model=PitchInterpolateResponse)
async def interpolate_script(
    payload: PitchInterpolateRequest,
    db: DbSession,
) -> PitchInterpolateResponse:
    """Interpola um script comercial com os dados reais do Lead em runtime.

    - Limpa o nome do negócio via clean_business_name (RF12 / SDD 3.2)
    - Aplica fallback automático caso reviews_count == 0 (RF20)
    - Monta URL de disparo direto no WhatsApp com texto URL-encoded
    """
    lead_res = await db.execute(select(Lead).where(Lead.id == payload.lead_id))
    lead = lead_res.scalar_one_or_none()
    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {payload.lead_id} não encontrado.",
        )

    # Descobre cidade/categoria associadas ao lead ou à busca mais recente
    search_stmt = (
        select(Search)
        .join(SearchLead, SearchLead.search_id == Search.id)
        .where(SearchLead.lead_id == lead.id)
        .order_by(Search.created_at.desc())
        .limit(1)
    )
    search_res = await db.execute(search_stmt)
    linked_search = search_res.scalar_one_or_none()

    city = (
        lead.city
        or (linked_search.city if linked_search else None)
        or "sua região"
    )
    category = (
        lead.category
        or (linked_search.category if linked_search else None)
        or "seu segmento"
    )

    script: PitchScript | None = None
    if payload.script_id is not None:
        s_res = await db.execute(
            select(PitchScript).where(PitchScript.id == payload.script_id)
        )
        script = s_res.scalar_one_or_none()
        if script is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Script {payload.script_id} não encontrado.",
            )
    elif payload.custom_template is None:
        cond = (
            lead.website_status
            if lead.website_status in ("SEM_SITE", "IMPROVISADO", "QUEBRADO")
            else "GERAL"
        )
        s_res = await db.execute(
            select(PitchScript)
            .where(PitchScript.script_type == "PITCH")
            .where(PitchScript.website_condition.in_([cond, "GERAL"]))
            .order_by(PitchScript.created_at.asc())
        )
        candidates = list(s_res.scalars().all())
        for cand in candidates:
            if (
                cand.category.lower() in category.lower()
                and cand.website_condition == cond
            ):
                script = cand
                break
        if script is None:
            for cand in candidates:
                if cand.website_condition == cond:
                    script = cand
                    break
        if script is None and candidates:
            script = candidates[0]

    if payload.custom_template is not None:
        template_str = payload.custom_template
        script_id_val = script.id if script else None
        script_title = script.title if script else "Template Personalizado"
        upsell_focus = script.upsell_focus if script else "NONE"
    elif script is not None:
        template_str = script.message_template
        script_id_val = script.id
        script_title = script.title
        upsell_focus = script.upsell_focus
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum script de abordagem disponível para interpolação.",
        )

    cleaned_name = clean_business_name(lead.name)
    rating_val = float(lead.rating) if lead.rating is not None else None
    interpolated_message = _interpolate_template(
        template_str,
        clean_name=cleaned_name,
        city=city,
        category=category,
        rating=rating_val,
        reviews_count=lead.reviews_count or 0,
        price=payload.price,
    )

    whatsapp_trigger_url: str | None = None
    if lead.phone_sanitized:
        encoded_msg = quote(interpolated_message)
        whatsapp_trigger_url = (
            f"https://wa.me/55{lead.phone_sanitized}?text={encoded_msg}"
        )

    return PitchInterpolateResponse(
        lead_id=lead.id,
        script_id=script_id_val,
        script_title=script_title,
        cleaned_name=cleaned_name,
        interpolated_message=interpolated_message,
        whatsapp_trigger_url=whatsapp_trigger_url,
        upsell_focus=upsell_focus,
    )
