---
title: Abductor - Especificação de Requisitos de Software (SRS)
project: Abductor
type: srs
tags:
  - srs
  - requisitos
  - engenharia
  - regras-de-negocio
  - lead-scoring
created: 2026-10-22
status: aprovado
---

# ⚙️ 02 - SRS — Requisitos do Sistema

> Especificação funcional e técnica do **Abductor**. Este documento define detalhadamente o comportamento esperado de cada funcionalidade, as regras de pontuação matemática (Lead Scoring), o tratamento de exceções e as restrições arquiteturais da aplicação.

---

## 1. Glossário e Definições de Domínio

* **Lead:** Profissional ou empresa local extraído de uma listagem geográfica do Google Maps.
* **Place ID:** Identificador textual único e imutável fornecido pelo Google Maps para cada estabelecimento comercial.
* **Presença Web Improvisada:** Negócio que não possui domínio institucional próprio e utiliza serviços agregadores (Linktree, Beacons), redes sociais ou redirecionamentos simples para WhatsApp no campo de website.
* **Site Quebrado:** Domínio cadastrado que falha na resolução de DNS, estoura o tempo de resposta ou retorna erro de servidor/não encontrado (`404`, `5xx`).
* **Hard Gate:** Regra de corte obrigatória que anula ou trava a pontuação de um lead antes da soma final, descartando leads fora do perfil comercial.
* **Upsert Preservativo:** Operação de banco de dados que insere novos registros ou atualiza métricas públicas (avaliações, nota), mantendo intactos os campos operacionais manuais (`pipeline_status`, `notes`).

---

## 2. Motor de Lead Scoring e Regras de Negócio

O cálculo de pontuação (0 a 100) reflete a probabilidade de fechamento comercial de um **Site Vitrine One-Page perene (Turnkey Site Institucional)**, entregue com conformidade técnica à LGPD nativamente integrada como diferencial de engenharia. O algoritmo busca negócios com alta tração comercial física e presença digital inexistente ou amadora.

### 2.1. Regra de Ouro (Hard Gate de Descarte)
> [!WARNING]
> Se a classificação do site for **`ATIVO`** (site funcional respondendo código 200 ou protegido por WAF), o **Lead Score é fixado estritamente em 0**.
> Leads que já possuem páginas web ativas não são o foco da oferta e não devem poluir o topo da listagem.

### 2.2. Matriz de Pontuação Base (Máximo: 100 Pontos)

Score Calculado = (Pontos_Site + Pontos_Contato + Pontos_Reviews + Pontos_Reputacao + Pontos_Ficha)

- Se website_status == 'ATIVO' ➔ Score Calculado = 0
- **Penalidade de Incontactabilidade:** se `phone_type IN ('NONE', 'INVALID')`, aplica-se **-30 pts** na soma, impedindo que empresas sem telefone celular ou fixo alcancem prioridade alta/média no cockpit.
- **Clamping obrigatório:** após o Hard Gate, redutores e multiplicadores de nicho, o motor calcula `Score Final = max(0, min(100, round(Score_Calculado)))` antes de persistir, blindando contra violações da constraint `chk_leads_score_range` do PostgreSQL.

| Dimensão | Condição Técnica / Regra | Pontuação |
| :--- | :--- | :--- |
| **Situação do Site** | `IMPROVISADO` (detectado em lista de agregadores/redes ou via redirect) | **+30 pts** |
| | `QUEBRADO` (falha de DNS, timeout ou erro HTTP 404/5xx na raiz) | **+25 pts** |
| | `SEM_SITE` (campo de website nulo ou vazio) | **+15 pts** |
| | `ATIVO` (página convencional acessível) | **0 pts** *(Hard Gate)* |
| **Canal de Contato** | Celular validado via `phonenumbers` (`PhoneNumberType.MOBILE`) | **+20 pts** |
| | Telefone fixo validado (`FIXED_LINE`/`FIXED_LINE_OR_MOBILE`) | **0 pts** |
| | Inexistente ou Inválido (`NONE`/`INVALID`) | **-30 pts** *(Penalidade)* |
| **Volume de Reviews** | Calibrado conforme a categoria do nicho (ver item 2.3) | **Até +25 pts** |
| **Reputação (Ego)** | Nota média entre 4.5 e 5.0 estrelas | **+15 pts** |
| | Nota média entre 4.0 e 4.4 estrelas | **+5 pts** |
| | Nota média inferior a 4.0 estrelas | **-10 pts** |
| **Ficha Reivindicada** | Perfil confirmado pelo proprietário no Maps (`is_claimed = TRUE`) | **+10 pts** |

