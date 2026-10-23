---
title: Abductor - Documento de Arquitetura e Engenharia de Sistema (SDD)
project: Abductor
type: sdd
tags:
  - sdd
  - arquitetura
  - engenharia
  - infraestrutura
  - docker
  - backend
created: 2026-10-22
status: aprovado
---

# 🏗️ 03 - SDD — Arquitetura e Engenharia de Sistema

> Documento de Decisão e Desenho Arquitetural do **Abductor**. Detalha a divisão de responsabilidades entre serviços, topologia local no host Arch Linux, modelo híbrido de execução, ciclo de vida assíncrono de jobs e estratégias de I/O de alta concorrência.

---

## 1. Visão Geral da Arquitetura

O **Abductor** é estruturado como um sistema desacoplado em quatro serviços especializados. Ele adota um **modelo híbrido de desenvolvimento**: serviços de infraestrutura e binários isolados rodam conteinerizados via Docker, enquanto as aplicações de desenvolvimento rápido (API e Frontend) rodam nativamente no host gerenciadas pelo `mise`, aproveitando o compilador local, cache do sistema de arquivos e zero sobrecarga de virtualização.
```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APRESENTAÇÃO                          │
│        Frontend SPA (Vite + React 18 + TypeScript + Tailwind)          │
│            Execução: Nativa no Host via mise (Porta 3000)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (Axios + TanStack Query)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       CAMADA DE APLICAÇÃO (CORE)                       │
│                  Backend API (FastAPI + Python 3.12)                   │
│            Execução: Nativa no Host via mise (Porta 8000)              │
│                                                                        │
│   ├── Orquestrador de Tarefas Assíncronas (Job Runner + BackgroundTask)│
│   ├── Sanitizador e Roteador de WhatsApp (phonenumbers)                │
│   ├── Validador Concorrente de Rede (httpx Async + Semaphore)          │
│   └── Motor Matemático de Lead Scoring (com Hard Gate)                 │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │ HTTP REST (Porta 8080)        │ TCP / SQL (Porta 5432)
┌──────────────────▼──────────┐   ┌──────────────▼─────────────────────┐
│      CONTAINER SCRAPER      │   │          CONTAINER BANCO           │
│  gosom/google-maps-scraper  │   │           PostgreSQL 16            │
│       Binário Go Nativo     │   │  Volume Local em ./data/postgres   │
│     Gerenciador em SQLite   │   │   Btrfs Subvolume com NoCoW (+C)   │
└─────────────────────────────┘   └────────────────────────────────────┘
```

---

## 2. Topologia de Infraestrutura e Host (Arch Linux)

### 2.1. Alocação de Recursos e Portas Locais

| Serviço | Runtime / Imagem | Modo de Execução | Porta no Host | Armazenamento / Volume |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Node.js LTS via `mise` | Nativo (Host) | `3000` | `./frontend/` |
| **Backend** | Python 3.12 via `mise` | Nativo (Host) | `8000` | `./backend/` |
| **PostgreSQL** | `postgres:16-alpine` | Docker Container | `5432` | `./data/postgres` *(NoCoW)* |
| **Scraper** | `gosom/google-maps-scraper` | Docker Container | `8080` | `./data/gosom` |

> [!IMPORTANT]
> O serviço `gosom` deve declarar `shm_size: '2gb'` no `docker-compose.yml`. O limite padrão de 64 MB de `/dev/shm` no Docker faz o Chromium headless crashar em rolagens longas do Google Maps, gerando falsos jobs `PARTIAL` ou `FAILED`.

### 2.2. Mitigação do Sistema de Arquivos Btrfs (Copy-on-Write)
Bancos de dados relacionais sofrem com fragmentação extrema em sistemas de arquivos CoW como o Btrfs. O diretório mapeado para o volume do banco deve ser criado e sinalizado antes da subida dos containers:

```bash
# Criação do ponto de montagem e desativação do Copy-on-Write (+C)
mkdir -p ./data/postgres ./data/gosom
chattr +C ./data/postgres
chattr +C ./data/gosom

# Verificação do atributo NoCoW ativo (deve exibir 'C')
lsattr -d ./data/postgres
```

