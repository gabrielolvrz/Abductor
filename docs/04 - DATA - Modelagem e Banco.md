---
title: Abductor - Modelagem de Dados e Persistência (DATA)
project: Abductor
type: data
tags:
  - data
  - postgresql
  - sql
  - modelagem
  - btrfs
  - backend
created: 2026-10-22
status: aprovado
---

# 💾 04 - DATA — Modelagem de Dados e Persistência

> Especificação física de banco de dados, dicionário de dados, DDL executável para PostgreSQL 16 e comandos de infraestrutura de armazenamento no host Arch Linux (sistema de arquivos Btrfs).

---

## 1. Estratégia de Armazenamento & Host Arch Linux

O banco de dados do **Abductor** roda conteinerizado em **PostgreSQL 16 Alpine**, com persistência mapeada em volume de diretório local (`./data/postgres`). 

### 1.1. Mitigação Obrigatória do Btrfs (Desativação de CoW)
O sistema de arquivos Btrfs utiliza Copy-on-Write por padrão. Quando um banco relacional grava transações em blocos de 8 KB com CoW ativo, ocorrem três problemas graves:
1. **Fragmentação de blocos:** Queda contínua de IOPS de leitura e escrita.
2. **Amplificação de escrita:** O Btrfs duplica metadados e blocos a cada `UPDATE` no PostgreSQL.
3. **Degradação de performance do NVMe/SSD:** Desgaste desnecessário de células de memória.

Para anular esses problemas, o diretório precisa ser criado e receber o atributo **NoCoW (`+C`)** antes do primeiro `docker compose up`:

```bash
# Executar na raiz do repositório abductor/
mkdir -p ./data/postgres ./data/gosom
chattr +C ./data/postgres
chattr +C ./data/gosom

# Verificação: a saída DEVE exibir a letra 'C'
lsattr -d ./data/postgres
```

> [!NOTE]
> 
> O atributo `+C` afeta apenas os arquivos criados **depois** da sua aplicação. Se você já subiu o container antes de rodar o comando, apague a pasta `./data/postgres`, aplique o `chattr +C` e suba novamente.
> 
>   

## 2. Diagrama Entidade-Relacionamento (ERD)

A modelagem resolve a assimetria entre pesquisas geográficas temporais e estabelecimentos físicos reais por meio da tabela associativa `search_leads`:

  

Plaintext

```
  ┌─────────────────────────┐                 ┌───────────────────────────┐
  │        searches         │                 │           leads           │
  ├─────────────────────────┤                 ├───────────────────────────┤
  │ PK  id                  │                 │ PK  id                    │
  │     category            │                 │ U   place_id              │
  │     city                │                 │     name                  │
  │     neighborhood        │                 │     phone_sanitized       │
  │     gosom_job_id        │                 │     website_status        │
  │     job_status          │                 │     score                 │
  │     last_scraped_at     │                 │     score_breakdown       │
  └────────────┬────────────┘                 │     pipeline_status       │
               │ 1                            └─────────────┬─────────────┘
               │                                            │ 1
               │ N                                          │
        ┌──────▼────────────────────────────────────────────▼─────┐
        │                      search_leads                       │
        ├─────────────────────────────────────────────────────────┤
        │ PK, FK1  search_id                                      │
        │ PK, FK2  lead_id                                        │
        │          found_at                                       │
        └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────┐
  │      pitch_scripts      │
  ├─────────────────────────┤
  │ PK  id                  │
  │     category            │
  │     website_condition   │
  │     title               │
  │     message_template    │
  │     upsell_focus        │
  └─────────────────────────┘
```

## 3. DDL SQL Completo (PostgreSQL 16)

Script limpo e determinístico para inicialização da base de dados (`init.sql`):

  

SQL