### 2.3. Tolerâncias de Prova Social por Nicho
Para evitar que profissões de alto valor com poucas avaliações sejam penalizadas em relação a comércios de massa:

* **Grupo 1 — Alto Ticket / Decisão Lenta (Advocacia, Odontologia, Medicina, Arquitetura, Imobiliárias):**
  * $\ge 15$ avaliações: **+25 pts**
  * $5$ a $14$ avaliações: **+15 pts**
  * $< 5$ avaliações: **0 pts**
* **Grupo 2 — Serviços Frequentes (Pet Shop, Estética, Barbearia, Oficinas Mecânicas):**
  * $\ge 40$ avaliações: **+25 pts**
  * $15$ a $39$ avaliações: **+15 pts**
  * $< 15$ avaliações: **0 pts**

### 2.4. Classificação de Presença Web e Anti-Falso Positivo
O backend executa a classificação de URL seguindo esta ordem estrita:

1. **Campo Vazio:** Se a string for nula ou em branco ➔ `SEM_SITE`.
2. **Blocklist de Agregadores (Sem requisição):** Se contiver termos como `linktr.ee`, `beacons.ai`, `instabio.cc`, `heylink.me`, `wa.me`, `api.whatsapp.com`, `instagram.com`, `facebook.com`, `doctoralia.com.br`, `jusbrasil.com.br`, `canva.site` ou `guiamais.com.br` ➔ `IMPROVISADO`.
3. **Checagem de Rede Ativa:** Para domínios convencionais, o backend dispara uma chamada assíncrona com `httpx.AsyncClient`:
   * Método: `GET` com `stream=True` (consome cabeçalhos e aborta o download do corpo).
   * Headers: Injeção de `User-Agent` de navegador comum.
   * Timeout estrito: 4 segundos.
   * Redirecionamentos: `follow_redirects=True`.
4. **Interpretação do Retorno e Detecção de Redirecionamento:**
   * **Anti-falso positivo pós-redirect:** Se o domínio resolver com sucesso (`200 OK`), mas a URL final (`response.url`) pertencer à lista de agregadores/redes sociais (ex.: encurtador `bit.ly/dr-carlos` que aponta para Linktree ou Instagram), o status final é `IMPROVISADO`.
   * Erro de DNS (`ConnectError`), timeout (`ConnectTimeout`, `ReadTimeout`) ou códigos `404`, `500`, `502`, `503` na raiz ➔ `QUEBRADO`.
   * Resposta `200 OK`, `301/302` resolvido para página institucional válida ou respostas de proteção WAF (`401`, `403`) ➔ `ATIVO` (Hard Gate ativado).

---

## 3. Requisitos Funcionais (RF)

### Módulo 1: Parâmetros de Busca e Cache Primário
* **[RF01] Formulário de Consulta:** A interface deve fornecer seleção de nichos pré-configurados em dropdown (*Advogado, Dentista, Corretor de Imóveis, Psicólogo, Clínica de Estética, Veterinária/Pet Shop, Arquiteto*), campo de texto obrigatório para Cidade e campo opcional para Bairro. Deve existir opção de digitação livre para nichos experimentais.
* **[RF02] Cache-First Instantâneo:** Ao submeter uma busca, o sistema normaliza `category`, `city` e `neighborhood` (`strip`, `casefold` e remoção de acentos) e consulta a tabela `searches`.
  * Se o status for `COMPLETED` ou `PARTIAL`: os leads são carregados do banco local em menos de 100ms e a tela exibe: *"Última sincronização: DD/MM/AAAA às HH:MM (X leads no banco)"*.
  * Se o status for `FAILED`: o cache não é considerado válido e o sistema dispara nova varredura automaticamente sem travar a interface.