### 2.3. Aproveitamento do Hardware (Xeon E5-2670 v3 - 24 Threads)

O processador possui capacidade massiva de concorrência. Enquanto o scraper em Go delega a renderização para instâncias headless do Chromium, o backend FastAPI explora o paralelismo de I/O assíncrono com **30 workers concorrentes** no semáforo do `httpx`, executando requisições sem lock de GIL (_Global Interpreter Lock_) do Python.

  

## 3. Fluxo de Dados e Ciclo de Vida do Job

O processamento foi desenhado para eliminar chamadas síncronas que travariam requisições HTTP do navegador.

  

```
[ Usuário ] ──1. POST /api/searches {category, city, neighborhood}──► [ FastAPI ]
                                                                        │
                                                    2. Consulta SQL      │
                                                 (chave normalizada)     │
                                                                        ▼
                                                              [ PostgreSQL ]
                                                                        │
        ┌──────────── Cache COMPLETED/PARTIAL ──────────────────────────┤
        │                                                               │
        ▼                                                               ▼
 (Retorno <100ms)                                             Sem cache ou force_sync
 [ Resposta JSON ]                                                       │
                                                                         │ 3. Cria/atualiza search (PENDING)
                                                                         │ 4. asyncio.create_task(job_lifecycle)
                                                                         ▼
                                                                 [ BackgroundTask ]
                                                                         │
                                                                         ├── POST /api/v1/jobs ──► [ gosom ]
                                                                         ├── Loop GET /api/v1/jobs/{id}
                                                                         ├── GET /api/v1/jobs/{id}/download (CSV)
                                                                         ├── Sanitização (phonenumbers) + validação httpx
                                                                         ├── Score (0..100 + Hard Gate + clamping)
                                                                         └── Upsert + status COMPLETED/PARTIAL
                                                                         │
[ Frontend ] ◄── 5. Responde 202 + search_id ────────────────────────────┘
     │
     └── 6. Polling GET /api/searches/{id}/status (somente SELECT) ──► [ FastAPI ] ──► [ PostgreSQL ]
```

## 4. Comunicação entre Serviços e Contratos de API

### 4.1. Contrato FastAPI ➔ gosom Scraper (Docker Interno)

O scraper em Go expõe uma API REST padrão na porta 8080. O contrato abaixo reflete o schema real aceito pela API do `gosom`:

- **Disparo de Raspagem:** `POST http://localhost:8080/api/v1/jobs`
- **Payload obrigatório:**

```json
{
  "name": "advogado_uberlandia_centro",
  "keywords": ["Advogado em Uberlândia Centro"],
  "lang": "pt",
  "depth": 1,
  "email": false,
  "max_time": 180
}
```

> [!IMPORTANT]
> A API do `gosom` rejeita `"pt-BR"` com `422 Unprocessable Entity` (o código ISO aceito é `"pt"`). Além disso, rejeita o schema legado com `query` (string) e `max_depth`. Os campos corretos são `keywords` (array de strings), `lang: "pt"`, `depth` (inteiro) e `max_time` (segundos).

- **Consulta de Status:** `GET http://localhost:8080/api/v1/jobs/{gosom_job_id}`
- **Download dos Registros Brutos:** `GET http://localhost:8080/api/v1/jobs/{gosom_job_id}/download`

O download retorna um arquivo **CSV** (34 colunas). O backend deve consumi-lo com `csv.DictReader` e mapear as colunas para o modelo interno:

| Coluna do CSV | Campo interno | Observação |
| :--- | :--- | :--- |
| `cid` / `data_id` | `place_id` | Usar `cid` como identificador estável; `data_id` como fallback. |
| `title` | `name` | Nome comercial da ficha (preservado íntegro no banco). |
| `category` | `category` | Categoria primária do Maps. |
| `address` | `address` | Endereço completo. |
| `link` | `google_maps_url` | URL direta para abrir a ficha no Google Maps. |
| `phone` | `phone_raw` | Texto original; sanitizar com `phonenumbers`. |
| `website` | `website_url` | URL cadastrada na ficha. |
| `review_count` | `reviews_count` | Volume de avaliações. |
| `review_rating` | `rating` | Nota média (0 a 5). |
| `owner` | `is_claimed` | Heurística: `owner` preenchido indica ficha reivindicada; caso contrário, `FALSE`. |