```sql
-- UUID nativo do PostgreSQL 13+ via gen_random_uuid(); nenhuma extensão é necessária para os IDs.
-- A extensão citext é usada apenas para comparação case-insensitive dos parâmetros de busca.
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. TABELA: searches (Histórico de Buscas e Controle de Jobs de Scraping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category CITEXT NOT NULL,
    city CITEXT NOT NULL,
    neighborhood CITEXT NOT NULL DEFAULT '',
    gosom_job_id VARCHAR(100),
    job_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    progress_phase VARCHAR(30) NOT NULL DEFAULT 'IDLE',
    total_leads INTEGER NOT NULL DEFAULT 0,
    last_scraped_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- A aplicação normaliza com strip + remoção de acentos antes do INSERT.
    -- CITEXT cobre variações apenas de caixa (Uberlândia vs uberlândia).
    -- Impede buscas redundantes idênticas e viabiliza busca exata em cache
    CONSTRAINT uq_searches_query UNIQUE (category, city, neighborhood),
    
    -- Restrição de estados permitidos do ciclo do job
    CONSTRAINT chk_searches_status CHECK (
        job_status IN ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED')
    ),
    CONSTRAINT chk_searches_progress_phase CHECK (
        progress_phase IN ('IDLE', 'SCRAPING', 'PARSING', 'VALIDATING', 'SCORING', 'COMPLETED', 'FAILED')
    )
);

-- ============================================================================
-- 2. TABELA: leads (Entidade Única Global de Estabelecimento / Profissional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    address TEXT,
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    phone_raw VARCHAR(50),
    phone_sanitized VARCHAR(20),
    phone_type VARCHAR(15) NOT NULL DEFAULT 'UNKNOWN',
    whatsapp_url TEXT,
    google_maps_url TEXT,
    website_url TEXT,
    website_status VARCHAR(30) NOT NULL DEFAULT 'SEM_SITE',
    website_http_code INTEGER DEFAULT 0,
    instagram_url TEXT,
    linkedin_url TEXT,
    rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER NOT NULL DEFAULT 0,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    pipeline_status VARCHAR(30) NOT NULL DEFAULT 'NOVO',
    notes TEXT,
    created_manually BOOLEAN NOT NULL DEFAULT FALSE,
    is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
    last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints de validação de domínio
    CONSTRAINT chk_leads_phone_type CHECK (
        phone_type IN ('MOBILE', 'LANDLINE', 'INVALID', 'NONE', 'UNKNOWN')
    ),
    CONSTRAINT chk_leads_website_status CHECK (
        website_status IN ('SEM_SITE', 'IMPROVISADO', 'QUEBRADO', 'ATIVO')
    ),
    CONSTRAINT chk_leads_pipeline_status CHECK (
        pipeline_status IN ('NOVO', 'CONTATADO', 'RESPONDEU', 'NEGOCIANDO', 'FECHADO', 'RECUSADO')
    ),
    CONSTRAINT chk_leads_score_range CHECK (
        score >= 0 AND score <= 100
    )
);

-- ============================================================================
-- 3. TABELA: search_leads (Pivô N:N com Timestamp de Ocorrência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_leads (
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    found_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (search_id, lead_id)
);

-- ============================================================================
-- 4. TABELA: pitch_scripts (Roteiros de Abordagem Contextuais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pitch_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category CITEXT NOT NULL,
    website_condition VARCHAR(30) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message_template TEXT NOT NULL,
    upsell_focus VARCHAR(50) NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pitch_condition CHECK (
        website_condition IN ('SEM_SITE', 'IMPROVISADO', 'QUEBRADO', 'GERAL')
    ),
    CONSTRAINT chk_pitch_upsell CHECK (
        upsell_focus IN ('NONE', 'GMB', 'ADS', 'COMBO')
    ),
    CONSTRAINT uq_pitch_scripts_category_condition_title UNIQUE (
        category, website_condition, title
    )
);

-- ============================================================================
-- 5. TABELA: niches (Gestão Centralizada de Categorias / Verticais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CITEXT NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. TABELA: system_notes (Backlog e Bloco de Notas Interno do Operador)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tag VARCHAR(50) DEFAULT 'IDEIA',
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE (Otimização para Frontend Reativo)
-- ============================================================================

-- Listagem ordenada por oportunidade (maior pontuação no topo)
CREATE INDEX IF NOT EXISTS idx_leads_score_desc ON leads(score DESC);

-- Filtro dinâmico por status do funil de vendas (ex: Ocultar 'CONTATADO')
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON leads(pipeline_status);

-- Filtro dinâmico por diagnóstico web (ex: Apenas 'IMPROVISADO' e 'SEM_SITE')
CREATE INDEX IF NOT EXISTS idx_leads_website_status ON leads(website_status);

-- Verificação rápida de duplicidade ou compartilhamento de número de telefone
CREATE INDEX IF NOT EXISTS idx_leads_phone_sanitized ON leads(phone_sanitized) WHERE phone_sanitized IS NOT NULL;

-- Otimização do JOIN no carregamento do dashboard por busca ativa
-- Nota: idx_search_leads_search_id foi descartado por ser 100% redundante com o prefixo da PK composta (search_id, lead_id).
CREATE INDEX IF NOT EXISTS idx_search_leads_lead_id ON search_leads(lead_id);
```

