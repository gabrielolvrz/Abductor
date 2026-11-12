# 🛸 AGENTS.md — Protocolo Operacional e Engenharia do Abductor

> Diretriz mestra para agentes autônomos de desenvolvimento via terminal (OpenCode, Google Antigravity CLAI, Claude Code).
> Válido universalmente para motores de inferência **DeepSeek v1**, **Gemini** e **Grok**.
> Este repositório contém documentação exaustiva e vinculante em `docs/` (`00` a `09`). Toda alteração de código DEVE respeitar os contratos estabelecidos.

---

## 1. Visão Geral do Sistema & Stack Tecnológico

O **Abductor** é uma plataforma local de inteligência de prospecção e fechamento rápido de **Sites Vitrine One-Page perenes (Turnkey Institucional)** com **blindagem LGPD nativa inclusa** (ticket de R$ 300 a R$ 850). Ele extrai leads do Google Maps, filtra profissionais liberais com alta reputação física e presença digital amadora (Linktree, WhatsApp cru ou sem site), executa validação concorrente de URLs, calcula Lead Scoring (0 a 100 com Hard Gate) e entrega o lead pronto no cockpit para abordagem via WhatsApp em 1 clique.

### 1.1. Arquitetura Híbrida (ADR 003)

- **Host Nativo (Arch Linux via `mise`):**
  - **Backend:** FastAPI + Python 3.12 (porta `8000`).
  - **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS (porta `3000`).
- **Docker Containers (Isolamento de Infra):**
  - **Banco Relacional:** PostgreSQL 16 Alpine (porta `5432`).
  - **Scraper Autônomo:** `gosom/google-maps-scraper:latest` em Go (porta `8080`).

### 1.2. Mapeamento de Diretórios

```text
/home/gabrielolvr/Projects/personal/Abductor/
├── AGENTS.md                    # Este arquivo (regra universal de contexto)
├── docker-compose.yml           # Infraestrutura Docker (Postgres + gosom)
├── .env                         # Variáveis de ambiente locais (NUNCA commitar)
├── data/
│   ├── postgres/                # Volume local NoCoW (+C) do PostgreSQL 16
│   └── gosom/                   # Volume local NoCoW (+C) do scraper Go
├── docs/                        # Fonte da verdade das regras (00 a 09)
├── backend/                     # API FastAPI (Python 3.12 via mise)
│   ├── app/
│   │   ├── core/                # Configurações e conexão assíncrona SQLAlchemy
│   │   ├── engines/             # Lógica pura: scorer, sanitizer, validator, cleaner
│   │   ├── models/ & schemas/   # ORM SQLAlchemy e DTOs Pydantic
│   │   ├── routers/             # Endpoints: searches, leads, scripts
│   │   └── services/            # Ingestion pipeline, gosom client, job runner
│   └── init.sql                 # DDL de inicialização do banco
├── frontend/                    # SPA Cockpit (Vite + React + TS + Tailwind)
│   └── src/
│       ├── components/          # SearchForm, JobProgress, LeadCard, PitchModal
│       ├── pages/               # Dashboard (/), Pitches (/abordagens), Playbook (/playbook)
│       └── services/            # Cliente Axios / TanStack Query
└── templates/                   # Boilerplates estáticos de Sites Vitrine
    └── vercel-advocacia/        # Esteira Turnkey de Advocacia (base/ + clientes/)
        ├── base/                # Molde mestre estático (index.html, site.config.json, privacidade.html)
        └── clientes/            # Instâncias personalizadas de clientes (.gitignore)

```

---

## 2. Matriz de Permissões e Modos de Operação

| Ação                         | Nível de Permissão | Regras e Limites                                                                                                      |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Leitura (Read-Only)**      | 🟢 Livre           | Leitura irrestrita de código, configurações, schemas e `docs/`. Sempre leia antes de alterar.                         |
| **Edição (Write/Patch)**     | 🟡 Condicional     | Modifique apenas arquivos estritamente relacionados à tarefa. Gere diffs mínimos. Não refatore código não solicitado. |
| **Comandos de Teste/Lint**   | 🟢 Livre           | Execução de linters, checagens de tipos, migrações e suites de testes unitários.                                      |
| **Gerenciamento de Pacotes** | 🟠 Controlado      | Proibido adicionar bibliotecas pesadas sem justificativa alinhada ao `08 - RUNBOOK`.                                  |
| **Comandos Destrutivos**     | 🔴 PROIBIDO        | `git reset --hard`, `git push --force`, `rm -rf`, `docker compose down -v` (sem autorização explícita).               |

