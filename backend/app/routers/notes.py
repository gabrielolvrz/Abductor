"""Endpoints HTTP REST para Anotações Internas e Backlog do Sistema (notes.py)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.lead_dto import (
    SystemNoteCreateRequest,
    SystemNoteResponse,
    SystemNoteUpdateRequest,
)

router = APIRouter(prefix="/notes", tags=["System Notes & Backlog"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[SystemNoteResponse])
async def list_notes(
    db: DbSession,
) -> list[SystemNoteResponse]:
    """Lista todas as anotações do backlog ordenadas por pendentes primeiro e mais recentes."""
    res = await db.execute(
        text(
            """
            SELECT id, title, content, tag, is_done, created_at
            FROM system_notes
            ORDER BY is_done ASC, created_at DESC;
            """
        )
    )
    rows = res.mappings().all()
    return [SystemNoteResponse(**dict(r)) for r in rows]


@router.post(
    "", response_model=SystemNoteResponse, status_code=status.HTTP_201_CREATED
)
async def create_note(
    payload: SystemNoteCreateRequest,
    db: DbSession,
) -> SystemNoteResponse:
    """Cria uma nova anotação ou item de backlog interno."""
    res = await db.execute(
        text(
            """
            INSERT INTO system_notes (title, content, tag, is_done)
            VALUES (:title, :content, :tag, FALSE)
            RETURNING id, title, content, tag, is_done, created_at;
            """
        ),
        {
            "title": payload.title.strip(),
            "content": payload.content.strip() if payload.content else None,
            "tag": payload.tag,
        },
    )
    row = res.mappings().one()
    await db.commit()
    return SystemNoteResponse(**dict(row))


@router.patch("/{note_id}", response_model=SystemNoteResponse)
async def update_note(
    note_id: uuid.UUID,
    payload: SystemNoteUpdateRequest,
    db: DbSession,
) -> SystemNoteResponse:
    """Atualiza título, conteúdo, tag ou status de conclusão (is_done) de uma anotação."""
    curr_res = await db.execute(
        text(
            """
            SELECT id, title, content, tag, is_done, created_at
            FROM system_notes
            WHERE id = :id;
            """
        ),
        {"id": note_id},
    )
    curr = curr_res.mappings().one_or_none()
    if not curr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anotação {note_id} não encontrada.",
        )

    fields_set = payload.model_fields_set
    title = (
        payload.title.strip()
        if "title" in fields_set and payload.title is not None
        else curr["title"]
    )
    content = (
        payload.content
        if "content" in fields_set
        else curr["content"]
    )
    tag = (
        payload.tag
        if "tag" in fields_set and payload.tag is not None
        else curr["tag"]
    )
    is_done = (
        payload.is_done
        if "is_done" in fields_set and payload.is_done is not None
        else curr["is_done"]
    )

    upd_res = await db.execute(
        text(
            """
            UPDATE system_notes
            SET title = :title,
                content = :content,
                tag = :tag,
                is_done = :is_done
            WHERE id = :id
            RETURNING id, title, content, tag, is_done, created_at;
            """
        ),
        {
            "id": note_id,
            "title": title,
            "content": content,
            "tag": tag,
            "is_done": is_done,
        },
    )
    updated_row = upd_res.mappings().one()
    await db.commit()
    return SystemNoteResponse(**dict(updated_row))


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    db: DbSession,
) -> Response:
    """Remove uma anotação do sistema."""
    res = await db.execute(
        text("DELETE FROM system_notes WHERE id = :id RETURNING id;"),
        {"id": note_id},
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anotação {note_id} não encontrada.",
        )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