> [!IMPORTANT]
> **Cache-First sem duplicatas:** antes de inserir ou consultar `searches`, o backend aplica `strip()`, `casefold()` e remoção de acentos em `category`, `city` e `neighborhood`. As colunas `CITEXT` cobrem variações de caixa; a normalização no Python cobre acentos e espaços. Assim, `"Uberlândia"`, `"uberlandia"` e `"Uberlândia "` resolvem para a mesma busca.

## 4. Dicionário de Dados Detalhado

### 4.1. Tabela `searches`

Armazena parâmetros de consulta e estado da fila de jobs do scraper.

  

|**Coluna**|**Tipo**|**Nulo?**|**Padrão**|**Descrição**|
|---|---|---|---|---|
|`id`|`UUID`|Não|`gen_random_uuid()`|Chave primária única.|
|`category`|`CITEXT`|Não|-|Nicho pesquisado (ex: `Advogado`, `Dentista`), normalizado pela aplicação.|
|`city`|`CITEXT`|Não|-|Cidade consultada (obrigatória), normalizada pela aplicação.|
|`neighborhood`|`CITEXT`|Não|`''`|Bairro (vazio para busca na cidade inteira), normalizado pela aplicação.|
|`gosom_job_id`|`VARCHAR(100)`|Sim|`NULL`|ID retornado pela API REST do container `gosom`.|
|`job_status`|`VARCHAR(20)`|Não|`'PENDING'`|Estado do job: `PENDING`, `RUNNING`, `COMPLETED`, `PARTIAL`, `FAILED`.|
|`progress_phase`|`VARCHAR(30)`|Não|`'IDLE'`|Fase em tempo real: `IDLE`, `SCRAPING`, `PARSING`, `VALIDATING`, `SCORING`, `COMPLETED`, `FAILED`.|
|`total_leads`|`INTEGER`|Não|`0`|Quantidade total de estabelecimentos vinculados; recalculado ao fim de cada ingestão com `SELECT COUNT(*) FROM search_leads WHERE search_id = :id`.|
|`last_scraped_at`|`TIMESTAMPTZ`|Sim|`NULL`|Timestamp da finalização da última raspagem com sucesso.|
|`started_at`|`TIMESTAMPTZ`|Não|`NOW()`|Timestamp de início do último ciclo de execução do job (usado pelo watchdog passivo de timeout).|
|`created_at`|`TIMESTAMPTZ`|Não|`NOW()`|Data/hora de registro da primeira pesquisa.|

### 4.2. Tabela `leads`

Registro único do estabelecimento ou autônomo. Preserva o histórico comercial mesmo após múltiplas buscas.

  