> [!NOTE]
> Como o CSV do `gosom` traz o endereço em string única (`address`), o pipeline de ingestão preenche `leads.city` e `leads.neighborhood` herdando diretamente os parâmetros da busca ativa (`searches.city` e `searches.neighborhood`) para garantir consistência de filtros e agrupamento.

### 4.2. Contrato Frontend ➔ FastAPI

#### Iniciar Busca (`POST /api/searches`)

- **Request:**

```json
{
  "category": "Advogado",
  "city": "Uberlândia",
  "neighborhood": "Centro",
  "force_sync": false
}
```

- **Response (Em Cache):** Retorna status `200 OK` com os leads imediatamente.
- **Response (Nova Busca):** Retorna status `202 Accepted`:

```json
{
  "search_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "job_status": "RUNNING",
  "message": "Raspagem iniciada em background"
}
```

> [!IMPORTANT]
> O `POST /api/searches` cria o registro da busca e dispara o ciclo de vida do job em uma `BackgroundTask` (`asyncio.create_task`). A ingestão do CSV, a validação de URLs e o upsert acontecem **somente** nessa task. A rota de status é estritamente somente leitura.

#### Checar Status do Job (`GET /api/searches/{search_id}/status`)

- **Response (Executando):**

```json
{
  "job_status": "RUNNING",
  "progress_phase": "VALIDATING",
  "elapsed_seconds": 38,
  "total_leads": 42
}
```

- **Response (Finalizado):**

```json
{
  "job_status": "COMPLETED",
  "progress_phase": "COMPLETED",
  "total_leads": 42,
  "last_scraped_at": "2026-10-22T14:32:00Z"
}
```

A rota executa apenas `SELECT job_status, progress_phase, started_at, total_leads, ... FROM searches WHERE id = :search_id`. Ela **não** consulta o `gosom`, **não** baixa CSV e **não** dispara ingestão, eliminando condições de corrida de pollings concorrentes.

> [!TIP]
> **Watchdog de Timeout Passivo:** Caso `job_status == 'RUNNING'` e `NOW() - started_at > INTERVAL '180 seconds'` (avaliado com base no início do ciclo ativo `started_at`, permitindo re-sincronizações sem falsos disparos), a rota atualiza automaticamente o banco para `job_status = 'FAILED'`, `progress_phase = 'FAILED'` e devolve status de erro, destravando a interface sem exigir intervenção no terminal.
> 
> As transições de `progress_phase` gravadas no banco refletem:
> `IDLE` ➔ `SCRAPING` (Maps) ➔ `PARSING` (CSV) ➔ `VALIDATING` (httpx) ➔ `SCORING` (Regras) ➔ `COMPLETED` / `FAILED`.

#### Edição Manual e Override Técnico de Lead (`PATCH /api/leads/{id}`)

- **Request:**

```json
{
  "website_status": "IMPROVISADO",
  "website_url": "https://linktr.ee/drcarlos",
  "phone_raw": "(34) 99876-5432",
  "rating": 4.9,
  "reviews_count": 32,
  "instagram_url": "https://instagram.com/drcarlostrabalho",
  "notes": "Secretária pediu para ligar após as 14h"
}
```

- **Comportamento do Backend:** Quando `website_status`, `website_url`, `phone_raw`, `rating` ou `reviews_count` são editados manualmente, o endpoint marca `is_manually_edited = TRUE`, recalcula `score` e `score_breakdown` via `scorer.py` em tempo de execução e atualiza `last_checked_at = NOW()`. No `ingestion.py`, registros com `is_manually_edited = TRUE` têm seu `website_status`, `website_url` e `score` preservados contra sobrescritas de novas raspagens.
- **Response:** Objeto do Lead atualizado com status `200 OK`.

