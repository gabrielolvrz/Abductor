"""Endpoints HTTP REST para Gestão Centralizada de Nichos Homologados (niches.py)."""

import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.normalizer import normalize_search_param
from app.schemas.lead_dto import NicheCreateRequest, NicheResponse

router = APIRouter(prefix="/niches", tags=["Niches"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _slugify(value: str) -> str:
    norm = normalize_search_param(value)
    slug = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return slug or "nicho"


@router.get("", response_model=list[NicheResponse])
async def list_niches(
    db: DbSession,
) -> list[NicheResponse]:
    """Lista todos os nichos cadastrados em ordem alfabética."""
    res = await db.execute(
        text(
            """
            SELECT id, name, slug, created_at
            FROM niches
            ORDER BY name ASC;
            """
        )
    )
    rows = res.mappings().all()
    return [NicheResponse(**dict(r)) for r in rows]


@router.post(
    "", response_model=NicheResponse, status_code=status.HTTP_201_CREATED
)
async def create_niche(
    payload: NicheCreateRequest,
    db: DbSession,
) -> NicheResponse:
    """Cadastra um novo nicho (gerando slug automático e evitando duplicatas)."""
    clean_name = " ".join(payload.name.strip().split())
    slug = _slugify(clean_name)

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nome do nicho é obrigatório.",
        )

    existing_res = await db.execute(
        text(
            """
            SELECT id, name, slug, created_at
            FROM niches
            WHERE name = :name OR slug = :slug
            LIMIT 1;
            """
        ),
        {"name": clean_name, "slug": slug},
    )
    existing_row = existing_res.mappings().one_or_none()
    if existing_row:
        return NicheResponse(**dict(existing_row))

    insert_res = await db.execute(
        text(
            """
            INSERT INTO niches (name, slug)
            VALUES (:name, :slug)
            RETURNING id, name, slug, created_at;
            """
        ),
        {"name": clean_name, "slug": slug},
    )
    row = insert_res.mappings().one()
    await db.commit()
    return NicheResponse(**dict(row))


@router.delete("/{niche_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_niche(
    niche_id: uuid.UUID,
    db: DbSession,
) -> Response:
    """Remove um nicho do catálogo."""
    res = await db.execute(
        text("DELETE FROM niches WHERE id = :id RETURNING id;"),
        {"id": niche_id},
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nicho {niche_id} não encontrado.",
        )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
