"""Motor de validação assíncrona de presença web e URLs (validator.py).

Conforme especificado em docs/03 - SDD e docs/02 - SRS:
- Blocklist estrita de agregadores de links e redes sociais.
- Verificação pré-rede rápida com tldextract para evitar tráfego inútil.
- Requisições assíncronas via httpx.AsyncClient com stream=True (lê apenas headers, aborta body).
- Detecção anti-redirect: inspeciona response.url para neutralizar encurtadores (bit.ly -> linktree).
- Códigos 401 e 403 são interpretados como ATIVO (proteção WAF/Cloudflare) ativando Hard Gate.
- Erros de conexão, timeouts, 404 e 5xx são classificados como QUEBRADO.
- Ausência de URL classifica como SEM_SITE.
- Semáforo concorrente limitado a 30 conexões simultâneas (asyncio.Semaphore(30)).
"""

import asyncio
from typing import Any
from urllib.parse import urlparse

import httpx
import tldextract

# Blocklist de agregadores identificados sem requisição de rede
IMPROVISED_DOMAINS: set[str] = {
    "linktr.ee",
    "beacons.ai",
    "instabio.cc",
    "heylink.me",
    "wa.me",
    "api.whatsapp.com",
    "instagram.com",
    "facebook.com",
    "doctoralia.com.br",
    "jusbrasil.com.br",
    "canva.site",
    "guiamais.com.br",
}

DESKTOP_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


def is_improvised_url(url: str) -> bool:
    """Verifica se uma URL pertence à lista de agregadores ou redes sociais.

    Compara o hostname limpo e o registered_domain (via tldextract) por igualdade ou sufixo.
    """
    if not url or not url.strip():
        return False

    normalized_url = url.strip()
    if not normalized_url.startswith(("http://", "https://")):
        normalized_url = "https://" + normalized_url

    parsed = urlparse(normalized_url)
    host = parsed.netloc.lower().split(":")[0].removeprefix("www.")
    extracted = tldextract.extract(normalized_url)
    if hasattr(extracted, "top_domain_under_public_suffix"):
        registered = (extracted.top_domain_under_public_suffix or "").lower()
    else:
        registered = (getattr(extracted, "registered_domain", None) or "").lower()

    return any(
        host == domain
        or host.endswith("." + domain)
        or registered == domain
        for domain in IMPROVISED_DOMAINS
    )


async def check_single_url(
    url: str | None,
    semaphore: asyncio.Semaphore,
    client: httpx.AsyncClient,
) -> tuple[str, int]:
    """Valida o status de uma única URL externa.

    Retorna tupla: (website_status, website_http_code).
    website_status pode ser: 'SEM_SITE', 'IMPROVISADO', 'QUEBRADO' ou 'ATIVO'.
    """
    if not url or not str(url).strip():
        return "SEM_SITE", 0

    target_url = str(url).strip()
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    # Verificação rápida pré-rede (evita disparar requisição para agregadores conhecidos)
    if is_improvised_url(target_url):
        return "IMPROVISADO", 200

    async with semaphore:
        try:
            # stream=True consome apenas os headers iniciais sem baixar o corpo HTML
            async with client.stream("GET", target_url) as response:
                code = response.status_code
                final_url = str(response.url)

                # Anti-falso positivo pós-redirect:
                # Se encurtador (bit.ly, tinyurl) redirecionar para Linktree, WhatsApp ou Instagram
                if is_improvised_url(final_url):
                    return "IMPROVISADO", code

                if code == 404 or code >= 500:
                    return "QUEBRADO", code

                # Respostas 200, 401 e 403 são tratadas como site ATIVO (401/403 sob WAF/Cloudflare)
                return "ATIVO", code

        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
            return "QUEBRADO", 0
        except Exception:  # noqa: BLE001 - Falhas desconhecidas de rede/DNS em URLs de terceiros classificam como QUEBRADO
            return "QUEBRADO", 0


async def check_url(url: str | None) -> tuple[str, int]:
    """Helper autônomo para validação pontual de uma URL com cliente isolado."""
    semaphore = asyncio.Semaphore(1)
    limits = httpx.Limits(max_connections=5, max_keepalive_connections=2)
    async with httpx.AsyncClient(
        headers=DESKTOP_HEADERS,
        timeout=httpx.Timeout(4.0, connect=3.0),
        follow_redirects=True,
        verify=False,
        limits=limits,
    ) as client:
        return await check_single_url(url, semaphore, client)


async def validate_leads_urls(raw_leads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Valida concorrentemente uma lista de dicionários de leads contendo 'website_url'.

    Adiciona as chaves 'website_status' e 'website_http_code' em cada dicionário.
    """
    if not raw_leads:
        return raw_leads

    semaphore = asyncio.Semaphore(30)
    limits = httpx.Limits(max_connections=30, max_keepalive_connections=20)

    async with httpx.AsyncClient(
        headers=DESKTOP_HEADERS,
        timeout=httpx.Timeout(4.0, connect=3.0),
        follow_redirects=True,
        verify=False,
        limits=limits,
    ) as client:
        tasks = [
            check_single_url(lead.get("website_url"), semaphore, client)
            for lead in raw_leads
        ]
        results = await asyncio.gather(*tasks)

    for lead, (status, http_code) in zip(raw_leads, results):
        lead["website_status"] = status
        lead["website_http_code"] = http_code

    return raw_leads