#### Alteração de Status no Funil (`PATCH /api/leads/{id}/pipeline`) e Pipeline Global (`GET /api/leads/pipeline`)

- **Request (`PATCH /api/leads/{id}/pipeline`):**

```json
{
  "pipeline_status": "CONTATADO"
}
```
- **Comportamento:** Atualiza `pipeline_status` e registra `last_status_change_at = NOW()`. O endpoint `GET /api/leads/pipeline` retorna todos os leads com `pipeline_status != 'NOVO'` ordenados por `last_status_change_at DESC`, incluindo `days_in_status` calculado dinamicamente para alertas de SLA na rota `/pipeline`.
- **Rotas Auxiliares CRUD:** `/api/niches` (`GET`, `POST`, `DELETE`) para gestão centralizada de categorias (`niches`) e `/api/notes` (`GET`, `POST`, `PATCH`, `DELETE`) para o bloco de notas interno (`system_notes` em `/anotacoes`).

#### Exportação de Configuração Turnkey (`GET /api/leads/{id}/export-config`)

- **Comportamento:** O endpoint carrega o arquivo base `templates/vertical-{nicho}/site.config.json` e mescla (*override*) os dados dinâmicos do lead, entregando o JSON completo pronto para build e deploy.
- **Regra de Nome e Telefone:** O campo `business.name` é processado por `clean_business_name(lead.name)` para remover sufixos societários (`LTDA`, `ME`, `S/S`), e `business.whatsapp_number` recebe `"55" + lead.phone_sanitized` (apenas dígitos numéricos, sem prefixo de URL), garantindo que o template monte botões limpos.
- **Response:** Payload completo estruturado:

```json
{
  "business": {
    "name": "Dr. Carlos Silva Advocacia",
    "tagline": "Especialista em Direito Imobiliário e Contratos",
    "city": "Uberlândia",
    "state": "MG",
    "phone_display": "(34) 99876-5432",
    "whatsapp_number": "5534998765432",
    "address_display": "Av. Rondon Pacheco, 1234 - Centro"
  },
  "metrics": {
    "rating": "4.9",
    "reviews_count": 48
  },
  "compliance": {
    "enable_lgpd_banner": true,
    "privacy_policy_url": "/privacidade.html"
  }
}
```

## 5. Validação Concorrente de Rede & Detecção de Presença Web

A validação de sites externos é uma das operações mais sensíveis da aplicação. Utilizar requisições sequenciais causaria timeouts massivos, e usar `HTTP HEAD` sem headers de navegador geraria falsos positivos causados por WAFs e firewalls de CDN (Cloudflare).

  

### 5.1. Implementação Técnica do Motor Assíncrono (`engines/validator.py`)

