"""Orquestrador assíncrono de ciclo de vida de jobs em background (job_runner.py).

Conforme ADR 010 e docs/03 - SDD:
- Executa estritamente in-process via asyncio.create_task (sem Celery/Redis).
- Mantém referências fortes das tasks em memória para evitar coleta pelo GC do Python.
- Sincroniza progress_phase em tempo real no PostgreSQL:
  IDLE -> SCRAPING -> PARSING -> VALIDATING -> SCORING -> COMPLETED / FAILED.
- Recupera e persiste coletas parciais (job_status = 'PARTIAL') caso o scraper sofra interrupção mas tenha extraído registros.
- Suporta re-validação rápida de URLs dos leads salvos (RF08 - Ação B) sem acionar o Google Maps.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Any

from sqlalchemy import select, text

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.engines.scorer import calculate_lead_score
from app.engines.validator import validate_leads_urls
from app.models.search import Search
from app.services.gosom_client import (
    create_gosom_job,
    download_gosom_csv,
    get_gosom_job_status,
)
from app.services.ingestion import ingest_csv_rows_for_search
from app.verticals import load_vertical_rules

logger = logging.getLogger(__name__)

# Referências fortes para evitar que o garbage collector destrua tasks em execução
_active_tasks: set[asyncio.Task[Any]] = set()


def spawn_background_job(coro: Any) -> asyncio.Task[Any]:
    """Cria uma asyncio.Task protegida contra garbage collection prematuro."""
    task = asyncio.create_task(coro)
    _active_tasks.add(task)
    task.add_done_callback(_active_tasks.discard)
    return task


async def _mark_search_failed(search_id: uuid.UUID, reason: str) -> None:
    """Marca a busca como FAILED de forma segura em sessão isolada."""
    logger.error("Busca %s marcada como FAILED: %s", search_id, reason)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                UPDATE searches
                SET job_status = 'FAILED',
                    progress_phase = 'FAILED'
                WHERE id = :search_id
                """
            ),
            {"search_id": search_id},
        )
        await session.commit()


async def run_scraping_job(search_id: uuid.UUID) -> None:
    """Ciclo de vida completo de uma varredura no Google Maps via gosom."""
    gosom_job_id: str | None = None
    search_category = ""
    search_city = ""
    search_neighborhood = ""

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Search).where(Search.id == search_id)
            )
            search = result.scalar_one_or_none()
            if not search:
                logger.warning("Busca %s não encontrada para execução.", search_id)
                return

            search_category = search.category
            search_city = search.city
            search_neighborhood = search.neighborhood

            await session.execute(
                text(
                    """
                    UPDATE searches
                    SET job_status = 'RUNNING',
                        progress_phase = 'SCRAPING',
                        started_at = NOW()
                    WHERE id = :search_id
                    """
                ),
                {"search_id": search_id},
            )
            await session.commit()

            # 1. Disparar job no container gosom
            gosom_job_id = await create_gosom_job(
                category=search_category,
                city=search_city,
                neighborhood=search_neighborhood,
                depth=1,
                max_time=settings.JOB_TIMEOUT_SECONDS,
            )

            await session.execute(
                text(
                    """
                    UPDATE searches
                    SET gosom_job_id = :gosom_job_id
                    WHERE id = :search_id
                    """
                ),
                {"search_id": search_id, "gosom_job_id": gosom_job_id},
            )
            await session.commit()

        # 2. Polling de conclusão no gosom (respeitando o timeout configurado)
        start_monotonic = time.monotonic()
        completed_cleanly = False

        while (time.monotonic() - start_monotonic) < settings.JOB_TIMEOUT_SECONDS:
            await asyncio.sleep(2.0)
            status_payload = await get_gosom_job_status(gosom_job_id)
            raw_status = str(
                status_payload.get("Status")
                or status_payload.get("status")
                or ""
            ).lower()

            if raw_status in ("ok", "completed", "done", "finished"):
                completed_cleanly = True
                break
            if raw_status in ("failed", "error", "aborted"):
                logger.warning(
                    "Job %s no gosom reportou falha: %s", gosom_job_id, raw_status
                )
                break

        # 3. Download do CSV (integral ou parcial)
        csv_rows = await download_gosom_csv(gosom_job_id)

        if not completed_cleanly and not csv_rows:
            await _mark_search_failed(
                search_id,
                f"Job {gosom_job_id} interrompido ou expirado sem dados parciais.",
            )
            return

        # 4. Ingestão, validação web, scoring e upsert preservativo
        async with AsyncSessionLocal() as session:
            total_leads = await ingest_csv_rows_for_search(
                session=session,
                search_id=search_id,
                search_category=search_category,
                search_city=search_city,
                search_neighborhood=search_neighborhood,
                csv_rows=csv_rows,
            )

            final_job_status = (
                "COMPLETED"
                if completed_cleanly
                else ("PARTIAL" if total_leads > 0 else "FAILED")
            )
            final_phase = (
                "COMPLETED" if final_job_status != "FAILED" else "FAILED"
            )

            await session.execute(
                text(
                    """
                    UPDATE searches
                    SET job_status = CAST(:job_status AS VARCHAR),
                        progress_phase = CAST(:phase AS VARCHAR),
                        total_leads = :total_leads,
                        last_scraped_at = CASE
                            WHEN CAST(:job_status AS VARCHAR) IN ('COMPLETED', 'PARTIAL') THEN NOW()
                            ELSE last_scraped_at
                        END
                    WHERE id = :search_id
                    """
                ),
                {
                    "search_id": search_id,
                    "job_status": final_job_status,
                    "phase": final_phase,
                    "total_leads": total_leads,
                },
            )
            await session.commit()

    except Exception as exc:
        logger.exception("Erro no ciclo do job da busca %s", search_id)
        # Tentativa de resgate parcial caso gosom_job_id já exista
        if gosom_job_id:
            try:
                partial_rows = await download_gosom_csv(gosom_job_id)
                if partial_rows:
                    async with AsyncSessionLocal() as session:
                        total = await ingest_csv_rows_for_search(
                            session=session,
                            search_id=search_id,
                            search_category=search_category,
                            search_city=search_city,
                            search_neighborhood=search_neighborhood,
                            csv_rows=partial_rows,
                        )
                        if total > 0:
                            await session.execute(
                                text(
                                    """
                                    UPDATE searches
                                    SET job_status = 'PARTIAL',
                                        progress_phase = 'COMPLETED',
                                        total_leads = :total,
                                        last_scraped_at = NOW()
                                    WHERE id = :search_id
                                    """
                                ),
                                {"search_id": search_id, "total": total},
                            )
                            await session.commit()
                            return
            except Exception:  # noqa: BLE001
                logger.warning("Não foi possível resgatar CSV parcial do job %s", gosom_job_id)

        await _mark_search_failed(search_id, str(exc))


