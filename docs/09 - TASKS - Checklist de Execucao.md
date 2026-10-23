---
title: Abductor - Checklist de Execução e Roadmap (TASKS)
project: Abductor
type: tasks
tags:
  - tasks
  - roadmap
  - backlog
  - execucao
  - checklist
created: 2026-10-22
status: em-andamento
---

# 📋 09 - TASKS — Checklist de Execução e Roadmap

> Plano de ataque operacional e técnico do **Abductor**. Este documento divide a construção do sistema em fases lógicas e marcos acionáveis, desde o primeiro comando no terminal Arch Linux até a primeira abordagem comercial real no WhatsApp.

---

## 🎯 Visão Geral das Fases de Entrega

```text
┌─────────────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────────────────┐
│ FASE 0: SETUP HOST & BTRFS  │ ──► │     FASE 1: BANCO & DDL     │ ──► │     FASE 2: SCRAPER GOSOM   │
└─────────────────────────────┘     └─────────────────────────────┘     └──────────────┬──────────────┘
                                                                                       │
┌─────────────────────────────┐     ┌─────────────────────────────┐     ┌──────────────▼──────────────┐
│  FASE 5: FRONTEND COCKPIT   │ ◄── │     FASE 4: FASTAPI CORE    │ ◄── │    FASE 3: MOTORES REGRAS   │
└──────────────┬──────────────┘     └─────────────────────────────┘     └─────────────────────────────┘
               │
┌──────────────▼──────────────┐     ┌─────────────────────────────┐
│ FASE 6: TEMPLATE & PLAYBOOK │ ──► │ FASE 7: VALIDAÇÃO EM CAMPO │
└─────────────────────────────┘     └─────────────────────────────┘
```

  

---

## 🛠️ Fase 0: Preparação do Host e Infraestrutura Local

Objetivo: Garantir que o ambiente Arch Linux, o Docker e o sistema de arquivos Btrfs estejam configurados sem gargalos de I/O.

- [x] Criar a estrutura base de pastas em `~/dev/abductor/` (`backend`, `frontend`, `templates`, `data/postgres`, `data/gosom`).
- [x] Aplicar o atributo NoCoW obrigatório nas pastas de banco de dados (`chattr +C ./data/postgres ./data/gosom`).
- [x] Verificar com `lsattr -d ./data/postgres` se o atributo `C` está ativo.
- [x] Criar o arquivo `docker-compose.yml` com os serviços `postgres:16-alpine` e `gosom/google-maps-scraper`, incluindo `shm_size: '2gb'` no serviço `gosom` para evitar crashes do Chromium headless.
- [x] Criar o arquivo `.env` na raiz com credenciais locais e portas padronizadas (`5432`, `8080`, `8000`, `3000`).
- [x] Travar as versões de runtime via `mise`:
  - [x] Python 3.12 na pasta `backend/`.
  - [x] Node.js LTS na pasta `frontend/`.

---

## 💾 Fase 1: Banco de Dados e Persistência Relacional

Objetivo: Inicializar o PostgreSQL com o esquema N:N que protege as anotações do mini-CRM contra sobrescritas.

- [x] Salvar o script DDL completo (definido no `[[04 - DATA - Modelagem e Banco]]`) em `backend/init.sql`, com a extensão `citext`, `gen_random_uuid()` nativo e coluna `progress_phase`.
- [x] Normalizar `category`, `city` e `neighborhood` (`strip` + `casefold` + remoção de acentos) antes de inserir ou consultar `searches`.
- [x] Subir o container do banco: `docker compose up -d postgres`.
- [x] Validar a criação das tabelas via terminal:
  - [x] Tabela `searches` (com constraint única de busca, status e `progress_phase`).
  - [x] Tabela `leads` (com `place_id UNIQUE` e campos JSONB).
  - [x] Tabela associativa `search_leads` (chave composta PK, sem índice redundante no prefixo).
  - [x] Validar índice parcial global `idx_leads_phone_sanitized` para checagem rápida de números compartilhados via `EXISTS`.
  - [x] Tabela `pitch_scripts` (com os seeds iniciais inseridos).
