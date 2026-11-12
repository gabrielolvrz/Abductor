# 🛸 Abductor

<p align="center">
  <img src="frontend/src/assets/hero.png" width="130" alt="Abductor" />
</p>

<p align="center">
  <b>Cockpit local de prospecção e fechamento rápido de sites vitrine institucionais.</b><br />
  Extrai leads do Google Maps, valida presença digital em paralelo, aplica Lead Scoring com Hard Gate e organiza a abordagem comercial no WhatsApp.
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

O **Abductor** é uma plataforma local-first desenvolvida para operadores autônomos fecharem **Sites Vitrine One-Page (Turnkey Institucional)** com ticket de **R$ 300 a R$ 850** em pagamento único.

Ele resolve o gargalo de prospecção fria: em vez de minerar contatos manualmente, o sistema varre o Google Maps, descarta quem já possui website estruturado e entrega uma fila priorizada de profissionais liberais e negócios físicos com **alta reputação real (4.5★ a 5.0★)**, mas **presença digital fraca ou amadora** (Linktree, perfil de Instagram cru, link direto de WhatsApp ou domínio fora do ar).

### O que o sistema faz

- 🎯 **Lead Scoring com Hard Gate:** Pontua leads de 0 a 100 baseando-se em avaliações, nota e canal de contato, forçando **0 absoluto** para quem já tem site funcional ativo.
- ⚡ **Validação Concorrente de URLs:** Varre dezenas de sites em paralelo lendo apenas os headers HTTP (`GET stream=True`) para detectar agregadores e erros sem baixar payloads pesados.
- 🛡️ **CRM com Ingestão Preservativa:** Atualiza métricas públicas via `place_id` sem nunca sobrescrever anotações manuais, telefones editados ou estágios de negociação no funil.
- 💬 **Abordagem via WhatsApp em 1 Clique:** Interpola scripts em tempo real (removendo termos societários como `LTDA`/`ME`, validando celular nacional e inserindo dados de autoridade).
- 🚀 **Esteira Turnkey de 15 Minutos:** Gera um arquivo `site.config.json` pronto para ser injetado em templates estáticos perenes de alta performance com blindagem LGPD inclusa.

### O que ele não é

- **Não é um SaaS multi-tenant:** Roda 100% na máquina do operador, sem autenticação externa, telemetria na nuvem ou mensalidades de terceiros.
- **Não usa Selenium ou Puppeteer no backend:** A extração do Google Maps é delegada ao container em Go `gosom/google-maps-scraper`.
- **Não depende de Redis, Celery ou filas externas:** A orquestração é in-process via `asyncio` com watchdog passivo configurável.

---

## Início Rápido

### Pré-requisitos

- **Docker & Docker Compose** (Docker Compose v2)
- **Python 3.12+**
- **Node.js 20.19+ ou 22.12+** (compatível com Vite 8)

### Subida em 3 Passos

```bash
# 1. Clonar o repositório e configurar variáveis
git clone https://github.com/gabrielolvrz/Abductor.git
cd Abductor
cp .env.example .env

# 2. Iniciar os containers (Postgres 16 + Scraper Go)
docker compose up -d

# 3. Lançar a aplicação (Backend + Frontend + Abertura do Cockpit)
chmod +x abductor.sh
./abductor.sh
```

O cockpit estará disponível em **`http://localhost:3000`** e a API em **`http://localhost:8000`** (documentação interativa em `/docs`).

<details>
<summary><b>Execução Manual (Terminais Separados)</b></summary>

Se preferir rodar os servidores explicitamente sem o script launcher:

```bash
# Terminal 1 — Infraestrutura
docker compose up -d

# Terminal 2 — Backend FastAPI
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 — Frontend React/Vite
cd frontend
npm install
npm run dev
```

> **Dica para usuários de Btrfs (Arch Linux):** Para evitar fragmentação e degradação de I/O nos bancos, aplique o atributo NoCoW nas pastas de dados antes da primeira execução:
> ```bash
> mkdir -p data/postgres data/gosom && sudo chattr +C data/postgres data/gosom 2>/dev/null || true
> ```
</details>

---

## Arquitetura & Fluxo Operacional

```mermaid
flowchart LR
    UI["Cockpit Tático<br/>(React + Vite :3000)"] -->|"REST /api"| API["Backend FastAPI<br/>(Python 3.12 :8000)"]
    API -->|"Cache-First"| DB[("PostgreSQL 16<br/>(:5432)")]
    API -->|"Dispara Job & Baixa CSV"| GOSOM["gosom Scraper (Go)<br/>(:8080)"]
    GOSOM --> GMAPS[("Google Maps")]
    API -->|"GET Stream Concorrente (Semáforo)"| WEB["Sites dos Leads"]
    API -->|"Upsert Preservativo"| DB
    UI -.->|"site.config.json"| TPL["Templates Turnkey<br/>(Vercel Estático)"]
```