```python
import asyncio

import httpx
import tldextract
from urllib.parse import urlparse

# Blocklist de agregadores identificados sem requisição de rede
IMPROVISED_DOMAINS = {
    "linktr.ee", "beacons.ai", "instabio.cc", "heylink.me",
    "wa.me", "api.whatsapp.com", "instagram.com", "facebook.com",
    "doctoralia.com.br", "jusbrasil.com.br", "canva.site", "guiamais.com.br",
}

DESKTOP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


def _is_improvised(url: str) -> bool:
    """Compara host/domínio por igualdade ou sufixo, sem substring solta."""
    host = urlparse(url).netloc.lower().split(":")[0].removeprefix("www.")
    registered = tldextract.extract(url).registered_domain
    return any(
        host == domain
        or host.endswith("." + domain)
        or registered == domain
        for domain in IMPROVISED_DOMAINS
    )


async def check_single_url(
    url: str,
    semaphore: asyncio.Semaphore,
    client: httpx.AsyncClient,
) -> tuple[str, int]:
    if not url or not url.strip():
        return "SEM_SITE", 0

    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Verificação rápida pré-rede (evita requisição para agregadores conhecidos)
    if _is_improvised(url):
        return "IMPROVISADO", 200

    async with semaphore:
        try:
            # GET com stream=True para consumir apenas headers sem baixar o body
            async with client.stream("GET", url) as response:
                code = response.status_code
                final_url = str(response.url)

                # Anti-falso positivo de encurtadores:
                # Se bit.ly, tinyurl ou similar redirecionar para Linktree/WhatsApp/Instagram
                if _is_improvised(final_url):
                    return "IMPROVISADO", code

                if code == 404 or code >= 500:
                    return "QUEBRADO", code
                # 401/403 tratados como ATIVO (proteção WAF/Cloudflare)
                return "ATIVO", code
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
            return "QUEBRADO", 0
        except Exception:
            return "QUEBRADO", 0


async def validate_leads_urls(raw_leads: list[dict]) -> list[dict]:
    # Um único pool de conexões para todo o lote, limitado a 30 conexões simultâneas.
    semaphore = asyncio.Semaphore(30)
    limits = httpx.Limits(max_connections=30, max_keepalive_connections=20)

    async with httpx.AsyncClient(
        headers=DESKTOP_HEADERS,
        timeout=httpx.Timeout(4.0, connect=3.0),
        follow_redirects=True,
        verify=False,  # Não falha por certificado autoassinado ou expirado pontualmente
        limits=limits,
    ) as client:
        tasks = [
            check_single_url(lead.get("website_url", ""), semaphore, client)
            for lead in raw_leads
        ]
        results = await asyncio.gather(*tasks)

    for lead, (status, http_code) in zip(raw_leads, results):
        lead["website_status"] = status
        lead["website_http_code"] = http_code

    return raw_leads
```

## 6. Estratégia de Resiliência e Persistência de Dados

### 6.1. Upsert Seguro e Preservação do Mini-CRM

O maior risco operacional em sistemas de scraping é a perda de dados de prospecção manual (ex: anotações, leads marcados como `CONTATADO` ou `FECHADO`) ao rodar uma nova varredura que sobrescreva a base.

  

A inserção transacional no PostgreSQL utiliza a instrução `ON CONFLICT (place_id)` com atualização seletiva:

```sql
INSERT INTO leads (
    place_id, name, category, address, neighborhood, city,
    phone_raw, phone_sanitized, phone_type, whatsapp_url,
    google_maps_url, website_url, website_status, website_http_code,
    rating, reviews_count, is_claimed, score, score_breakdown,
    pipeline_status, notes, last_checked_at
) VALUES (
    :place_id, :name, :category, :address, :neighborhood, :city,
    :phone_raw, :phone_sanitized, :phone_type, :whatsapp_url,
    :google_maps_url, :website_url, :website_status, :website_http_code,
    :rating, :reviews_count, :is_claimed, :score, :score_breakdown,
    'NOVO', NULL, NOW()
)
ON CONFLICT (place_id) DO UPDATE SET
    -- Atualiza métricas públicas somente se o lead NÃO tiver sido editado manualmente pelo operador
    rating = CASE WHEN leads.is_manually_edited THEN leads.rating ELSE EXCLUDED.rating END,
    reviews_count = CASE WHEN leads.is_manually_edited THEN leads.reviews_count ELSE EXCLUDED.reviews_count END,
    -- Atualiza URLs públicas caso tenham mudado ou sido adicionadas
    website_url = CASE WHEN leads.is_manually_edited THEN leads.website_url ELSE EXCLUDED.website_url END,
    google_maps_url = COALESCE(NULLIF(leads.google_maps_url, ''), EXCLUDED.google_maps_url),
    -- Nunca rebaixa uma ficha já confirmada como reivindicada
    is_claimed = leads.is_claimed OR EXCLUDED.is_claimed,
    -- Enriquece telefone somente se o campo ainda estiver vazio ou se não foi editado manualmente
    phone_raw = CASE WHEN leads.is_manually_edited THEN leads.phone_raw ELSE COALESCE(NULLIF(leads.phone_raw, ''), EXCLUDED.phone_raw) END,
    phone_sanitized = CASE WHEN leads.is_manually_edited THEN leads.phone_sanitized ELSE COALESCE(NULLIF(leads.phone_sanitized, ''), EXCLUDED.phone_sanitized) END,
    phone_type = CASE
        WHEN leads.is_manually_edited THEN leads.phone_type
        WHEN NULLIF(leads.phone_sanitized, '') IS NULL THEN EXCLUDED.phone_type
        ELSE leads.phone_type
    END,
    whatsapp_url = COALESCE(NULLIF(leads.whatsapp_url, ''), EXCLUDED.whatsapp_url),
    website_status = CASE WHEN leads.is_manually_edited THEN leads.website_status ELSE EXCLUDED.website_status END,
    website_http_code = CASE WHEN leads.is_manually_edited THEN leads.website_http_code ELSE EXCLUDED.website_http_code END,
    score = CASE WHEN leads.is_manually_edited THEN leads.score ELSE EXCLUDED.score END,
    score_breakdown = CASE WHEN leads.is_manually_edited THEN leads.score_breakdown ELSE EXCLUDED.score_breakdown END,
    last_checked_at = NOW()
    -- IMPORTANTE: pipeline_status e notes JAMAIS são tocados aqui!
RETURNING id;
```