|**Coluna**|**Tipo**|**Nulo?**|**Padrão**|**Descrição**|
|---|---|---|---|---|
|`id`|`UUID`|Não|`gen_random_uuid()`|Chave primária única.|
|`place_id`|`VARCHAR(255)`|Não|-|Identificador único estável do Google Maps (`Chave Única`).|
|`name`|`VARCHAR(255)`|Não|-|Razão social ou nome fantasia no Maps.|
|`category`|`VARCHAR(100)`|Sim|`NULL`|Categoria primária identificada no Maps.|
|`address`|`TEXT`|Sim|`NULL`|Endereço físico completo extraído.|
|`neighborhood`|`VARCHAR(100)`|Sim|`NULL`|Bairro extraído do endereço.|
|`city`|`VARCHAR(100)`|Sim|`NULL`|Cidade extraída do endereço.|
|`phone_raw`|`VARCHAR(50)`|Sim|`NULL`|String do telefone exatamente como veio do Maps.|
|`phone_sanitized`|`VARCHAR(20)`|Sim|`NULL`|DDD + número nacional, apenas dígitos e sem `+55` (ex.: `34998765432`). A URL `wa.me` prefixa `55`.|
|`phone_type`|`VARCHAR(15)`|Não|`'UNKNOWN'`|Classificação: `MOBILE`, `LANDLINE`, `INVALID`, `NONE`.|
|`whatsapp_url`|`TEXT`|Sim|`NULL`|Link formatado: `https://wa.me/55...`.|
|`google_maps_url`|`TEXT`|Sim|`NULL`|URL direta para abrir a ficha no Google Maps.|
|`website_url`|`TEXT`|Sim|`NULL`|String original informada no campo de site.|
|`website_status`|`VARCHAR(30)`|Não|`'SEM_SITE'`|Diagnóstico: `SEM_SITE`, `IMPROVISADO`, `QUEBRADO`, `ATIVO`.|
|`website_http_code`|`INTEGER`|Sim|`0`|Código HTTP retornado na checagem assíncrona (200, 404, 500).|
|`instagram_url`|`TEXT`|Sim|`NULL`|Perfil do Instagram (preenchido manual ou via dork).|
|`linkedin_url`|`TEXT`|Sim|`NULL`|Link do LinkedIn se identificado.|
|`rating`|`NUMERIC(2,1)`|Não|`0.0`|Nota média de avaliações (ex: `4.9`).|
|`reviews_count`|`INTEGER`|Não|`0`|Quantidade total de avaliações recebidas.|
|`is_claimed`|`BOOLEAN`|Não|`FALSE`|`TRUE` se a ficha foi verificada pelo dono no Google. No CSV do `gosom`, derive de `owner` quando preenchido; se o campo não vier explícito, preserve o valor já conhecido (`leads.is_claimed OR EXCLUDED.is_claimed`).|
|`score`|`INTEGER`|Não|`0`|Pontuação final calculada (0 a 100 com Hard Gate).|
|`score_breakdown`|`JSONB`|Não|`'{}'`|JSON com o detalhamento dos pontos para o tooltip na UI.|
|`pipeline_status`|`VARCHAR(30)`|Não|`'NOVO'`|Etapa comercial: `NOVO`, `CONTATADO`, `RESPONDEU`, `NEGOCIANDO`, `FECHADO`, `RECUSADO`.|
|`notes`|`TEXT`|Sim|`NULL`|Anotações livres sobre a negociação.|
|`created_manually`|`BOOLEAN`|Não|`FALSE`|`TRUE` se inserido pelo botão de cadastro avulso na UI.|
|`is_manually_edited`|`BOOLEAN`|Não|`FALSE`|`TRUE` quando o operador força override manual (`website_status`, telefone ou reviews), blindando o registro contra sobrescrita de novos scrapings.|
|`last_status_change_at`|`TIMESTAMPTZ`|Não|`NOW()`|Timestamp da última mudança em `pipeline_status` (alimenta o cálculo de SLA/inatividade `days_in_status` no Kanban `/pipeline`).|
|`first_seen_at`|`TIMESTAMPTZ`|Não|`NOW()`|Data/hora em que entrou no banco pela primeira vez.|
|`last_checked_at`|`TIMESTAMPTZ`|Não|`NOW()`|Data/hora da última validação de dados/score.|

### 4.3. Tabelas `niches` e `system_notes`

- **`niches`:** Catálogo centralizado de verticais (`id`, `name CITEXT UNIQUE`, `slug VARCHAR(100) UNIQUE`, `created_at`) para evitar duplicatas de digitação nas buscas e nos playbooks.
- **`system_notes`:** Bloco de notas e backlog operacional interno (`id`, `title`, `content`, `tag` [`'IDEIA'`, `'BUG'`, `'LEMBRETE'`], `is_done`, `created_at`).

## 5. Operações SQL Críticas

### 5.1. Upsert Preservativo (Inserção/Atualização em Lote)

Executado quando o scraper termina de processar os estabelecimentos. Atualiza métricas externas sem zerar anotações do mini-CRM:

  