- [x] Testar a conexão do PostgreSQL a partir do host via porta `5432` com ferramenta CLI ou extensão do VSCodium.

---

## 🤖 Fase 2: Integração com o Scraper Autônomo (`gosom`)

Objetivo: Colocar o motor Go para rodar no Docker e testar a comunicação REST sem travar o terminal.

- [x] Subir o container do scraper: `docker compose up -d gosom`.
- [x] Verificar os logs do container (`docker logs abductor_gosom`) confirmando inicialização na porta interna `8080`.
- [x] Testar disparo de teste via `curl` no terminal:
```bash
  curl -X POST http://localhost:8080/api/v1/jobs \
    -H "Content-Type: application/json" \
    -d '{"name":"teste","keywords":["Dentista Centro Uberlandia"],"lang":"pt-BR","depth":1,"max_time":120}'
```

- [x] Verificar se o job retorna um `id` e se a rota de download `GET /api/v1/jobs/{id}/download` devolve o CSV de 34 colunas após a conclusão (parsear com `csv.DictReader`).
    
      
    

## ⚙️ Fase 3: Motores de Negócio (Lógica Pura no Backend)

Objetivo: Codificar as funções determinísticas em Python sem dependência de framework web (alta testabilidade).

- [x] **Sanitizador de Telefones (`engines/sanitizer.py`):**
  - [x] Validar e normalizar o número com `phonenumbers` (região `BR`), persistindo DDD + número nacional (sem `+55`) em `phone_sanitized`.
  - [x] Validar DDD e plano de numeração reais; descartar números de serviço (`0800`) e formatos inválidos.
  - [x] `PhoneNumberType.MOBILE` validado ➔ `phone_type = 'MOBILE'`, +20 pts e `https://wa.me/55...`.
  - [x] `FIXED_LINE`/`FIXED_LINE_OR_MOBILE` ➔ `phone_type = 'LANDLINE'` e link de teste sem bônus de score.
  - [x] Inexistente ou Inválido ➔ `phone_type = 'NONE'`/`INVALID` com penalidade de -30 pts.
- [x] **Higienizador de Razão Social (`engines/cleaner.py`):**
  - [x] Implementar `clean_business_name(raw_name: str) -> str` para converter caixa alta e remover sufixos corporativos (`LTDA`, `ME`, `EPP`, `EIRELI`, `S/S`, `Sociedade de Advogados`), permitindo abordagem humanizada.
- [x] **Validador Concorrente de Rede (`engines/validator.py`):**
  - [x] Blocklist de agregadores (`linktr.ee`, `beacons.ai`, `wa.me`, `instagram.com`, etc.) com comparação exata/sufixo via `tldextract` ➔ define `IMPROVISADO`.
  - [x] Rotina assíncrona com um único `httpx.AsyncClient` por lote e `stream=True` (timeout de 4s com headers de navegador real).
  - [x] Detecção pós-redirect: inspecionar `response.url` para neutralizar encurtadores (`bit.ly`) que redirecionam para agregadores/redes.
  - [x] Controle por semáforo com limite de 30 conexões (`asyncio.Semaphore(30)`).
  - [x] Regra de interpretação: `200` e `401/403` ➔ `ATIVO`; erros DNS, timeout e `404/5xx` ➔ `QUEBRADO`.
- [x] **Calculadora de Lead Scoring (`engines/scorer.py`):**
  - [x] Aplicação do **Hard Gate**: se `website_status == 'ATIVO'`, forçar `score = 0`.
  - [x] Penalidade de incontactabilidade (-30 pts) para leads com `phone_type IN ('NONE', 'INVALID')`.
  - [x] Clamping final `max(0, min(100, round(score)))` antes de persistir, para nunca violar `chk_leads_score_range`.
  - [x] Soma pontuada de acordo com a tabela do `[[02 - SRS - Requisitos do Sistema]]`.
  - [x] Geração do objeto detalhado `score_breakdown` (JSONB) para o tooltip do frontend.