* **[RF03] Forçar Re-sincronização:** A tela deve exibir o botão *"Atualizar Varredura"*, permitindo invalidar o cache e executar nova raspagem no Google Maps para a consulta ativa.

### Módulo 2: Orquestração do Scraper e Resiliência
* **[RF04] Disparo Assíncrono do Scraper:** O backend deve despachar a ordem de raspagem para o container do `gosom` via `POST ${GOSOM_API_URL}/api/v1/jobs` (padrão `http://localhost:8080`), salvando `gosom_job_id`, `job_status = 'RUNNING'` e `progress_phase = 'SCRAPING'` no PostgreSQL, retornando `202 Accepted` imediato.
* **[RF05] Acompanhamento por Polling:** O frontend consulta `GET /api/searches/{id}/status` a cada 3 segundos, mantendo a tela responsiva sem sobrecarga de rede.
* **[RF06] Feedback Visual em Fases e Stepper:** Enquanto o job estiver ativo, o frontend deve refletir o campo `progress_phase` sincronizado pelo backend:
  * Etapas: `SCRAPING` (Varrendo Google Maps) ➔ `PARSING` (Filtrando termos institucionais) ➔ `VALIDATING` (Checando URLs via httpx) ➔ `SCORING` (Calculando Lead Score).
  * Cronômetro progressivo de tempo decorrido (`00:00s`).
  * Skeleton loading animado durante a coleta.
* **[RF07] Persistência de Coletas Parciais:** Se a conexão cair ou o Google travar a rolagem, o backend processa e persiste todos os leads extraídos até o momento, gravando `job_status = 'PARTIAL'`.
* **[RF08] Re-sincronização Seletiva:**
  * **Ação A (Buscar Novos Leads):** Executa nova raspagem no Maps, roda o Upsert Preservativo padrão na tabela `leads` (`ON CONFLICT (place_id) DO UPDATE ... RETURNING id` — conforme `RF12`) e vincula os registros à busca ativa na tabela associativa `search_leads` via `ON CONFLICT (search_id, lead_id) DO NOTHING`.
  * **Ação B (Revalidar URLs dos Salvos):** Dispara apenas a rotina Python de validação de rede (`httpx`) sobre os leads salvos da busca ativa, recalculando status de sites e Scores em poucos segundos sem tocar no Google Maps.

### Módulo 3: Sanitização, Enriquecimento e Lead Scoring
* **[RF09] Tratamento de Telefones (`phonenumbers`):**
  * Normalização e validação via `phonenumbers` (região `BR`). Persiste DDD + número nacional sem `+55` em `phone_sanitized`.
  * Se `PhoneNumberType.MOBILE` ➔ define `phone_type = 'MOBILE'`, atribui +20 pontos de contato e monta `https://wa.me/55${numero}`.
  * Se `FIXED_LINE` ou `FIXED_LINE_OR_MOBILE` ➔ define `phone_type = 'LANDLINE'`, atribui 0 pontos de celular, mas viabiliza link de teste para WhatsApp Business fixo.
  * Se vazio, inválido ou `0800` ➔ define `phone_type = 'NONE'`/`INVALID` e aplica redutor de -30 pontos no Score.
* **[RF10] Validação Concorrente de Rede com Anti-Redirect:** O backend processa checagem de URLs em lote assíncrono limitado a 30 conexões (`asyncio.Semaphore(30)`), inspecionando a URL de destino para identificar redirecionamentos camuflados para redes sociais ou agregadores.
* **[RF11] Armazenamento do Detalhamento do Score:** O backend calcula a pontuação com Hard Gate, penalidade de incontactabilidade e clamping [0, 100], gravando o detalhamento no campo `score_breakdown` (JSONB) para exibição em tooltip no frontend.
* **[RF12] Upsert Seguro:** Ao salvar leads de novas buscas, atualiza dados públicos (nota, reviews, status do site, score), preservando intactos os campos `pipeline_status`, `notes` e telefones editados manualmente (usando `COALESCE`).