SQL

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
    -- Protege website_url e website_status se o operador aplicou Override Manual (is_manually_edited = TRUE)
    website_url = CASE
        WHEN leads.is_manually_edited THEN leads.website_url
        ELSE EXCLUDED.website_url
    END,
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
    last_checked_at = NOW();
    is_claimed = leads.is_claimed OR EXCLUDED.is_claimed,
    -- Enriquece telefone somente se o campo ainda estiver vazio.
    -- Se o operador editou manualmente (RF15), o valor do banco é preservado.
    phone_raw = COALESCE(NULLIF(leads.phone_raw, ''), EXCLUDED.phone_raw),
    phone_sanitized = COALESCE(NULLIF(leads.phone_sanitized, ''), EXCLUDED.phone_sanitized),
    phone_type = CASE
        WHEN NULLIF(leads.phone_sanitized, '') IS NULL THEN EXCLUDED.phone_type
        ELSE leads.phone_type
    END,
    whatsapp_url = COALESCE(NULLIF(leads.whatsapp_url, ''), EXCLUDED.whatsapp_url),
    website_status = CASE
        WHEN leads.is_manually_edited THEN leads.website_status
        ELSE EXCLUDED.website_status
    END,
    website_http_code = CASE
        WHEN leads.is_manually_edited THEN leads.website_http_code
        ELSE EXCLUDED.website_http_code
    END,
    score = CASE
        WHEN leads.is_manually_edited THEN leads.score
        ELSE EXCLUDED.score
    END,
    score_breakdown = CASE
        WHEN leads.is_manually_edited THEN leads.score_breakdown
        ELSE EXCLUDED.score_breakdown
    END,
    last_checked_at = NOW()
    -- pipeline_status, last_status_change_at, is_manually_edited e notes PERMANECEM INTACTOS
RETURNING id;
```

> [!NOTE]
> Ao final da ingestão, o contador da busca deve ser recalculado para não ficar defasado:
> ```sql
> UPDATE searches
> SET total_leads = (
>     SELECT COUNT(*) FROM search_leads WHERE search_id = :search_id
> )
> WHERE id = :search_id;
> ```

### 5.2. Consulta de Leads da Busca Ativa (Frontend Dashboard)

Consulta rápida que alimenta a listagem principal, já trazendo status e dados calculados:

  

```sql
SELECT 
    l.id,
    l.place_id,
    l.name,
    l.category,
    l.address,
    l.neighborhood,
    l.city,
    l.phone_sanitized,
    l.phone_type,
    l.whatsapp_url,
    l.google_maps_url,
    l.website_url,
    l.website_status,
    l.instagram_url,
    l.rating,
    l.reviews_count,
    l.is_claimed,
    l.score,
    l.score_breakdown,
    l.pipeline_status,
    l.notes,
    (
        l.phone_sanitized IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM leads l2 
            WHERE l2.phone_sanitized = l.phone_sanitized 
              AND l2.id <> l.id
        )
    ) AS is_shared_phone,
    sl.found_at