## 🚀 Fase 4: Core API (FastAPI)

Objetivo: Estruturar as rotas HTTP, o gerenciamento de jobs em background, watchdog de resiliência e a persistência preservativa.

- [x] Inicializar a aplicação FastAPI em `backend/app/main.py` com CORS liberado para `http://localhost:3000`.
- [x] Configurar conexão assíncrona com PostgreSQL via `SQLAlchemy[asyncio]` + `asyncpg`.
- [x] Criar endpoints de Busca (`routers/searches.py`):
  - [x] `POST /api/searches`: Verifica cache primário; se não existir, cria a busca, retorna `202 Accepted` e dispara o ciclo do job em `asyncio.create_task`.
  - [x] `GET /api/searches/{id}/status`: Retorna `job_status`, `progress_phase` (`IDLE`, `SCRAPING`, `PARSING`, `VALIDATING`, `SCORING`, `COMPLETED`, `FAILED`) e tempo decorrido.
  - [x] Implementar **Watchdog Passivo de Timeout** na rota de status: se `RUNNING` há mais de 180s com base em `started_at` (`NOW() - started_at > INTERVAL '180 seconds'`), atualiza para `FAILED` no banco e destrava a UI.
  - [x] `GET /api/searches/{id}/leads`: Retorna leads vinculados com subquery `EXISTS` global para `is_shared_phone`.
- [x] Criar pipeline de ingestão (`services/ingestion.py`):
  - [x] Filtrar estabelecimentos contendo termos de `blocked_terms_in_name` do `rules.json` antes de validar redes.
  - [x] Executar sanitização, validação assíncrona com anti-redirect e cálculo de Score.
  - [x] Executar o **Upsert Preservativo** via `ON CONFLICT (place_id) DO UPDATE ... RETURNING id`, mantendo status comercial e anotações intactos e usando `COALESCE` para telefones.
  - [x] Recalcular `searches.total_leads` ao final com `COUNT(*)`.
- [x] Criar endpoints do Mini-CRM (`routers/leads.py`):
  - [x] `PATCH /api/leads/{id}/pipeline`: Atualiza o status (`NOVO`, `CONTATADO`, ..., `RECUSADO` com trava de opt-out).
  - [x] `PATCH /api/leads/{id}`: Recebe `phone_raw` (string digitada), re-executa `sanitizer` + `scorer` e atualiza `phone_sanitized`, `phone_type`, `whatsapp_url`, `score`, `score_breakdown` e `notes`.
  - [x] `POST /api/leads`: Cadastro avulso manual (`created_manually = TRUE`).
  - [x] `GET /api/leads/{id}/export-config`: Carrega o `site.config.json` base da vertical e mescla (*override*) os dados dinâmicos do lead, exportando o JSON completo pronto para build, mapeando `"55" + phone_sanitized` para `whatsapp_number` e ativando `compliance.enable_lgpd_banner: true`.
- [x] Criar endpoints de Scripts (`routers/scripts.py`):
  - [x] `GET /api/scripts`: Retorna os templates cadastrados.
  - [x] `POST /api/scripts/interpolate`: Devolve mensagem preenchida com `{name}` higienizado via `clean_business_name` (apenas sufixos societários) e fraseologia contextual para `{reviews_count}`.

## 🎨 Fase 5: Frontend e Cockpit de Vendas (React + Tailwind)

Objetivo: Construir a interface visual rápida e reativa no monitor Ultrawide, eliminando qualquer fricção de uso.

- [x] Configurar Tailwind CSS com tokens de cores e estados de borda (`border-green-500`, `border-amber-500`, `border-slate-700`).
- [x] **Componente de Busca (`SearchForm.tsx`):**
  - [x] Dropdown com categorias homologadas (_Advogado, Dentista, Corretor, Psicólogo, Estética, Veterinária, Arquiteto_).
  - [x] Input de Cidade (obrigatório) e Bairro (opcional).
  - [x] Botão de envio com estado desabilitado durante execução.
