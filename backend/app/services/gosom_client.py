"""Cliente HTTP assíncrono para comunicação com o container gosom/google-maps-scraper."""

import csv
import io
import re
from typing import Any

import httpx

from app.core.config import settings
from app.core.normalizer import normalize_search_param


class GosomError(Exception):
    """Exceção lançada em falhas de comunicação com o container gosom."""


def build_search_keyword(
    category: str, city: str, neighborhood: str = ""
) -> tuple[str, str]:
    """Constrói o identificador de job e a query textual para o Google Maps.

    Retorna: (job_name, search_keyword).
    Ex.: ('advogado_uberlandia_centro', 'Advogado em Uberlândia Centro')
    """
    cat_clean = category.strip()
    city_clean = city.strip()
    neigh_clean = neighborhood.strip()

    if neigh_clean:
        keyword = f"{cat_clean} em {city_clean} {neigh_clean}"
    else:
        keyword = f"{cat_clean} em {city_clean}"

    slug_base = normalize_search_param(
        f"{cat_clean}_{city_clean}_{neigh_clean}"
    )
    job_name = re.sub(r"[^a-z0-9]+", "_", slug_base).strip("_")[:60] or "job"

    return job_name, keyword


async def create_gosom_job(
    category: str,
    city: str,
    neighborhood: str = "",
    depth: int = 1,
    max_time: int = 180,
    lang: str = "pt",
) -> str:
    """Dispara um novo job de scraping no container gosom via POST /api/v1/jobs.

    Retorna o gosom_job_id gerado.
    """
    job_name, keyword = build_search_keyword(category, city, neighborhood)
    url = f"{settings.GOSOM_API_URL.rstrip('/')}/api/v1/jobs"

    # Normaliza 'pt-BR' para 'pt' caso a imagem do gosom exija código ISO 639-1 de 2 letras
    lang_code = "pt" if lang.lower().startswith("pt") else lang

    payload: dict[str, Any] = {
        "name": job_name,
        "keywords": [keyword],
        "lang": lang_code,
        "depth": depth,
        "email": False,
        "max_time": max_time,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json=payload)
            if response.status_code == 422 and lang != "pt":
                payload["lang"] = "pt"
                response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            raise GosomError(
                f"Falha ao criar job no gosom ({url}): {exc}"
            ) from exc

    job_id = data.get("id") or data.get("ID")
    if not job_id:
        raise GosomError(f"Resposta do gosom sem ID de job válido: {data}")

    return str(job_id)


async def get_gosom_job_status(gosom_job_id: str) -> dict[str, Any]:
    """Consulta o status atual de um job no gosom via GET /api/v1/jobs/{id}."""
    url = f"{settings.GOSOM_API_URL.rstrip('/')}/api/v1/jobs/{gosom_job_id}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            return data
        except httpx.HTTPError as exc:
            raise GosomError(
                f"Falha ao consultar status do job {gosom_job_id} no gosom: {exc}"
            ) from exc


async def download_gosom_csv(gosom_job_id: str) -> list[dict[str, str]]:
    """Baixa o resultado CSV de um job em GET /api/v1/jobs/{id}/download e parseia com DictReader."""
    url = f"{settings.GOSOM_API_URL.rstrip('/')}/api/v1/jobs/{gosom_job_id}/download"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            if response.status_code == 404:
                return []
            response.raise_for_status()
            csv_text = response.text
        except httpx.HTTPError as exc:
            raise GosomError(
                f"Falha ao baixar CSV do job {gosom_job_id}: {exc}"
            ) from exc

    if not csv_text or not csv_text.strip():
        return []

    reader = csv.DictReader(io.StringIO(csv_text))
    rows: list[dict[str, str]] = []
    for row in reader:
        cleaned_row = {
            str(k).strip(): (str(v).strip() if v is not None else "")
            for k, v in row.items()
            if k is not None
        }
        rows.append(cleaned_row)

    return rows