---

## 3. Guardrails Inegociáveis (O Que NUNCA Fazer)

1. **NÃO use Celery, Redis ou filas externas:** A execução assíncrona do backend é estritamente **in-process via `asyncio.create_task` com Watchdog Passivo** de timeout configurável em `JOB_TIMEOUT_SECONDS` (padrão: 180s, conforme **ADR 010**).
2. **NÃO use Selenium, Puppeteer ou Playwright no backend:** A extração do Google Maps é delegada 100% para o container do `gosom` via REST na porta `8080` (conforme **ADR 002**).
3. **NÃO viole o NoCoW no Btrfs:** As pastas `data/postgres` e `data/gosom` exigem o atributo `+C` (`chattr +C`) para evitar fragmentação e degradação de I/O (**ADR 007** e **04 - DATA**).
4. **NÃO quebre o Hard Gate de Lead Scoring:** Se `website_status == 'ATIVO'`, o `score` DEVE ser forçado a `0` absoluto. Nunca pontue negócios com sites convencionais ativos (**ADR 008** e **02 - SRS**).
5. **NÃO sobrescreva dados do mini-CRM no Scraping:** O `ON CONFLICT (place_id) DO UPDATE` da tabela `leads` JAMAIS pode alterar `pipeline_status` ou `notes`. Telefones só são atualizados com `COALESCE(NULLIF(leads.phone_raw, ''), EXCLUDED.phone_raw)` para preservar edições manuais (**ADR 001** e **04 - DATA**).
6. **NÃO use HTTP HEAD para checagem de URLs:** Use `httpx.AsyncClient` com `GET` e `stream=True` (lê apenas headers e aborta o body) com injeção de User-Agent desktop para evitar falsos positivos de CDN/Cloudflare (**ADR 004** e **03 - SDD**).
7. **NÃO classifique 401/403 como quebrado:** Sites com códigos HTTP `401` ou `403` são protegidos por WAF e devem ser marcados como `ATIVO` (Hard Gate ativado).
8. **NÃO comite arquivos sensíveis:** Arquivos `.env`, pastas de dados `data/` e ambientes `.venv/` ou `node_modules/` devem permanecer no `.gitignore`.
9. **NÃO mutile o nome do estabelecimento no banco de dados:** `leads.name` recebe o nome original integral do Maps (necessário para o Google Dork). A função `clean_business_name` (remoção de `LTDA`, `ME`, `S/S`) é executada **exclusivamente em runtime** durante a interpolação de scripts e na exportação do `site.config.json` (**03 - SDD**).

---

## 4. Comandos Operacionais Exatos (Cheatsheet do Host)

Sempre use os comandos canônicos abaixo para validar o repositório no Arch Linux:

### 4.1. Infraestrutura Docker

```bash
# Iniciar infraestrutura essencial
docker compose up -d

# Checar saúde dos serviços (Postgres na 5432, gosom na 8080)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar logs do scraper Go em caso de falha de coleta
docker logs -f abductor_gosom

# Backup rápido do banco
docker exec -t abductor_postgres pg_dump -U postgres -d abductor_db > ./data/backup_local.sql

```

### 4.2. Backend (FastAPI + Python 3.12)

```bash
cd /home/gabrielolvr/Projects/personal/Abductor/backend

# Ativar ambiente virtual local
source .venv/bin/activate

# Executar servidor local de desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Checagem de tipagem estática e lint
python -m mypy app/
python -m ruff check app/

# Execução de testes unitários isolados
pytest -v tests/

```

### 4.3. Frontend (Vite + React + TS)

```bash
cd /home/gabrielolvr/Projects/personal/Abductor/frontend

# Rodar servidor de desenvolvimento (porta 3000 fixada)
npm run dev

# Checagem obrigatória de tipos TypeScript
npx tsc --noEmit

# Validação de Lint
npm run lint

# Build de produção
npm run build

```

---

## 5. Especificações Técnicas de Motores & Contratos de Dados

### 5.1. Motor de Validação Web (`backend/app/engines/validator.py`)