- [x] **Feedback de Execução (`JobProgress.tsx`):**
  - [x] Cronômetro progressivo de tempo decorrido (`00:00s`).
  - [x] Stepper visual com as etapas do pipeline.
  - [x] Skeleton loader animado (`animate-pulse`) ocupando a listagem enquanto o scraping ocorre.
- [x] **Componente de Lead (`LeadCard.tsx`):**
  - [x] Borda visual condicional por pontuação (Verde para Score $\ge 80$, Amarelo para 50–79, Neutro para $<50$).
  - [x] Badges contextuais: Situação do Site (`Linktree`, `Sem Site`, `Fora do Ar`) e Tipo de Telefone (`WhatsApp Celular`, `Fixo`).
  - [x] Badge amarelo **"Telefone compartilhado"** quando `is_shared_phone = true`.
  - [x] Tooltip com `score_breakdown` ao passar o mouse sobre o selo de Score.
  - [x] Dropdown inline do mini-CRM (`NOVO`, `CONTATADO`, `RESPONDEU`, `NEGOCIANDO`, `FECHADO`, `RECUSADO`).
  - [x] Botão de edição inline (lápis) para atualizar Telefone, Instagram e Notas sem sair da página.
  - [x] Ações de 1 clique:
    - [x] Botão verde de WhatsApp com link `wa.me/55...?text=${encodeURIComponent(mensagem)}` (mensagem do script pré-preenchida).
    - [x] Botão de ficha no Google Maps.
    - [x] Botão Google Dork Social (busca rápida no Instagram via `google.com/search?q=...`).
    - [x] Botão "Ver Script de Abordagem".
- [x] **Modal de Script (`PitchModal.tsx`):**
  - [x] Exibe a mensagem personalizada pronta para cópia.
  - [x] Botão com ação dupla: _Copiar Mensagem e Abrir WhatsApp_ com o texto já embutido na URL `?text=`.
- [x] **Barra de Filtros e Ordenação:**
  - [x] Checkboxes client-side: _Ocultar Contatados_, _Apenas Celular_, _Apenas Sem Site / Improvisado_.
  - [x] Seletor de ordenação: Por Score, por volume de avaliações ou por nota média.
- [x] Criar páginas secundárias simples:
  - [x] `/abordagens`: Listagem dos roteiros cadastrados.
  - [x] `/playbook`: Exibição dos checklists e guias de entrega.
        
          
        

## 🧩 Fase 6: Template Vertical e Playbook de Entrega

Objetivo: Deixar o modelo de Site Vitrine One-Page perene (Turnkey Institucional com blindagem LGPD nativa) pronto para personalização e deploy em 15 minutos.

- [x] Criar a pasta do template estático em `templates/vertical-advocacia/`.
- [x] Estruturar o arquivo central de dados `site.config.json` com campos de texto, cores, avaliações e serviços.
- [x] Implementar `GET /api/leads/{id}/export-config` para gerar o `site.config.json` pré-preenchido a partir da tabela `leads`.
- [x] Adicionar o botão **"Exportar `site.config.json`"** no card do lead (reduz a criação da amostra para ~30 segundos).
- [x] Montar o Site Vitrine One-Page institucional perene com HTML + Tailwind (Hero, Prova Social do Maps, Áreas de Atuação, Sobre, FAQ, Botão Flutuante de WhatsApp e Módulo de Compliance LGPD nativo).
- [x] Criar o script de deploy rápido usando a CLI da Vercel (`vercel --prod`).
- [x] Testar a subida de um modelo de demonstração para usar o link (`amostra-advocacia.vercel.app`) nas abordagens pelo celular.
    
      
    

## 💰 Fase 7: Validação Comercial em Campo (O Teste dos R$ 300)

Objetivo: Rodar a operação no mundo real e fechar o primeiro cliente pagante via Pix.

