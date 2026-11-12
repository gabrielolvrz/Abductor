# 🛸 Abductor

<p align="center">
  <img src="frontend/src/assets/hero.png" width="140" alt="Abductor" />
</p>

<p align="center">
  <b>Cockpit local de prospecção para vender sites institucionais one-page.</b><br />
  Extrai leads do Google Maps, valida a presença digital, calcula um score de 0 a 100 e organiza a abordagem no WhatsApp.
</p>

<p align="center">
  <a href="https://www.python.org"><img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" /></a>
  <a href="https://fastapi.tiangolo.com"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white" /></a>
  <a href="https://react.dev"><img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" /></a>
  <a href="https://vite.dev"><img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" /></a>
  <a href="https://www.postgresql.org"><img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" /></a>
  <a href="https://www.docker.com"><img alt="Docker Compose" src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" /></a>
</p>

---

## O que é

O Abductor é uma aplicação **local-first** de operador único. Ele transforma uma busca no Google Maps em uma fila de leads priorizada para vender **Sites Vitrine One-Page (Turnkey)** a profissionais liberais e negócios locais com boa reputação física, mas presença digital fraca: sem site, com link de agregador (Linktree, Instagram, WhatsApp) ou com domínio quebrado.

| Etapa | O que o sistema faz |
| :--- | :--- |
| **Extração** | Dispara buscas por categoria, cidade e bairro no container `gosom/google-maps-scraper` e baixa o resultado em CSV. |
| **Higienização** | Filtra órgãos e entidades institucionais, normaliza telefones brasileiros e preserva o nome original do estabelecimento. |
| **Validação** | Verifica concorrentemente se o site do lead está ativo, quebrado ou é apenas um agregador de links. |
| **Priorização** | Calcula um score de 0 a 100 com **Hard Gate** para quem já tem site ativo e persiste o breakdown explicativo. |
| **Operação** | Entrega o lead no cockpit com filtros, Kanban, scripts de abordagem, link de WhatsApp e exportação de configuração para o template. |

### O que ele não é

- **Não é um SaaS.** Roda na máquina do operador, sem autenticação e sem multi-tenant.
- **Não raspa o Maps com Selenium/Puppeteer.** A extração é delegada ao container Go do `gosom`.
- **Não usa Celery, Redis ou fila externa.** Os jobs rodam in-process com `asyncio` e watchdog configurável (180 s por padrão).
- **Não substitui o julgamento comercial.** O score prioriza a fila; a decisão de abordagem continua sendo do operador.

---

## Como funciona

```mermaid
flowchart LR
    UI["Cockpit React + Vite<br/>:3000"] -->|"REST /api"| API["FastAPI<br/>:8000"]
    API -->|"cache-first"| DB[("PostgreSQL 16<br/>:5432")]
    API -->|"cria job / baixa CSV"| GOSOM["gosom scraper (Go)<br/>:8080"]
    GOSOM --> GMAPS[("Google Maps")]
    API -->|"GET stream concorrente"| WEB["Sites dos leads"]
    API -->|"score + upsert"| DB
    API -.->|"site.config.json"| TPL["Templates Vercel"]
    UI -->|"Kanban, pitches, notas"| API
```

O ciclo de uma busca:

1. O cockpit envia categoria, cidade e bairro para `POST /api/searches`.
2. O backend aplica **cache-first**: se a busca já foi concluída, devolve os leads do PostgreSQL; caso contrário, inicia ou reaproveita o job e responde `202`.
3. O `job_runner` acompanha o `gosom`, baixa o CSV e percorre as fases `SCRAPING → PARSING → VALIDATING → SCORING`.
4. Cada linha é filtrada, tem o telefone sanitizado e a URL validada em paralelo.
5. O score é calculado e o lead é gravado com upsert preservativo; a interface acompanha o progresso por polling.

Se um job ficar em `RUNNING` além do limite configurado em `JOB_TIMEOUT_SECONDS` (**180 s** por padrão), a rota de status aplica o watchdog passivo e marca a busca como `FAILED`. Coletas interrompidas que ainda tenham linhas úteis são salvas como `PARTIAL`.