- **Blocklist Estrita de Agregadores:** `linktr.ee`, `beacons.ai`, `instabio.cc`, `heylink.me`, `wa.me`, `api.whatsapp.com`, `instagram.com`, `facebook.com`, `doctoralia.com.br`, `jusbrasil.com.br`, `canva.site`, `guiamais.com.br`. Se identificado no domínio ou na URL pós-redirecionamento (`response.url`) ➔ `website_status = 'IMPROVISADO'` (+30 pts).
- **Parâmetros de Conexão:** Timeout total de 4.0s (connect 3.0s), `follow_redirects=True`, semáforo concorrente `asyncio.Semaphore(30)`, pool único de cliente `httpx.AsyncClient`.
- **Resolução de Status:**
- Vazio / Nulo ➔ `SEM_SITE` (+15 pts).
- `ConnectError`, `Timeout`, HTTP `404`, `5xx` ➔ `QUEBRADO` (+25 pts).
- HTTP `200`, `401`, `403` ➔ `ATIVO` (Score forçado a 0).

### 5.2. Motor de Sanitização Telefônica (`backend/app/engines/sanitizer.py`)

- Utiliza a biblioteca oficial `phonenumbers` com região `BR`.
- `phone_sanitized`: DDD + número nacional puro, sem `+55` (ex.: `34998765432`).
- Se `PhoneNumberType.MOBILE`: `phone_type = 'MOBILE'`, +20 pts no score, URL `https://wa.me/55${phone_sanitized}`.
- Se `FIXED_LINE` ou `FIXED_LINE_OR_MOBILE`: `phone_type = 'LANDLINE'`, 0 pts de bônus, URL `https://wa.me/55${phone_sanitized}` permitida para testes.
- Se inválido, inexistente ou `0800`: `phone_type = 'NONE'` ou `'INVALID'`, **penalidade de -30 pts no Score**.

### 5.3. Motor Matemático de Lead Scoring (`backend/app/engines/scorer.py`)

- **Hard Gate:** `if website_status == 'ATIVO': return 0, breakdown`.
- **Pesos de Avaliações por Grupo:**
- _Grupo 1 (Alto Ticket: Advocacia, Odonto, Arquitetura, Imobiliárias):_ $\ge 15$ reviews ➔ +25 pts; $5$ a $14$ ➔ +15 pts; $<5$ ➔ 0 pts.
- _Grupo 2 (Serviços Gerais: Estética, Pet Shop, Barbearias):_ $\ge 40$ reviews ➔ +25 pts; $15$ a $39$ ➔ +15 pts; $<15$ ➔ 0 pts.

- **Reputação (Rating):** $4.5$ a $5.0$ ➔ +15 pts; $4.0$ a $4.4$ ➔ +5 pts; $<4.0$ ➔ -10 pts.
- **Ficha Reivindicada (`is_claimed`):** +10 pts.
- **Clamping Final:** `score = max(0, min(100, round(score_calculado)))`.
- Sempre persista o objeto `score_breakdown` (JSONB) para exibição em tooltip no frontend.

### 5.4. Contrato da API do Scraper `gosom` (Porta 8080)

- Endpoint de Disparo: `POST http://localhost:8080/api/v1/jobs`
- Payload obrigatório (rejeita schemas com `query` ou `max_depth`):

```json
{
  "name": "advogado_uberlandia_centro",
  "keywords": ["Advogado em Uberlândia Centro"],
  "lang": "pt-BR",
  "depth": 1,
  "email": false,
  "max_time": 180
}
```

- Download do resultado: `GET http://localhost:8080/api/v1/jobs/{id}/download` (CSV com 34 colunas, parsear com `csv.DictReader`).

### 5.5. Filtro de Ingestão e Watchdog de Timeout

- **Termos Institucionais Bloqueados:** Descarte no CSV registros contendo termos de `blocked_terms_in_name` (_Defensoria_, _OAB_, _Tribunal_, _Fórum_, _Sindicato_).
- **Watchdog Passivo na Rota de Status (`GET /api/searches/{id}/status`):**
- A rota executa apenas `SELECT`.
- Se `job_status == 'RUNNING'` e `NOW() - started_at > JOB_TIMEOUT_SECONDS * INTERVAL '1 second'` (padrão: 180s), força atualização no banco para `job_status = 'FAILED'`, `progress_phase = 'FAILED'` e destrava o frontend.