### Módulo 4: Interface do Usuário e Mini-CRM no Card
* **[RF13] Destaque Cromático por Prioridade:** Cards recebem bordas contextuais:
  * 🟢 **Verde (Alta Prioridade):** Score $\ge 80$.
  * 🟡 **Amarelo (Média Prioridade):** Score entre 50 e 79.
  * ⚪/🔴 **Cinza/Neutro (Baixa Prioridade / Descarte):** Score $< 50$ ou site ativo.
* **[RF14] Ações Rápidas em 1 Clique com Nome Limpo:** Cada card deve conter:
  * Botão WhatsApp com mensagem pré-preenchida interpolando `{name}` higienizado (sem sufixos `LTDA`, `ME`, `S/S` via `clean_business_name`).
  * Badge de alerta **"Telefone compartilhado"** quando a subquery `EXISTS` global detectar o mesmo número em mais de uma ficha.
  * Botão para ficha original no Google Maps.
  * Botão **Buscar Instagram (Dork)**: abre `https://www.google.com/search?q="{Nome+do+Lead}"+"{Cidade}"+site:instagram.com`.
  * Botão **Ver Script**: abre modal com a mensagem pronta de abordagem focada em Site Vitrine One-Page e segurança jurídica/LGPD.
* **[RF15] Edição Manual (Override) com Recálculo Imediato:** Através da Gaveta de Foco Lateral (`PATCH /api/leads/{id}`), o operador pode editar ou forçar `website_status`, `website_url`, `phone_raw`, `rating`, `reviews_count` e `notes`. Quando dados técnicos de site/contato/avaliações são alterados, o registro recebe `is_manually_edited = TRUE` (impedindo sobrescrita em novos scrapings) e tem seu Score e `score_breakdown` recalculados imediatamente em tempo real.
* **[RF16] Inserção Manual de Estabelecimentos:** Botão de cadastro avulso para adicionar empresas (`created_manually = TRUE`) com scoring automático imediato.
* **[RF17] Gestão de Status de Funil, Kanban (`/pipeline`) e SLA de Inatividade:** O funil (`NOVO`, `CONTATADO`, `RESPONDEU`, `NEGOCIANDO`, `FECHADO`, `RECUSADO`) atualiza `last_status_change_at = NOW()` a cada transição e alimenta o quadro Kanban em `/pipeline` (`GET /api/leads/pipeline`), calculando `days_in_status` com alertas visuais de SLA (🟢 0–3d, 🟡 4–7d, 🔴 8+d). Leads marcados como `RECUSADO` preservam essa condição para evitar re-abordagens indesejadas (LGPD/compliance comercial).
* **[RF18] Filtros Dinâmicos e Visualização Dupla (Grade / Lista):** Filtragem instantânea client-side e alternância persistida em `localStorage` entre **Modo Grade Fluido** (ultrawide) e **Modo Lista Compacta** (1 linha por lead).
* **[RF19] Tooltip de Pontuação:** Exibição detalhada da pontuação baseada em `score_breakdown`.

### Módulo 5: Scripts de Abordagem, Playbook, Nichos, Notas e Exportação Turnkey
* **[RF20] Interpolação Dinâmica de Scripts:** Carrega o template contextual conforme a falha digital do lead, substituindo `{name}` higienizado, `{city}`, `{rating}` e `{reviews_count}`. Caso `reviews_count == 0`, adota fraseologia elegante alternativa (*"com presença destacada no Google"* em vez de *"com 0 avaliações"*). A blindagem LGPD é sempre nativa do produto base (Base Turnkey R$ 350 | Customização de Marca +R$ 150 = Total R$ 500).
* **[RF21] Central de Scripts (`/abordagens`), Nichos (`/api/niches`) e Notas (`/anotacoes`):** Gestão de modelos de abordagem (`pitch_scripts`), catálogo centralizado de categorias (`niches`) e bloco de notas operacional interno (`system_notes`).
* **[RF22] Central de Playbook e Contra-Ataque de Objeções (`/playbook`):** Guia operacional por nicho com Matriz de Contra-Ataque de Objeções (cópia em 1 clique), checklists persistentes de Reunião, WhatsApp e Entrega Turnkey, e manuais de precificação (R$ 350 / R$ 500) e upsells (GMB e Google Ads Local).
* **[RF23] Exportação de `site.config.json`:** Ação no card do lead que aciona `GET /api/leads/{id}/export-config` e baixa o arquivo de configuração pré-preenchido, mapeando `whatsapp_number = "55" + phone_sanitized` e `compliance.enable_lgpd_banner = true`, pronto para injeção no template.

