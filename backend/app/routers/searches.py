"""Endpoints HTTP REST para gerenciamento de Buscas, Cache-First e Watchdog Passivo."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.normalizer import normalize_search_param
from app.schemas.lead_dto import LeadResponse
from app.schemas.search_dto import SearchCreateRequest, SearchStatusResponse
from app.services.job_runner import (
    revalidate_search_leads_job,
    run_scraping_job,
    spawn_background_job,
)

router = APIRouter(prefix="/searches", tags=["Searches"])
DbSession = Annotated[AsyncSession, Depends(get_db)]

FETCH_SEARCH_LEADS_SQL = text(
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
        ) AS is_shared_phone,
        sl.found_at
    FROM leads l
    INNER JOIN search_leads sl ON sl.lead_id = l.id
    WHERE sl.search_id = :search_id
    ORDER BY l.score DESC, l.reviews_count DESC;
    """
)

PASSIVE_WATCHDOG_SQL = text(
    """
    UPDATE searches
    SET job_status = 'FAILED',
        progress_phase = 'FAILED'
    WHERE id = :search_id
      AND job_status = 'RUNNING'
      AND (NOW() - started_at) > INTERVAL '180 seconds'
    RETURNING id;
    """
)

SELECT_SEARCH_STATUS_SQL = text(
    """
    SELECT
        id AS search_id,
        category,
        city,
        neighborhood,
        job_status,
        progress_phase,
        total_leads,
        last_scraped_at,
        started_at,
        created_at,
        GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int) AS elapsed_seconds
    FROM searches
    WHERE id = :search_id;
    """
)


async def fetch_leads_for_search(
    db: AsyncSession, search_id: uuid.UUID
) -> list[LeadResponse]:
    """Executa a consulta otimizada de leads da busca ativa com subquery EXISTS global."""
    res = await db.execute(FETCH_SEARCH_LEADS_SQL, {"search_id": search_id})
    rows = res.mappings().all()
    leads: list[LeadResponse] = []
    for row in rows:
        row_dict = dict(row)
        row_dict["rating"] = float(row_dict.get("rating") or 0.0)
        leads.append(LeadResponse(**row_dict))
    return leads


@router.get("", response_model=list[SearchStatusResponse])
async def list_searches(
    db: DbSession,
) -> list[SearchStatusResponse]:
    """Lista o histórico de buscas realizadas ordenadas pela mais recente."""
    res = await db.execute(
        text(
            """
            SELECT
                id AS search_id,
                category,
                city,
                neighborhood,
                job_status,
                progress_phase,
                total_leads,
                last_scraped_at,
                started_at,
                created_at,
                GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int) AS elapsed_seconds
            FROM searches
            ORDER BY COALESCE(last_scraped_at, created_at) DESC
            LIMIT 50;
            """
        )
    )
    rows = res.mappings().all()
    return [SearchStatusResponse(**dict(r)) for r in rows]