- [x] Executar o script de inicialização do sistema (`abductor`).
- [x] Rodar uma pesquisa focada: **Advogados em Uberlândia (Centro)**.
- [x] Filtrar pelos 15 primeiros leads com Score $\ge 80$ que possuam celular verificado e usem Linktree ou não tenham site.
- [ ] Realizar os disparos manuais no WhatsApp seguindo rigorosamente os scripts do `[[06 - PLAYBOOK - Abordagens e Vendas]]`.
- [ ] Marcar os cards abordados como `CONTATADO` no mini-CRM.
- [ ] Enviar a demonstração visual para os interessados que responderem.
- [ ] Negociar o fechamento: R$ 300 à vista (ou 50% de sinal e 50% na entrega).
- [ ] Apresentar o Site Vitrine com LGPD nativa inclusa como diferencial técnico e aplicar a transição de Upsell na conversa (oferecer Google Meu Negócio por +R$ 150 a R$ 200 ou Google Ads Local por +R$ 200 a R$ 300).
- [ ] Comemorar o primeiro Pix recebido e anotar melhorias práticas no Obsidian!
    
      
    

## 🔮 Ciclo de Evolução V2 — Cockpit Autoral, Kanban (`/pipeline`), Override Manual & Design System Warm Dark

- [x] **Schema e Documentação (`init.sql` e `docs/`):**
  - [x] Colunas `is_manually_edited` e `last_status_change_at` adicionadas em `leads`.
  - [x] Tabelas `niches` (com seeds homologados) e `system_notes` criadas no PostgreSQL.
  - [x] Precificação de referência atualizada nos scripts (`Base Turnkey R$ 350 | Customização de Marca +R$ 150 = Total R$ 500`, com LGPD nativa embutida).
- [x] **Backend FastAPI:**
  - [x] Override manual em `PATCH /api/leads/{id}` (`website_status`, `website_url`, `phone_raw`, `rating`, `reviews_count`, `notes`) marcando `is_manually_edited = TRUE` e recalculando `score` imediatamente.
  - [x] Preservação de `website_status` e `website_url` no `ON CONFLICT (place_id) DO UPDATE` quando `is_manually_edited = TRUE`.
  - [x] `PATCH /api/leads/{id}/pipeline` atualizando `last_status_change_at = NOW()` e `GET /api/leads/pipeline` calculando `days_in_status`.
  - [x] Rotas CRUD `/api/niches` (`routers/niches.py`) e `/api/notes` (`routers/notes.py`).
- [x] **Frontend Warm Dark System ("Anti-AI"):**
  - [x] Paleta terrosa quente (`stone-950` `#0c0a09`, `stone-900` `#1c1917`, `amber-600`, `emerald-600`, `rose-700`), tipografia serifada expressiva + `font-mono` tabular e textura de granulação sutil.
  - [x] Dashboard Home descomplicada com 4 métricas de topo, barra de ação rápida, toggle `[ Modo Grade ] | [ Modo Lista ]` persistido em `localStorage` e Gaveta de Foco Lateral (Slide-Over Drawer) com formulário de Override Manual.
  - [x] Tela Kanban de Pipeline (`/pipeline`) com 5 colunas, transição em 1 clique e alertas visuais de SLA de follow-up (🟢 0–3d, 🟡 4–7d, 🔴 8+d).
  - [x] Central de Playbooks e Contra-Ataque de Objeções (`/playbook` e `/abordagens`) filtrada por nicho (`/api/niches`) e Central de Backlog / Notas (`/anotacoes`).
    
      
    

## 🏛️ Esteira Definitiva de Templates de Advocacia — Vercel Turnkey & Presets

- [x] **Arquitetura de Diretórios (`templates/vercel-advocacia/`):**
  - [x] `base/` como molde mestre canônico e imutável (`index.html`, `privacidade.html`, `site.config.json`, `vercel.json`, `AI_GUIDELINES.md`, `assets/`).
  - [x] `clientes/` como repositório de instâncias locais isoladas com `.gitkeep` e blindagem via `.gitignore`.
  - [x] Remoção definitiva do legado `templates/vertical-advocacia/` e unificação da esteira em `templates/vercel-advocacia/` com `README.md` operacional.