---

## Stack

| Camada | Tecnologia |
| :--- | :--- |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2 assíncrono, asyncpg, httpx, Pydantic v2 |
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, TanStack Query, Axios |
| **Banco** | PostgreSQL 16 Alpine com `citext`, JSONB e índices de leitura |
| **Extração** | Container `gosom/google-maps-scraper` (Go + Chromium headless) |
| **Templates** | HTML/CSS/JS puro + `site.config.json`, prontos para Vercel |
| **Infra** | Docker Compose para Postgres e `gosom`; aplicação nativa no host |

---

## Rodando localmente

### Pré-requisitos

| Ferramenta | Versão |
| :--- | :--- |
| Docker + Docker Compose | Docker Compose v2 (`docker compose`) |
| Python | 3.12 |
| Node.js | 20.19+ (linha 20) ou 22.12+ (exigência do Vite 8) |
| npm | Incluído com o Node |

O projeto foi desenvolvido em **Arch Linux**. Os comandos abaixo assumem Linux e partem da raiz do repositório, salvo indicação contrária. Em outros sistemas, mantenha o Docker e ajuste os caminhos do host. `mise` é opcional: `backend/mise.toml` e `frontend/mise.toml` fixam as versões de Python e Node.

### 1. Clonar e configurar

```bash
git clone https://github.com/gabrielolvrz/Abductor.git
cd Abductor
cp .env.example .env
```

O backend lê o `.env` da raiz e, se existir, `backend/.env`. O Docker Compose usa o `.env` da raiz.

Se o repositório estiver em **Btrfs**, marque as pastas de dados como NoCoW **antes** do primeiro boot do Postgres:

```bash
mkdir -p data/postgres data/gosom
sudo chattr +C data/postgres data/gosom 2>/dev/null || true
```

### 2. Subir a infraestrutura

```bash
docker compose up -d
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Serviços esperados:

- **PostgreSQL 16:** `localhost:5432`
- **gosom scraper:** `localhost:8080`

O `backend/init.sql` é executado pelo Postgres apenas na primeira inicialização do volume. Ele cria as tabelas, índices, nichos e scripts iniciais.

### 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 4. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Cockpit: `http://localhost:3000`

Por padrão, o frontend chama `http://localhost:8000/api`. Para apontar para outro backend, defina `VITE_API_BASE_URL` antes de iniciar o Vite:

```bash
VITE_API_BASE_URL=http://192.168.0.10:8000/api npm run dev
```

### Atalho

Depois de criar o `.venv` e instalar as dependências do frontend uma vez, o launcher sobe o Docker, inicia os dois servidores e abre o cockpit:

```bash
chmod +x abductor.sh
./abductor.sh
```

---

## Configuração

As variáveis do backend e do Docker Compose ficam no `.env` da raiz. O frontend aceita `VITE_API_BASE_URL` pelo ambiente ou por um `frontend/.env`.

| Variável | Padrão | Uso |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres123@localhost:5432/abductor_db` | Conexão assíncrona do backend com o Postgres. |
| `DB_USER` | `postgres` | Usuário criado pelo container Postgres. |
| `DB_PASSWORD` | `postgres123` | Senha do container Postgres. |
| `DB_NAME` | `abductor_db` | Banco criado pelo container Postgres. |
| `GOSOM_API_URL` | `http://localhost:8080` | Base da API do scraper `gosom`. |
| `CORS_ORIGINS` | `http://localhost:3000` | Origens permitidas pelo FastAPI; aceita lista separada por vírgula. |
| `VALIDATOR_MAX_CONCURRENCY` | `30` | Número máximo de validações de URL simultâneas. |
| `VALIDATOR_TIMEOUT_SECONDS` | `4.0` | Timeout total de cada requisição de validação. |
| `JOB_TIMEOUT_SECONDS` | `180` | Timeout do job no `gosom`, do polling e do watchdog passivo da rota de status. |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | URL da API usada pelo frontend. Opcional. |