@router.post("", response_model=SearchStatusResponse)
async def create_or_get_search(
    payload: SearchCreateRequest,
    response: Response,
    db: DbSession,
) -> SearchStatusResponse:
    """Inicia uma busca geográfica com estratégia Cache-First instantânea (<100ms).

    - Se a busca já estiver COMPLETED ou PARTIAL e force_sync=False: retorna 200 OK com os leads do banco.
    - Se a busca estiver FAILED, não existir, ou force_sync=True: retorna 202 Accepted e dispara job em background.
    """
    norm_category = normalize_search_param(payload.category)
    norm_city = normalize_search_param(payload.city)
    norm_neighborhood = normalize_search_param(payload.neighborhood)

    if not norm_category or not norm_city:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Categoria e cidade são obrigatórias.",
        )

    # Verificar se já existe registro para a chave normalizada
    existing_res = await db.execute(
        text(
            """
            SELECT id
            FROM searches
            WHERE category = :category
              AND city = :city
              AND neighborhood = :neighborhood
            LIMIT 1;
            """
        ),
        {
            "category": norm_category,
            "city": norm_city,
            "neighborhood": norm_neighborhood,
        },
    )
    existing_id = existing_res.scalar_one_or_none()

    if existing_id is not None:
        # Aplica watchdog passivo antes de avaliar o estado atual
        await db.execute(PASSIVE_WATCHDOG_SQL, {"search_id": existing_id})
        await db.commit()

        status_res = await db.execute(
            SELECT_SEARCH_STATUS_SQL, {"search_id": existing_id}
        )
        search_row = status_res.mappings().one()

        # Cache Hit válido (COMPLETED ou PARTIAL) sem force_sync
        if (
            search_row["job_status"] in ("COMPLETED", "PARTIAL")
            and not payload.force_sync
        ):
            leads = await fetch_leads_for_search(db, existing_id)
            response.status_code = status.HTTP_200_OK
            return SearchStatusResponse(
                **dict(search_row),
                cached=True,
                message="Dados carregados do cache local.",
                leads=leads,
            )

        # Job já em andamento dentro da janela de 180s
        if search_row["job_status"] == "RUNNING" and not payload.force_sync:
            response.status_code = status.HTTP_202_ACCEPTED
            return SearchStatusResponse(
                **dict(search_row),
                cached=False,
                message="Raspagem já em andamento em background.",
            )

        # Re-sincronização (force_sync=True) ou re-tentativa automática após FAILED
        await db.execute(
            text(
                """
                UPDATE searches
                SET job_status = 'RUNNING',
                    progress_phase = 'SCRAPING',
                    started_at = NOW()
                WHERE id = :search_id;
                """
            ),
            {"search_id": existing_id},
        )
        await db.commit()

        spawn_background_job(run_scraping_job(existing_id))

        updated_res = await db.execute(
            SELECT_SEARCH_STATUS_SQL, {"search_id": existing_id}
        )
        updated_row = updated_res.mappings().one()
        response.status_code = status.HTTP_202_ACCEPTED
        return SearchStatusResponse(
            **dict(updated_row),
            cached=False,
            message="Raspagem iniciada em background",
        )

    # Nova busca: inserir registro e disparar job em background
    insert_res = await db.execute(
        text(
            """
            INSERT INTO searches (
                category, city, neighborhood, job_status, progress_phase, started_at
            ) VALUES (
                :category, :city, :neighborhood, 'RUNNING', 'SCRAPING', NOW()
            )
            RETURNING id;
            """
        ),
        {
            "category": norm_category,
            "city": norm_city,
            "neighborhood": norm_neighborhood,
        },
    )
    new_search_id: uuid.UUID = insert_res.scalar_one()
    await db.commit()

    spawn_background_job(run_scraping_job(new_search_id))

    new_status_res = await db.execute(
        SELECT_SEARCH_STATUS_SQL, {"search_id": new_search_id}
    )
    new_row = new_status_res.mappings().one()
    response.status_code = status.HTTP_202_ACCEPTED
    return SearchStatusResponse(
        **dict(new_row),
        cached=False,
        message="Raspagem iniciada em background",
    )


@router.get("/{search_id}/status", response_model=SearchStatusResponse)
async def get_search_status(
    search_id: uuid.UUID,
    db: DbSession,
) -> SearchStatusResponse:
    """Consulta de polling de status com Watchdog Passivo de Timeout (180s).

    Executa apenas SELECT (precedido da verificação passiva de timeout em SQL).
    Não consulta o gosom nem faz download de CSV na rota de status.
    """
    watchdog_res = await db.execute(
        PASSIVE_WATCHDOG_SQL, {"search_id": search_id}
    )
    if watchdog_res.scalar_one_or_none() is not None:
        await db.commit()

    res = await db.execute(SELECT_SEARCH_STATUS_SQL, {"search_id": search_id})
    row = res.mappings().one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Busca {search_id} não encontrada.",
        )

    row_dict = dict(row)
    msg = (
        "Timeout de 180s excedido (Watchdog Passivo acionado)."
        if row_dict["job_status"] == "FAILED"
        and row_dict["elapsed_seconds"] > 180
        else None
    )
    return SearchStatusResponse(**row_dict, message=msg)


@router.get("/{search_id}/leads", response_model=list[LeadResponse])
async def get_search_leads(
    search_id: uuid.UUID,
    db: DbSession,
) -> list[LeadResponse]:
    """Retorna todos os leads vinculados à busca ativa, ordenados por Score DESC."""
    exists_res = await db.execute(
        text("SELECT 1 FROM searches WHERE id = :search_id"),
        {"search_id": search_id},
    )
    if not exists_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Busca {search_id} não encontrada.",
        )

    return await fetch_leads_for_search(db, search_id)


@router.post(
    "/{search_id}/revalidate",
    response_model=SearchStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def revalidate_search_urls(
    search_id: uuid.UUID,
    db: DbSession,
) -> SearchStatusResponse:
    """RF08 (Ação B): Revalida URLs via httpx e recalcula Scores dos leads salvos da busca."""
    res = await db.execute(SELECT_SEARCH_STATUS_SQL, {"search_id": search_id})
    row = res.mappings().one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Busca {search_id} não encontrada.",
        )

    await db.execute(
        text(
            """
            UPDATE searches
            SET job_status = 'RUNNING',
                progress_phase = 'VALIDATING',
                started_at = NOW()
            WHERE id = :search_id;
            """
        ),
        {"search_id": search_id},
    )
    await db.commit()

    spawn_background_job(revalidate_search_leads_job(search_id))

    updated_res = await db.execute(
        SELECT_SEARCH_STATUS_SQL, {"search_id": search_id}
    )
    updated_row = updated_res.mappings().one()
    return SearchStatusResponse(
        **dict(updated_row),
        message="Revalidação de URLs iniciada em background.",
    )