---

## 4. Requisitos Não Funcionais (RNF)

* **[RNF01] Execução Totalmente Local:** O ecossistema completo deve funcionar na máquina local sem dependência de serviços externos pagos ou instâncias em nuvem.
* **[RNF02] Isolamento e Persistência de Dados:** O banco de dados PostgreSQL 16 deve ser executado em container Docker, com volume persistente em pasta local configurada com desativação de Copy-on-Write (`chattr +C ./data/postgres`) para compatibilidade com o sistema Btrfs.
* **[RNF03] Performance de Validação de Rede:** O motor assíncrono em Python deve conseguir validar o status de 50 URLs externas em menos de 8 segundos no host local.
* **[RNF04] Confiabilidade de Jobs e Watchdog de Timeout:** O backend deve ser blindado contra tasks zumbis. O endpoint de status executa checagem passiva: se o job estiver em `RUNNING` além de `JOB_TIMEOUT_SECONDS` (padrão: 180 segundos) em relação ao início da execução atual (`NOW() - started_at > :timeout_seconds * INTERVAL '1 second'`), o banco é automaticamente atualizado para `FAILED` com mensagem de timeout, liberando a interface.
* **[RNF05] Interface Leve e Sem Travamentos:** O frontend deve aplicar renderização paginada ou virtualizada caso uma busca retorne mais de 100 leads, mantendo a rolagem fluida no monitor Ultrawide a 75 Hz.

---

## 5. Casos de Borda e Tratamento de Exceções

| Cenário de Borda | Causa Comum | Comportamento Esperado do Sistema |
| :--- | :--- | :--- |
| **Google Maps exibe CAPTCHA no scraper** | Varreduras repetidas em curto intervalo pelo container do `gosom`. | O job encerra com status `PARTIAL` ou `FAILED`. A interface exibe aviso de bloqueio temporário e sugere aguardar 5 minutos ou pesquisar por outro nicho. Os dados já coletados continuam intactos. |
| **Site protegido por Cloudflare / WAF** | Retorno de códigos HTTP 403 Forbidden ou 401 Unauthorized. | O validador **não** marca como quebrado. O lead é categorizado como `ATIVO` e aciona o Hard Gate (Score 0), evitando abordagens embaraçosas. |
| **Encurtador redireciona para Linktree / WhatsApp** | Uso de links do tipo `bit.ly/dr-carlos` no cadastro do Maps. | O validador segue o redirect e inspeciona `response.url`. Ao detectar o agregador de destino, classifica como `IMPROVISADO` (+30 pts), impedindo que o lead caia falsamente no Hard Gate. |
| **Profissional possui duas fichas no Maps** | Cadastro duplo para a mesma clínica física em bairros diferentes. | O sistema cadastra ambos os registros com seus respectivos `place_id`. A subquery `EXISTS` global sinaliza `is_shared_phone = TRUE`, exibindo badge amarelo de alerta no card. |
| **Lead cadastrado sem nenhum telefone** | Perfil incompleto no Google Maps. | O sistema salva o lead com `phone_type = 'NONE'`, aplica redutor de -30 pts no Score, exibe badge cinza *"Sem Telefone"* e desativa botões de WhatsApp, priorizando a busca social. |
| **Lead com 0 avaliações no Maps** | Perfil recém-criado. | O sistema pontua 0 na métrica de avaliações, calcula os demais pontos normalmente e exibe selo neutro *"Sem avaliações"*, ativando fraseologia alternativa sem citar "0 avaliações" no script. |

---

## 🔗 Documentos Relacionados
* Voltar para a central: [[00 - MOC - Central de Controle]]
* Visão de negócio e personas: [[01 - PRD - Visao de Produto]]
* Desenho técnico de componentes: [[03 - SDD - Arquitetura e Engenharia]]
* Estrutura do banco de dados: [[04 - DATA - Modelagem e Banco]]