O `DATABASE_URL` é o que o backend usa. As variáveis `DB_*` servem ao container Postgres. Se você alterar uma, mantenha a outra coerente.

---

## Regras de negócio

### Lead Scoring

O score final é a soma dos pontos abaixo, limitada ao intervalo `[0, 100]`:

| Dimensão | Condição | Pontos |
| :--- | :--- | ---: |
| **Site** | `IMPROVISADO` (agregador ou rede social) | +30 |
| | `QUEBRADO` (DNS, timeout, 404 ou 5xx) | +25 |
| | `SEM_SITE` | +15 |
| **Contato** | Celular brasileiro válido (`MOBILE`) | +20 |
| | Telefone fixo válido (`LANDLINE`) | 0 |
| | `NONE`, `INVALID` ou `UNKNOWN` | −30 |
| **Reviews — Grupo 1** | ≥ 15 avaliações | +25 |
| | 5 a 14 avaliações | +15 |
| | < 5 avaliações | 0 |
| **Reviews — Grupo 2** | ≥ 40 avaliações | +25 |
| | 15 a 39 avaliações | +15 |
| | < 15 avaliações | 0 |
| **Reputação** | Rating 4.5 a 5.0 | +15 |
| | Rating 4.0 a 4.4 | +5 |
| | Rating < 4.0 (com reviews) | −10 |
| **Ficha** | `is_claimed = true` | +10 |

- **Hard Gate:** se `website_status == 'ATIVO'`, o score é **0 absoluto**, independentemente dos demais critérios.
- **Grupo 1:** advocacia, odontologia, medicina, psicologia, arquitetura, engenharia e imobiliário. **Grupo 2:** demais nichos.
- Perfis sem avaliações não recebem penalidade de rating; ficam neutros nessa dimensão.
- As regras de reviews podem ser sobrescritas por `scoring` no `rules.json` da vertical.
- O objeto `score_breakdown` é persistido em JSONB e exibido no tooltip do card.

### Presença web

O validador usa `httpx.AsyncClient` com `GET` e `stream=True` (lê apenas os headers), semáforo e timeout configuráveis (padrões: 30 conexões e 4 s), `follow_redirects=True` e User-Agent desktop.

| Resultado | Quando acontece |
| :--- | :--- |
| `SEM_SITE` | Campo de website vazio ou nulo. |
| `IMPROVISADO` | Domínio na blocklist ou redirecionamento para um deles: `linktr.ee`, `beacons.ai`, `instabio.cc`, `heylink.me`, `wa.me`, `api.whatsapp.com`, `instagram.com`, `facebook.com`, `doctoralia.com.br`, `jusbrasil.com.br`, `canva.site`, `guiamais.com.br`. |
| `QUEBRADO` | Erro de conexão, timeout, HTTP 404 ou 5xx. |
| `ATIVO` | HTTP 200, 401 ou 403 (WAF/Cloudflare), além de outras respostas que não sejam 404/5xx. O Hard Gate é ativado. |

### Telefone

O motor usa `phonenumbers` com região `BR`.

| Tipo | Regra | Pontos | WhatsApp |
| :--- | :--- | ---: | :--- |
| `MOBILE` | Celular brasileiro válido | +20 | `https://wa.me/55{ddd+número}` |
| `LANDLINE` | Fixo ou fixo/celular válido | 0 | Também gera link `wa.me` |
| `INVALID` | Inválido, DDD inexistente ou 0800 | −30 | Não gera |
| `NONE` | Sem telefone | −30 | Não gera |

O campo `phone_sanitized` guarda apenas DDD + número nacional, sem `+55`.

### Ingestão preservativa

- `leads.name` mantém o nome completo do Google Maps. A limpeza de `LTDA`, `ME`, `S/S`, `EIRELI` e afins acontece somente em runtime, nos scripts e na exportação do `site.config.json`.
- O upsert por `place_id` **não sobrescreve** `pipeline_status` nem `notes`.
- Telefones manuais são preservados com `COALESCE(NULLIF(...))`; métricas públicas e score só são atualizados quando o lead não foi editado manualmente.
- Leads institucionais com termos como `Defensoria`, `OAB`, `Tribunal`, `Fórum` e `Sindicato` são descartados na ingestão.