> [!NOTE]
> Ao final da ingestão, o backend recalcula o contador da busca para evitar defasagem:
> ```sql
> UPDATE searches
> SET total_leads = (
>     SELECT COUNT(*) FROM search_leads WHERE search_id = :search_id
> )
> WHERE id = :search_id;
> ```

### 6.2. Pipeline de Ingestão e Filtragem Institucional (`services/ingestion.py`)

O pipeline de ingestão recebe o CSV do `gosom` e executa as seguintes etapas sequenciais antes da gravação no PostgreSQL:

1. **Parsing e Descarte de Termos Bloqueados (`blocked_terms_in_name`):**
   * Lê as regras da vertical ativa (`rules.json`).
   * Se o nome do estabelecimento contiver termos bloqueados institucionais (como *"Defensoria"*, *"OAB"*, *"Tribunal"*, *"Fórum"*, *"Sindicato"*), o registro é sumariamente descartado da ingestão, economizando conexões de rede e evitando leads governamentais no cockpit comercial.
2. **Preservação Íntegra do Nome no Banco:**
   * O nome da empresa é persistido na coluna `leads.name` exatamente como extraído do Google Maps (apenas com `.strip()`), sem qualquer corte. Isso preserva a precisão do card e a eficácia da busca social via Google Dork (`RF14`).
   * A função `clean_business_name(lead.name)` atua **exclusivamente em runtime** durante a interpolação do script (`/api/scripts/interpolate`) e na exportação do `site.config.json` (`/api/leads/{id}/export-config`), removendo apenas sufixos societários formais (`LTDA`, `ME`, `EPP`, `EIRELI`, `S/S`, `S.A.`, `Sociedade Individual de Advocacia`, `Sociedade de Advogados`, `CNPJ`).
3. **Sanitização de Contato (`phonenumbers`):**
   * Classifica `phone_type` (`MOBILE`, `LANDLINE`, `NONE`, `INVALID`).
4. **Validação de Presença Web (`httpx Async` + Verificação Pós-Redirect):**
   * Testa domínios com inspeção de `response.url` para neutralizar encurtadores (`bit.ly` que redireciona para Linktree/WhatsApp).
5. **Lead Scoring com Hard Gate e Clamping:**
   * Aplica regras matemáticas, penalidade para leads sem telefone (-30 pts) e clamping [0, 100].
6. **Upsert Transacional Preservativo:**
   * Grava no PostgreSQL via `ON CONFLICT (place_id) DO UPDATE ... RETURNING id`.

### 6.3. Tratamento de Coletas Interrompidas e Watchdog de Timeout

