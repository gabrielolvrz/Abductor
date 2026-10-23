"""Testes unitários para o motor assíncrono de validação web (validator.py)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.engines.validator import (
    check_single_url,
    check_url,
    is_improvised_url,
    validate_leads_urls,
)


def test_is_improvised_url():
    assert is_improvised_url("https://linktr.ee/drcarlos") is True
    assert is_improvised_url("http://beacons.ai/dra.ana") is True
    assert is_improvised_url("https://instagram.com/clinicafeliz") is True
    assert is_improvised_url("https://wa.me/5534998765432") is True
    assert is_improvised_url("https://api.whatsapp.com/send?phone=...") is True
    assert is_improvised_url("https://doctoralia.com.br/medico/joao") is True
    assert is_improvised_url("https://drcarlosadvogado.com.br") is False
    assert is_improvised_url("https://meusiteproprio.com") is False
    assert is_improvised_url("") is False
    assert is_improvised_url(None) is False


@pytest.mark.anyio
async def test_check_empty_url():
    semaphore = asyncio.Semaphore(5)
    async with httpx.AsyncClient() as client:
        status, code = await check_single_url("", semaphore, client)
        assert status == "SEM_SITE"
        assert code == 0

        status_none, code_none = await check_single_url(None, semaphore, client)
        assert status_none == "SEM_SITE"
        assert code_none == 0


@pytest.mark.anyio
async def test_check_pre_network_improvised():
    # Deve retornar IMPROVISADO imediatamente sem disparar requisição
    semaphore = asyncio.Semaphore(5)
    async with httpx.AsyncClient() as client:
        status, code = await check_single_url(
            "https://linktr.ee/escritorio", semaphore, client
        )
        assert status == "IMPROVISADO"
        assert code == 200


@pytest.mark.anyio
async def test_check_url_anti_redirect():
    # Simula um encurtador bit.ly que redireciona para Instagram
    semaphore = asyncio.Semaphore(5)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.url = httpx.URL("https://www.instagram.com/drcarlos")

    mock_stream_ctx = AsyncMock()
    mock_stream_ctx.__aenter__.return_value = mock_response

    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_client.stream.return_value = mock_stream_ctx

    status, code = await check_single_url(
        "https://bit.ly/drcarlos", semaphore, mock_client
    )
    assert status == "IMPROVISADO"
    assert code == 200


@pytest.mark.anyio
async def test_check_url_waf_protection_401_403():
    # Sites protegidos por Cloudflare / WAF respondem 401 ou 403 e devem ser ATIVO
    semaphore = asyncio.Semaphore(5)

    for error_code in (401, 403):
        mock_response = MagicMock()
        mock_response.status_code = error_code
        mock_response.url = httpx.URL("https://siteprotegido.com.br")

        mock_stream_ctx = AsyncMock()
        mock_stream_ctx.__aenter__.return_value = mock_response

        mock_client = MagicMock(spec=httpx.AsyncClient)
        mock_client.stream.return_value = mock_stream_ctx

        status, code = await check_single_url(
            "https://siteprotegido.com.br", semaphore, mock_client
        )
        assert status == "ATIVO"
        assert code == error_code


@pytest.mark.anyio
async def test_check_url_error_codes_quebrado():
    semaphore = asyncio.Semaphore(5)

    for error_code in (404, 500, 502, 503):
        mock_response = MagicMock()
        mock_response.status_code = error_code
        mock_response.url = httpx.URL("https://sitecomfalha.com.br")

        mock_stream_ctx = AsyncMock()
        mock_stream_ctx.__aenter__.return_value = mock_response

        mock_client = MagicMock(spec=httpx.AsyncClient)
        mock_client.stream.return_value = mock_stream_ctx

        status, code = await check_single_url(
            "https://sitecomfalha.com.br", semaphore, mock_client
        )
        assert status == "QUEBRADO"
        assert code == error_code


@pytest.mark.anyio
async def test_check_url_network_exceptions():
    semaphore = asyncio.Semaphore(5)

    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_client.stream.side_effect = httpx.ConnectError("Connection refused")

    status, code = await check_single_url(
        "https://dominiocanela.com.br", semaphore, mock_client
    )
    assert status == "QUEBRADO"
    assert code == 0


@pytest.mark.anyio
async def test_check_url_helper():
    status, code = await check_url("https://linktr.ee/teste")
    assert status == "IMPROVISADO"
    assert code == 200

    status_empty, code_empty = await check_url("")
    assert status_empty == "SEM_SITE"
    assert code_empty == 0


@pytest.mark.anyio
async def test_validate_leads_urls_batch():
    leads = [
        {"name": "Lead Sem Site", "website_url": ""},
        {"name": "Lead Linktree", "website_url": "https://linktr.ee/dentista"},
    ]
    validated = await validate_leads_urls(leads)
    assert validated[0]["website_status"] == "SEM_SITE"
    assert validated[0]["website_http_code"] == 0
    assert validated[1]["website_status"] == "IMPROVISADO"
    assert validated[1]["website_http_code"] == 200