async def revalidate_search_leads_job(search_id: uuid.UUID) -> None:
    """RF08 (Ação B): Revalida URLs via httpx e recalcula Scores dos leads já salvos da busca."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Search).where(Search.id == search_id)
            )
            search = result.scalar_one_or_none()
            if not search:
                return

            search_category = search.category
            rules = load_vertical_rules(search_category)
            scoring_thresholds = rules.get("scoring")

            await session.execute(
                text(
                    """
                    UPDATE searches
                    SET job_status = 'RUNNING',
                        progress_phase = 'VALIDATING',
                        started_at = NOW()
                    WHERE id = :search_id
                    """
                ),
                {"search_id": search_id},
            )
            await session.commit()

            rows_res = await session.execute(
                text(
                    """
                    SELECT l.id, l.website_url, l.phone_type, l.reviews_count, l.rating, l.is_claimed, l.category
                    FROM leads l
                    INNER JOIN search_leads sl ON sl.lead_id = l.id
                    WHERE sl.search_id = :search_id
                      AND l.is_manually_edited = FALSE
                    """
                ),
                {"search_id": search_id},
            )
            lead_rows = rows_res.mappings().all()

            raw_leads: list[dict[str, Any]] = [dict(r) for r in lead_rows]
            validated_leads = await validate_leads_urls(raw_leads)

            await session.execute(
                text(
                    "UPDATE searches SET progress_phase = 'SCORING' WHERE id = :search_id"
                ),
                {"search_id": search_id},
            )
            await session.commit()

            for lead in validated_leads:
                score, breakdown = calculate_lead_score(
                    website_status=lead["website_status"],
                    phone_type=lead["phone_type"],
                    reviews_count=int(lead["reviews_count"] or 0),
                    rating=float(lead["rating"] or 0.0),
                    is_claimed=bool(lead["is_claimed"]),
                    category=lead.get("category") or search_category,
                    custom_thresholds=scoring_thresholds,
                )
                await session.execute(
                    text(
                        """
                        UPDATE leads
                        SET website_status = :website_status,
                            website_http_code = :website_http_code,
                            score = :score,
                            score_breakdown = CAST(:score_breakdown AS jsonb),
                            last_checked_at = NOW()
                        WHERE id = :lead_id
                        """
                    ),
                    {
                        "lead_id": lead["id"],
                        "website_status": lead["website_status"],
                        "website_http_code": lead["website_http_code"],
                        "score": score,
                        "score_breakdown": json.dumps(breakdown),
                    },
                )

            await session.execute(
                text(
                    """
                    UPDATE searches
                    SET job_status = 'COMPLETED',
                        progress_phase = 'COMPLETED',
                        last_scraped_at = NOW()
                    WHERE id = :search_id
                    """
                ),
                {"search_id": search_id},
            )
            await session.commit()

    except Exception as exc:
        logger.exception("Falha ao revalidar URLs da busca %s", search_id)
        await _mark_search_failed(search_id, str(exc))