---

## 6. Protocolo Operacional para Agentes (Workflow Padrão)

Ao receber qualquer solicitação neste projeto, siga estritamente estas 4 fases:

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. EXPLORAÇÃO   │ ──► │ 2. PLANEJAMENTO │ ──► │  3. EXECUÇÃO    │ ──► │  4. VALIDAÇÃO   │
│ Inspecionar     │     │ Propor resumo   │     │ Patch atômico e │     │ Rodar testes e  │
│ contratos/docs  │     │ de 3 a 5 passos │     │ autocontido     │     │ typecheck (tsc) │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘

```

1. **Fase 1: Exploração**

- Localize os arquivos pertinentes.
- Consulte o documento correspondente em `docs/` (`02-SRS`, `03-SDD`, `04-DATA`, etc.) para verificar contratos de banco, esquemas Pydantic ou interfaces TypeScript.

2. **Fase 2: Planejamento**

- Se a alteração envolver mais de 2 arquivos ou tocar em tabelas do banco/motores de regras, apresente um plano sucinto antes de aplicar os patches.

3. **Fase 3: Execução**

- Escreva código limpo, totalmente tipado (Python type hints e TypeScript interfaces estritas).
- Sem uso de `any`, `@ts-ignore` ou `type: ignore` desnecessários.
- Preserve o tratamento de erros e os logs informativos.

4. **Fase 4: Validação no Terminal**

- Em alterações no backend: rode `python -m mypy app/` e `pytest`.
- Em alterações no frontend: rode `npx tsc --noEmit`.
- Garanta código de retorno `0` antes de declarar a tarefa concluída.

---

## 7. Instruções Específicas por Modelo de Linguagem

### 🧠 DeepSeek v1 (Raciocínio Lógico & Causalidade)

- **Comportamento Esperado:** Raciocínio dedutivo refinado em algoritmos puros (`scorer.py`, `sanitizer.py`, queries SQL).
- **Atenção:** Não entre em loops de especulação teórica. Se uma regra já estiver definida no `02 - SRS` ou `04 - DATA`, aplique-a literalmente. Foque na conformidade exata dos tipos e constraints do PostgreSQL.

### ⚡ Gemini 3.8 / 1.5 / 2.0 (Janela Ampla & Contextualização)

- **Comportamento Esperado:** Compreensão sistêmica de todo o repositório e contratos ponta-a-ponta (do CSV do `gosom` ao card no React).
- **Atenção:** Não altere arquivos fora do escopo da solicitação. Mantenha os diffs cirúrgicos. Nunca remova seções de documentação existente ou simplifique validações robustas.

### 🚀 Grok (Pragmatismo & Execução Direta)

- **Comportamento Esperado:** Foco prático, respostas diretas e geração de código imediatamente funcional.
- **Atenção:** Não omita blocos de código nem utilize marcações preguiçosas (como `// ... resto do código continua igual`). Forneça os arquivos ou funções completos com os imports necessários.

---

## 8. Referência Rápida aos Documentos de Design (`docs/`)

Quando precisar validar regras específicas, consulte o arquivo oficial de especificação:

- **Central de Controle & MOC:** `docs/00 - MOC - Central de Controle.md`
- **Visão de Produto & ICP:** `docs/01 - PRD - Visao de Produto.md`
- **Requisitos do Sistema & Scoring:** `docs/02 - SRS - Requisitos do Sistema.md`
- **Arquitetura & Engenharia:** `docs/03 - SDD - Arquitetura e Engenharia.md`
- **Modelagem de Dados & DDL SQL:** `docs/04 - DATA - Modelagem e Banco.md`
- **Decisões de Arquitetura (ADRs):** `docs/05 - ADR - Decisoes de Arquitetura.md`
- **Playbook Comercial & Scripts:** `docs/06 - PLAYBOOK - Abordagens e Vendas.md`
- **Verticais & Boilerplates:** `docs/07 - TEMPLATES - Verticais e Boilerplates.md`
- **Setup do Host Arch Linux:** `docs/08 - RUNBOOK - Setup da Maquina.md`
- **Checklist de Execução & Tarefas:** `docs/09 - TASKS - Checklist de Execucao.md`