FROM leads l
INNER JOIN search_leads sl ON sl.lead_id = l.id
WHERE sl.search_id = :search_id
ORDER BY l.score DESC, l.reviews_count DESC;
```

> [!TIP]
> A subquery `EXISTS` indexada avalia a tabela global de `leads` em tempo $O(1)$ usando o índice parcial `idx_leads_phone_sanitized`. Isso garante que clínicas ou profissionais com o mesmo WhatsApp distribuídos em múltiplas buscas e bairros sejam detectados globalmente, acionando o badge amarelo no card do frontend.

## 6. Carga Inicial de Scripts de Abordagem (`seed.sql`)

Templates pré-configurados que alimentam o modal de abordagem no card do lead.

> [!IMPORTANT]
> A tabela `pitch_scripts` é a **fonte da verdade em runtime**. Os arquivos `backend/app/verticals/*/pitches.json` são apenas seeds iniciais carregados no boot. As variáveis dos templates usam exatamente os nomes das colunas de `leads`: `{name}`, `{city}`, `{rating}` e `{reviews_count}`.

  

SQL

```sql
INSERT INTO pitch_scripts (category, website_condition, title, message_template, upsell_focus) VALUES
-- 1. Advogado com Linktree / WhatsApp
(
    'Advogado',
    'IMPROVISADO',
    'Advocacia - Transição de Linktree para Site Institucional One-Page',
    'Olá, Dr(a). {name}, tudo bem? Vi o perfil do seu escritório aqui no Google Maps com {reviews_count} avaliações excelentes na região de {city}.\n\nPercebi que o link principal do perfil cai em uma página genérica de links. Para o segmento jurídico, isso dispersa clientes qualificados e transmite informalidade.\n\nEu desenvolvo Sites Institucionais One-Page perenes para advogados — estruturas elegantes, rápidas, sem mensalidades e já entregues em total conformidade com a LGPD e diretrizes éticas (com termos de privacidade e consentimento de dados nativos para proteger seu escritório contra autuações).\n\nPosso te enviar uma demonstração de 1 minuto para ver como ficaria no celular?',
    'GMB'
),
-- 2. Dentista / Clínica Odontológica sem site
(
    'Dentista',
    'SEM_SITE',
    'Odontologia - Site Vitrine Perene e Captação de Pacientes',
    'Olá, pessoal da {name}! Passando para parabenizar pela nota {rating} no Google Maps. A reputação da clínica em {city} é excelente.\n\nNotei que quando novos pacientes pesquisam pelo consultório no Google, não encontram um site oficial apresentando a estrutura, corpo clínico e tratamentos antes do contato.\n\nDesenvolvo Sites Vitrine One-Page institucionais, perenes e turnkey para clínicas odontológicas, com agendamento direto no WhatsApp da recepção e blindagem de privacidade de dados sensíveis dos pacientes (LGPD integrada).\n\nVocê teria 2 minutos para dar uma olhada em um modelo funcional que preparei para a sua área?',
    'GMB'
),
-- 3. Geral / Profissional com site quebrado (Fora do Ar)
(
    'Geral',
    'QUEBRADO',
    'Alerta Técnico/Comercial - Site Fora do Ar',
    'Olá, equipe da {name}! Estava pesquisando serviços na região de {city} e encontrei a empresa de vocês com ótimas recomendações ({reviews_count} avaliações).\n\nAo tentar abrir o site oficial cadastrado no perfil do Google para ver mais detalhes, a página apresentou erro de conexão e não carregou.\n\nComo vocês recebem acessos diários pelo Maps, resolvi avisar porque potenciais clientes acham que o negócio fechou quando o link falha. Trabalho substituindo páginas instáveis por Sites Vitrine One-Page definitivos, ultra-rápidos e protegidos contra quedas, já com termos formais de privacidade integrados. Se precisarem de apoio para restabelecer a presença digital de vocês, estou à disposição.',
    'NONE'
),
-- 4. Corretor de Imóveis com Instagram no lugar do site
(
    'Corretor de Imoveis',
    'IMPROVISADO',
    'Imobiliário - Site Vitrine Institucional e Carteira de Imóveis',
    'Olá, {name}! Vi seu trabalho no mercado imobiliário aqui em {city} e o perfil bem recomendado no Google.\n\nPercebi que o botão de site aponta para o Instagram. Redes sociais são ótimas para audiência, mas quem pesquisa no Google com intenção imediata de compra quer ver autoridade institucional, destaques da carteira e um botão seguro para falar com você.\n\nDesenvolvo Sites Vitrine One-Page turnkey para corretores de alta performance apresentarem imóveis em destaque, com proteção de dados de clientes e agendamento direto de visitas no WhatsApp.\n\nSe fizer sentido, te envio uma demonstração rápida no celular.',
    'ADS'
);
```

## 7. Rotinas de Backup e Manutenção no Host

Comandos operacionais para o dia a dia no terminal Kitty:

  

Bash

```bash
# Backup instantâneo da base de dados (Dump SQL limpo)
docker exec -t abductor_postgres pg_dump -U postgres -d abductor_db > ./data/backup_$(date +%Y%m%d_%H%M%S).sql

# Restauração a partir de um backup
docker exec -i abductor_postgres psql -U postgres -d abductor_db < ./data/backup_arquivo.sql

# Reset total da base de dados local (Recriação de tabelas)
docker exec -i abductor_postgres psql -U postgres -d abductor_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i abductor_postgres psql -U postgres -d abductor_db < ./backend/init.sql
```

## 🔗 Documentos Relacionados

- Voltar para a central: `[[00 - MOC - Central de Controle]]`
    
      
    
- Requisitos e regras funcionais: `[[02 - SRS - Requisitos do Sistema]]`
    
      
    
- Desenho técnico dos serviços: `[[03 - SDD - Arquitetura e Engenharia]]`
    
      
    
- Decisões de arquitetura registradas: `[[05 - ADR - Decisoes de Arquitetura]]`