1. **Falha do Container ou CAPTCHA:** Se o processo do `gosom` for interrompido prematuramente, o FastAPI recupera os dados parciais que já foram gravados no banco interno do scraper, salvando o status `PARTIAL`.
2. **Watchdog de Timeout de Proteção:**
   * **No Job Runner:** Se a chamada ao `gosom` exceder 180 segundos sem resposta, a task força o encerramento e grava `job_status = 'FAILED'`, `progress_phase = 'FAILED'`.
   * **Na Rota de Polling:** Se a task do backend morrer (devido a reload de código do Uvicorn ou crash de sistema), a rota `GET /api/searches/{id}/status` detecta que a busca está em `RUNNING` há mais de 180s com base em `started_at` (`NOW() - started_at > INTERVAL '180 seconds'`) e força a atualização no banco para `FAILED`, recuperando o sistema automaticamente sem travar re-sincronizações.
    
      
    

## 7. Estrutura Modular de Diretórios do Projeto

Plaintext

```
abductor/
├── docker-compose.yml           # Definição dos containers (Postgres 16 + gosom)
├── .env.example                 # Configuração de portas e credenciais locais
├── data/                        # Mapeamento de volumes locais
│   ├── postgres/                # Volume NoCoW (+C) do banco de dados
│   └── gosom/                   # Armazenamento temporário de jobs do scraper
├── backend/
│   ├── .venv/                   # Ambiente virtual Python via mise
│   ├── pyproject.toml           # Dependências gerenciadas
│   ├── app/
│   │   ├── main.py              # Ponto de entrada FastAPI e middlewares CORS
│   │   ├── core/
│   │   │   ├── config.py        # Settings e variáveis de ambiente
│   │   │   └── database.py      # Conexão assíncrona SQLAlchemy/asyncpg
│   │   ├── models/              # Mapeamento declarativo ORM
│   │   │   ├── search.py
│   │   │   └── lead.py
│   │   ├── schemas/             # Validação e tipagem Pydantic
│   │   │   ├── search_dto.py
│   │   │   └── lead_dto.py
│   │   ├── engines/             # Lógica pura desacoplada
│   │   │   ├── scorer.py        # Motor matemático + clamping 0..100
│   │   │   ├── sanitizer.py     # phonenumbers (validação BR) e roteamento WhatsApp
│   │   │   ├── validator.py     # Validador assíncrono httpx com cliente único e anti-redirecionamento
│   │   │   └── cleaner.py       # Higienização de razão social para abordagem humanizada
│   │   ├── services/            # Orquestração e chamadas externas
│   │   │   ├── gosom_client.py  # Wrapper da API REST do gosom
│   │   │   ├── job_runner.py    # Ciclo de vida assíncrono do job (BackgroundTask)
│   │   │   └── ingestion.py     # Pipeline de processamento em lote
│   │   ├── verticals/           # Seeds iniciais de nicho (runtime = PostgreSQL)
│   │   │   ├── _shared/
│   │   │   └── advocacia/
│   │   └── routers/             # Endpoints HTTP REST
│   │       ├── searches.py
│   │       ├── leads.py
│   │       └── scripts.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/          # Componentes visuais atômicos
        │   ├── Header.tsx
        │   ├── SearchForm.tsx
        │   ├── JobProgress.tsx  # Stepper e cronômetro decorrido
        │   ├── LeadCard.tsx     # Card interativo com mini-CRM e edição
        │   └── PitchModal.tsx   # Modal de script com interpolação
        ├── pages/
        │   ├── Dashboard.tsx    # Rota principal (/)
        │   ├── Pitches.tsx      # Central de scripts (/abordagens)
        │   └── Playbook.tsx     # Guia e checklists (/playbook)
        └── services/            # Clientes de API Axios + TanStack Query
            └── api.ts
```

## 🔗 Documentos Relacionados

- Voltar para a central: [[00 - MOC - Central de Controle]]
    
      
    
- Requisitos de software: [[02 - SRS - Requisitos do Sistema]]
    
      
    
- Esquema físico e DDL SQL: [[04 - DATA - Modelagem e Banco]]
    
      
    
- Registro de decisões técnicas: [[05 - ADR - Decisoes de Arquitetura]]