---

## API

Base: `http://localhost:8000/api` · documentação interativa em `/docs`.

### Buscas

| Método | Rota | Uso |
| :--- | :--- | :--- |
| `GET` | `/searches` | Histórico das últimas buscas. |
| `POST` | `/searches` | Cria ou reaproveita uma busca; `force_sync` ignora o cache. |
| `GET` | `/searches/{id}/status` | Status e fase do job; aplica o watchdog configurado em `JOB_TIMEOUT_SECONDS`. |
| `GET` | `/searches/{id}/leads` | Leads da busca, ordenados por score. |
| `POST` | `/searches/{id}/revalidate` | Revalida URLs e recalcula o score dos leads salvos. |

### Leads e CRM

| Método | Rota | Uso |
| :--- | :--- | :--- |
| `GET` | `/leads/pipeline` | Leads com status diferente de `NOVO`, ordenados pela última mudança. |
| `GET` | `/leads/{id}` | Detalhe de um lead. |
| `POST` | `/leads` | Cadastro manual com sanitização, validação e score. |
| `PATCH` | `/leads/{id}` | Edita dados e notas do lead. |
| `PATCH` | `/leads/{id}/pipeline` | Move o lead no Kanban. |
| `GET` | `/leads/{id}/export-config` | Gera o `site.config.json` turnkey. |

### Conteúdo operacional

| Método | Rota | Uso |
| :--- | :--- | :--- |
| `GET/POST` | `/scripts` | Lista e cria pitches e quebras de objeção. |
| `PATCH/DELETE` | `/scripts/{id}` | Edita ou remove um script. |
| `POST` | `/scripts/interpolate` | Preenche o script com os dados do lead e devolve o link do WhatsApp. |
| `GET/POST` | `/niches` | Lista e cadastra nichos. |
| `DELETE` | `/niches/{id}` | Remove um nicho. |
| `GET/POST` | `/notes` | Lista e cria notas do backlog. |
| `PATCH/DELETE` | `/notes/{id}` | Edita ou remove uma nota. |

---

## Interface

| Rota | Tela | O que faz |
| :--- | :--- | :--- |
| `/` | Bancada | Busca, progresso do job, filtros, cards de lead, cadastro manual, gestor de nichos e exportação de configuração. |
| `/pipeline` | Kanban comercial | Colunas `CONTATADO → RESPONDEU → NEGOCIANDO → FECHADO / RECUSADO`, com SLA por dias no status. |
| `/abordagens` | Roteiros | Pitches e objeções por nicho, com cópia e interpolação para o lead. |
| `/playbook` | Playbook | Abordagens, contra-ataque de objeções e checklists de WhatsApp, reunião e entrega. |
| `/anotacoes` | Backlog | Notas com tags `IDEIA`, `BUG` e `LEMBRETE`, com conclusão e exclusão. |

Os leads entram como `NOVO` na Bancada. O Kanban trabalha a partir de `CONTATADO`; `NOVO` é o estado inicial antes do primeiro toque.

---

## Templates turnkey

A esteira fica em `templates/` e contém dois modelos estáticos, sem framework JS no cliente:

- `templates/vercel-advocacia/` — escritórios e advogados, com página de privacidade e diretrizes OAB no `AI_GUIDELINES.md`.
- `templates/vercel-petshop/` — pet shops e clínicas veterinárias, com layout adaptável aos pilares do negócio.

Fluxo de uma instância:

```bash
cd templates/vercel-advocacia
cp -r base clientes/nome_do_cliente
cd clientes/nome_do_cliente

# Substitua o site.config.json pelo arquivo exportado no cockpit
cp ~/Downloads/site.config.json ./site.config.json

# Pré-visualização
python -m http.server 5000

# Deploy
npx vercel --prod
```

As pastas `templates/*/clientes/*` são ignoradas pelo Git; os dados dos clientes ficam apenas na máquina do operador.