- [x] **Modal Interativo de Exportação no Cockpit (`ExportConfigModal.tsx`):**
  - [x] 6 subnichos jurídicos pré-configurados com tagline e 3 serviços automáticos (Trabalhista, Família, Cível, Imobiliário, Empresarial, Previdenciário).
  - [x] Opção "Outro / Personalizar" com campos expansíveis inline.
  - [x] 5 paletas corporativas de prestígio (3 Escuras: Navy & Gold, Sovereign Dark, Espresso & Amber; 2 Claras: Oxford Linen, Atlantic Blue) + seletor hexadecimal customizável.
  - [x] Alternador visual de autoridade: *Modo Editorial (Monograma Institucional)* com extração automática de iniciais vs *Utilizar foto do advogado*.
  - [x] Ação de download de `site.config.json` perfeitamente alinhado com o backend.
- [x] **Template Mestre Estático de Altíssima Performance (`base/`):**
  - [x] Hero adaptativo com suporte a selo heráldico vetorial (`monograma.svg`) ou fotografia profissional em moldura fina.
  - [x] Prova social inteligente: faixa de autoridade consolidada do Google Maps ou cards com avaliações reais extraídas do Maps (tolerância zero a depoimentos falsos/mockados - OAB Provimento 205/2021).
  - [x] Grid Bento de áreas de atuação, esteira em 4 etapas, accordion FAQ em `<details>` e botão flutuante para WhatsApp em 1 clique.
  - [x] Compliance rigoroso com Provimento 205/2021 da OAB (sem mercantilização, sem promessas de "causa ganha", sem exibição de preços).
  - [x] Abordagem honesta e desmistificada da LGPD (sem popups falsos de cookies quando não há rastreadores de terceiros).
  - [x] `privacidade.html` dinâmico e responsivo ao tema do cliente em `site.config.json`.
  - [x] Guia perpétuo de engenharia e diretrizes de IA em `templates/vercel-advocacia/base/AI_GUIDELINES.md`.

---

## 🎨 Ciclo de Refinamento Técnico, Motion & Inteligência Operacional

- [x] **Motion e Acabamento no Template Base (`templates/vercel-advocacia/base/`):**
  - [x] Scroll reveal nativo via `IntersectionObserver` com transição suave de opacidade e translação vertical (`.reveal`).
  - [x] Micro-interações táteis nos botões e CTAs com elevação suave, profundidade de sombra e destaque na borda (`.btn-interactive`).
  - [x] Iluminação ambiental difusa (`.ambient-glow`) atrás dos títulos de maior hierarquia (Hero e seções principais).
  - [x] Acordeão de FAQ suave via CSS grid transition e rotação fluida do ícone indicador sem saltos de layout.
  - [x] Renderização refinada de depoimentos reais em cards com aspas sóbrias, 5 estrelas e autor, mantendo o fallback de reputação consolidada do Maps.
- [x] **Isolamento de Nicho & Config Exclusivo de Advocacia:**
  - [x] `isAdvocaciaLead` garantindo que o modal com presets jurídicos abra exclusivamente para o nicho de Advocacia.
  - [x] Outros nichos executam exportação turnkey direta do `site.config.json` sem bloqueios ou quebras.
  - [x] Suporte completo ao nó `testimonials` no `site.config.json` exportado a partir do modal.
- [x] **Precificação Volátil e Dinâmica:**
  - [x] Remoção de preços hardcoded estáticos no frontend e backend.
  - [x] Seletor de ticket dinâmico no `PitchModal.tsx` (R$ 300, R$ 350, R$ 400, R$ 450, R$ 500, R$ 650, R$ 850 + custom) recalculando a mensagem e URL do WhatsApp em tempo real.
  - [x] Suporte a `price` no backend `PitchInterpolateRequest` e substituição dinâmica em runtime.