O ciclo de uma busca opera em **4 fases contínuas**:

1. **`SCRAPING`:** O operador submete nicho, cidade e bairro. O backend consulta o PostgreSQL (**Cache-First**). Se não houver cache recente, despacha o job para o container `gosom` e inicia polling assíncrono.
2. **`PARSING`:** O CSV retornado é processado em memória via `csv.DictReader`. Entidades institucionais incompatíveis com vendas (*Defensoria, OAB, Fórum, Tribunal, Sindicato*) são descartadas imediatamente.
3. **`VALIDATING`:** Um pool concorrente (`httpx.AsyncClient` com semáforo de 30 conexões) checa a URL cadastrada. Se o domínio estiver na blocklist de agregadores (*Linktree, Instagram, wa.me, etc.*) ou redirecionar para eles, classifica como `IMPROVISADO`.
4. **`SCORING`:** O motor calcula a pontuação (0 a 100). Leads com site convencional ativo recebem score `0` imediato (**Hard Gate**). Leads promissores têm o telefone sanitizado e são gravados no banco.

---

## Motor de Lead Scoring

A nota de oportunidade reflete a viabilidade do fechamento imediato:

| Dimensão | Condição Avaliada | Pontuação |
| :--- | :--- | :---: |
| **Presença Web** | `IMPROVISADO` (Linktree, Beacons, Instagram, WhatsApp cru) | **+30 pts** |
| | `QUEBRADO` (Erro de conexão, timeout, HTTP 404 ou 5xx) | **+25 pts** |
| | `SEM_SITE` (Ficha sem link cadastrado no Maps) | **+15 pts** |
| **Contato** | Celular nacional verificado via `phonenumbers` (`MOBILE`) | **+20 pts** |
| | Telefone fixo válido (`LANDLINE`) | **0 pts** |
| | Telefone inválido, 0800 ou ausente (`INVALID`, `NONE`) | **−30 pts** |
| **Reviews — Grupo 1**<br/>*(Advocacia, Odonto, Saúde, Imobiliário)* | ≥ 15 avaliações públicas | **+25 pts** |
| | 5 a 14 avaliações públicas | **+15 pts** |
| | < 5 avaliações | **0 pts** |
| **Reviews — Grupo 2**<br/>*(Pet Shop, Serviços Gerais, Barbearias)* | ≥ 40 avaliações públicas | **+25 pts** |
| | 15 a 39 avaliações públicas | **+15 pts** |
| | < 15 avaliações | **0 pts** |
| **Reputação Física** | Rating 4.5 a 5.0 estrelas | **+15 pts** |
| | Rating 4.0 a 4.4 estrelas | **+5 pts** |
| | Rating < 4.0 estrelas (com avaliações) | **−10 pts** |
| **Ficha Reivindicada** | `is_claimed = true` no Google Meu Negócio | **+10 pts** |

> 🚨 **Regra do Hard Gate Inegociável:** Se `website_status == 'ATIVO'`, o score é travado em **0 absoluto**. O Abductor não perde tempo prospectando negócios que já possuem sites convencionais estruturados.

---

## Módulos do Cockpit Tático

A interface adota a estética *"Cockpit Tático de Alta Precisão"* (tons escuros de carbono `#0c0a09` / `#141210`, micro-bordas de 1px e tipografia Inter + JetBrains Mono):

| Rota | Tela | Responsabilidade Operacional |
| :--- | :--- | :--- |
| **`/`** | **Bancada de Prospecção** | Disparo de buscas com telemetria ao vivo, alternador de visualização (`Grade` vs. `Tabela`), filtros por score/diagnóstico, gaveta lateral de edição e gerador de instância Turnkey. |
| **`/pipeline`** | **Kanban CRM** | Acompanhamento comercial: `CONTATADO` ➔ `RESPONDEU` ➔ `NEGOCIANDO` ➔ `FECHADO` / `RECUSADO`, alertas de SLA de 48h sem contato e edição inline de valores de contrato. |
| **`/abordagens`** | **Biblioteca de Roteiros** | Catálogo de scripts de pitch e contra-ataques segmentados por nicho, com interpolação de variáveis em runtime e cópia em 1 clique. |
| **`/playbook`** | **Playbook & Negociação** | Matriz de quebra de objeções, tabela oficial de preços editável e checklists operacionais persistentes (*WhatsApp, Reunião, Entrega*). |
| **`/anotacoes`** | **Caderno de Operação** | Backlog interno para anotações rápidas de nichos, copy e follow-ups, com tags (`IDEIA`, `LEMBRETE`, `BUG`) e sincronização local contínua. |

---

## Esteira Turnkey de Entrega (15 Minutos)

Os sites vitrine são estáticos, ultra-leves, sem frameworks pesados no cliente e com SEO local agressivo:

- **`templates/vercel-advocacia/`**: Para escritórios e advogados. Design sóbrio, conformidade ética com o Provimento 205/2021 da OAB e página nativa de Política de Privacidade LGPD.
- **`templates/vercel-petshop/`**: Para clínicas veterinárias e pet shops. Bento-grid adaptável aos 4 pilares do negócio (*Banho & Tosa, Clínica Veterinária, Pet Shop, Hotelzinho/Daycare*) e banner de Táxi Dog.

### Fluxo de Publicação de uma Instância

```bash
# 1. Navegar até o template da vertical
cd templates/vercel-advocacia

# 2. Duplicar o molde base para a pasta isolada do cliente
cp -r base clientes/advocacia_silva_santos
cd clientes/advocacia_silva_santos

# 3. Mover o site.config.json baixado no Cockpit do Abductor
cp ~/Downloads/site.config.json ./site.config.json

# 4. Validar localmente (opcional)
python -m http.server 5000

# 5. Publicar em produção na Vercel
npx vercel --prod --yes
```

> **Privacidade Garantida:** As pastas `templates/*/clientes/*` estão incluídas no `.gitignore`. Dados, fotos e configurações dos seus clientes nunca sobem para o repositório Git.

---

## Variáveis de Ambiente

As configurações principais residem no `.env` da raiz:

| Variável | Padrão | Finalidade |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres123@localhost:5432/abductor_db` | String de conexão assíncrona SQLAlchemy/asyncpg. |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `postgres123` | Credenciais do container PostgreSQL 16. |
| `DB_NAME` | `abductor_db` | Nome da base de dados relacional. |
| `GOSOM_API_URL` | `http://localhost:8080` | Endpoint REST do scraper Go. |
| `CORS_ORIGINS` | `http://localhost:3000` | Origens autorizadas pelo FastAPI. |
| `VALIDATOR_MAX_CONCURRENCY` | `30` | Semáforo de requisições simultâneas de checagem de URLs. |
| `VALIDATOR_TIMEOUT_SECONDS` | `4.0` | Timeout total por requisição de validação HTTP. |
| `JOB_TIMEOUT_SECONDS` | `180` | Limite de tolerância do scraper e gatilho do Watchdog Passivo. |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Base URL consumida pelo cliente Axios/Vite no frontend. |

---

## Testes & Qualidade de Código

A suite de testes do backend é autocontida e roda isolada em memória:

```bash
# Backend (Ambiente Virtual ativo)
cd backend
pytest -v                      # 44 testes unitários de regras, scoring e API
python -m mypy app/            # Checagem estrita de tipos estáticos
python -m ruff check app/      # Linter e formatação Python

# Frontend
cd frontend
npx tsc --noEmit               # Verificação rigorosa de tipagem TypeScript
npm run lint                   # Linter ESLint
npm run build                  # Build de produção do Vite
```

---

## Documentação Técnica do Repositório

Para aprofundamento nos contratos de engenharia e regras de negócio, consulte a pasta `docs/`:

- [00 — Central de Controle (MOC)](docs/00%20-%20MOC%20-%20Central%20de%20Controle.md)
- [01 — Visão de Produto & ICP](docs/01%20-%20PRD%20-%20Visao%20de%20Produto.md)
- [02 — Requisitos do Sistema & Scoring](docs/02%20-%20SRS%20-%20Requisitos%20do%20Sistema.md)
- [03 — Arquitetura e Engenharia](docs/03%20-%20SDD%20-%20Arquitetura%20e%20Engenharia.md)
- [04 — Modelagem de Dados & DDL](docs/04%20-%20DATA%20-%20Modelagem%20e%20Banco.md)
- [05 — Decisões de Arquitetura (ADRs)](docs/05%20-%20ADR%20-%20Decisoes%20de%20Arquitetura.md)
- [06 — Playbook Comercial & Scripts](docs/06%20-%20PLAYBOOK%20-%20Abordagens%20e%20Vendas.md)
- [07 — Verticais & Boilerplates](docs/07%20-%20TEMPLATES%20-%20Verticais%20e%20Boilerplates.md)
- [08 — Setup do Host Arch Linux](docs/08%20-%20RUNBOOK%20-%20Setup%20da%20Maquina.md)
- [09 — Checklist de Execução & Tarefas](docs/09%20-%20TASKS%20-%20Checklist%20de%20Execucao.md)

Diretrizes de desenvolvimento para assistentes e agentes autônomos estão consolidadas no [AGENTS.md](AGENTS.md). Especificações de design visual encontram-se no [DESIGN.md](DESIGN.md) e [PRODUCT.md](PRODUCT.md).

---

## Licença

Desenvolvido por **[Gabriel Oliveira](https://github.com/gabrielolvrz)**. Projeto de uso pessoal e fechamento comercial local. Todos os direitos reservados.