---

## Estrutura do repositório

```text
Abductor/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuração, banco assíncrono e normalizador
│   │   ├── engines/       # cleaner, sanitizer, scorer e validator
│   │   ├── models/        # ORM: leads, searches, scripts, nichos e notas
│   │   ├── routers/       # Endpoints REST
│   │   ├── schemas/       # DTOs Pydantic
│   │   ├── services/      # Cliente gosom, ingestão e job runner
│   │   └── verticals/     # Regras JSON por nicho
│   ├── init.sql           # DDL, índices e seeds iniciais
│   ├── tests/             # 44 testes unitários
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── components/    # Cards, modais, busca, progresso e exportação
│       ├── pages/         # Dashboard, Pipeline, Pitches, Playbook, Notes
│       └── services/      # Cliente Axios e tipos compartilhados
├── templates/
│   ├── vercel-advocacia/
│   └── vercel-petshop/
├── docs/                  # Especificações 00 a 09
├── abductor.sh            # Launcher do cockpit
├── docker-compose.yml     # Postgres 16 + gosom
└── .env.example
```

---

## Testes e qualidade

O backend tem **44 testes unitários** cobrindo scorer, sanitizer, cleaner, normalizador, validador e contratos da API. Eles rodam sem um Postgres em execução.

```bash
cd backend
source .venv/bin/activate

# Ferramentas de desenvolvimento (não são dependências de runtime)
pip install pytest mypy ruff

pytest -q
python -m mypy app/
python -m ruff check app/
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## Segurança e limites

- **Ferramenta local.** A API não tem autenticação. Não exponha as portas `8000`/`8080` na internet sem uma camada de autenticação e reverse proxy.
- **Segredos fora do Git.** `.env`, `data/`, `.venv/`, `node_modules/` e as instâncias de clientes em `templates/*/clientes/*` estão no `.gitignore`.
- **Dados públicos.** A extração opera sobre dados cadastrais publicados pelos próprios estabelecimentos no Google Maps. Os templates incluem página de privacidade e tratamento de dados, mas a adequação jurídica final deve ser validada pelo operador.
- **Sem fila externa.** O processamento assíncrono é in-process; reiniciar o backend interrompe jobs em andamento.
- **Um operador.** Não há usuários, permissões ou isolamento entre contas.

---

## Documentação

As decisões e contratos completos estão em `docs/`:

- [00 — Central de Controle (MOC)](docs/00%20-%20MOC%20-%20Central%20de%20Controle.md)
- [01 — Visão de Produto (PRD)](docs/01%20-%20PRD%20-%20Visao%20de%20Produto.md)
- [02 — Requisitos do Sistema (SRS)](docs/02%20-%20SRS%20-%20Requisitos%20do%20Sistema.md)
- [03 — Arquitetura e Engenharia (SDD)](docs/03%20-%20SDD%20-%20Arquitetura%20e%20Engenharia.md)
- [04 — Modelagem de Dados (DATA)](docs/04%20-%20DATA%20-%20Modelagem%20e%20Banco.md)
- [05 — Decisões de Arquitetura (ADR)](docs/05%20-%20ADR%20-%20Decisoes%20de%20Arquitetura.md)
- [06 — Playbook Comercial](docs/06%20-%20PLAYBOOK%20-%20Abordagens%20e%20Vendas.md)
- [07 — Verticais e Boilerplates](docs/07%20-%20TEMPLATES%20-%20Verticais%20e%20Boilerplates.md)
- [08 — Runbook do Host](docs/08%20-%20RUNBOOK%20-%20Setup%20da%20Maquina.md)
- [09 — Checklist de Execução](docs/09%20-%20TASKS%20-%20Checklist%20de%20Execucao.md)

O [AGENTS.md](AGENTS.md) define as convenções de engenharia para agentes que trabalharem neste repositório.

---

## Licença

Projeto pessoal de [Gabriel Oliveira](https://github.com/gabrielolvrz). Não há licença open source definida neste repositório; entre em contato antes de reutilizar o código.