- [x] **Widget Inteligente de Janelas de Disparo no Header:**
  - [x] `ProspectingWindowWidget.tsx` sincronizado com o relógio local do operador (09h30-11h30 Ouro, 10h-11h & 14h-16h Acolhimento, 10h-11h & 15h-17h Comercial, 14h30-16h30 Turnos, Noite fora de horário).
  - [x] Badge interativo pulsante no header destacando janelas ativas em tempo real.
  - [x] Popover com grade completa de horários e alertas do código comercial ético.
- [x] **Polimento Visual, Motion Bidirecional & Ergonomia de Presets:**
  - [x] Micro-interações uniformes em todos os cards (`.card-interactive`) com elevação `-4px`, escala `1.015`, borda de acento ouro e sombra profunda em métricas, etapas e serviços.
  - [x] Acordeão FAQ com animação bidirecional suave tanto ao abrir quanto ao fechar (sem estalos), com rotação suave do chevron.
  - [x] Transições de Scroll Reveal calibradas para 750ms com curva suave `cubic-bezier(0.22, 1, 0.36, 1)`.
  - [x] Redesenho da seção de depoimentos com acabamento de vidro fosco (`backdrop-blur-md` e `bg-slate-900/80`), layout responsivo (linha única em desktop / máx 2 em mobile) para avaliações verificadas do Google Maps.
  - [x] Responsividade total mobile-first com proteção de overflow horizontal (`overflow-x-hidden`) e tipografia fluida.
  - [x] Blindagem ética contra depoimentos falsos no modal (card informativo de compliance OAB Provimento 205/2021 e ativação automática da faixa de reputação verificada do Google Maps com `testimonials: []`).
  - [x] Desbloqueio e personalização rápida dos 3 serviços dos presets jurídicos sem necessidade de recriar do zero.

---

## 🛡️ Auditoria Geral e Resolução Definitiva de Débitos Técnicos

- [x] **Conformidade Ética OAB (Provimento 205/2021):**
  - [x] Remoção de qualquer pool de avaliações fictícias (`DEFAULT_TESTIMONIALS_POOL`) do frontend.
  - [x] Fixação obrigatória de `testimonials: []` no `site.config.json` base e exportado, ativando banner de reputação autêntica do Maps.
- [x] **Blindagem do Repositório Git:**
  - [x] Regra no `.gitignore` para ignorar instâncias locais de clientes em `templates/vercel-advocacia/clientes/*` preservando `.gitkeep`.
- [x] **Integridade do PostgreSQL:**
  - [x] Constraint única `uq_pitch_scripts_category_condition_title UNIQUE (category, website_condition, title)` em `pitch_scripts` no DDL, ORM e migração executada no container ativo.
- [x] **Limpeza de Nomes Comerciais:**
  - [x] Função `cleanNameClientSide` sincronizada com o backend (remoção de `LTDA`, `S/S`, `Sociedade Individual de Advocacia`, etc., e Smart Title Case para preservar conectivos).
- [x] **Padronização e Eliminação de Legados:**
  - [x] Remoção da pasta legada `templates/vertical-advocacia/` e criação do `templates/vercel-advocacia/README.md`.
  - [x] Página `privacidade.html` 100% dinâmica e adaptativa aos 5 presets de tema.
- [x] **Sincronização Total de Documentação:**
  - [x] `docs/03 - SDD`, `docs/04 - DATA`, `docs/07 - TEMPLATES`, `docs/08 - RUNBOOK` e `docs/09 - TASKS` 100% alinhados com a implementação real.

---

## 🔗 Documentos Relacionados

- Voltar para a central: `[[00 - MOC - Central de Controle]]`
    
      
    
- Visão de negócio e metas: `[[01 - PRD - Visao de Produto]]`
    
      
    
- Especificação técnica do sistema: `[[02 - SRS - Requisitos do Sistema]]`
    
      
    
- Guia de execução no terminal: `[[08 - RUNBOOK - Setup da Maquina]]`