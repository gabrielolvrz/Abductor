---
title: Abductor - Decisões de Arquitetura (ADR)
project: Abductor
type: adr
tags:
  - adr
  - arquitetura
  - engenharia
  - decisoes
  - tradeoffs
created: 2026-10-22
status: aprovado
---

# 🏛️ 05 - ADR — Decisões de Arquitetura

> **Architecture Decision Records (ADR)** do **Abductor**. Este documento registra o histórico das escolhas técnicas críticas, seus contextos, dilemas e trade-offs. Serve como bússola para evitar retrabalho, impedir a reabertura de debates já superados e manter o foco na simplicidade do MVP local.

---

## 📋 Índice dos Registros de Decisão

* [[#ADR 001 Relação N N (`search_leads`) para Preservação do Mini-CRM]]
* [[#ADR 002 Adoção do `gosom` (Go) via Docker vs. Scripts Python Nativos]]
* [[#ADR 003 Modelo Híbrido de Desenvolvimento (Docker para Infra + `mise` para Aplicação)]]
* [[#ADR 004 Validação de URLs com `GET Stream` Concorrente vs. `HTTP HEAD`]]
* [[#ADR 005 Descarte da Extração Profunda de Reviews no Scraping Inicial]]
* [[#ADR 006 Localização de Redes Sociais via Google Dorks em 1 Clique vs. Scraping]]
* [[#ADR 007 Mitigação de Copy-on-Write (`chattr +C`) no Btrfs para o PostgreSQL]]
* [[#ADR 008 Hard Gate no Lead Scoring para Estabelecimentos com Site Ativo]]
* [[#ADR 009 Uso de `phonenumbers` para Sanitização e Classificação de Telefones]]
* [[#ADR 010 Execução Assíncrona In-Process com Watchdog Passivo vs. Mensageria Externa]]
* [[#ADR 011 Site Vitrine One-Page Turnkey com LGPD Embarcada Nativa vs. Landing Page Genérica]]

---

## ADR 001: Relação N:N (`search_leads`) para Preservação do Mini-CRM

* **Status:** Aprovado e Modelado
* **Data:** 2026-10-22

### Contexto
No rascunho inicial, cada estabelecimento (`lead`) tinha uma chave estrangeira direta `search_id` (relação 1:N). No entanto, um profissional no mundo real (ex: *"Dr. Carlos Silva - Advocacia"*) pode ser encontrado em buscas distintas no Google Maps — por exemplo, ao pesquisar `"Advogado em Uberlândia Centro"` hoje e `"Advogado Trabalhista Uberlândia"` semana que vem. 

Se o modelo mantivesse 1:N, uma nova busca causaria um dos seguintes problemas:
1. Sobrescreveria o `search_id`, fazendo a primeira busca "perder" o lead no histórico;
2. Duplicaria a linha do Dr. Carlos no banco, quebrando a unicidade do `place_id` e fazendo o operador abordar a mesma pessoa duas vezes.

### Decisão
Criar a tabela associativa `search_leads (search_id, lead_id, found_at)`. A tabela `leads` guarda a identidade imutável do negócio e o status comercial no mini-CRM. A tabela `searches` guarda os parâmetros da consulta e o cache de jobs.

### Consequências
* **Positivas:** 
  * Unicidade global garantida por `place_id`.
  * Se o Dr. Carlos já foi contatado na semana passada, uma busca nova traz o card dele já marcado como `CONTATADO`, com as anotações preservadas.
  * O histórico de buscas permanece fiel ao que foi retornado naquele momento.
* **Trade-offs:** Exige uma consulta com `INNER JOIN` para montar o dashboard da busca ativa, gerando um custo computacional insignificante diante do ganho de integridade.

---

## ADR 002: Adoção do `gosom` (Go) via Docker vs. Scripts Python Nativos

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
Para extrair dados do Google Maps sem pagar pelas cotas caras da Google Places API, foram avaliados scrapers em Python (Selenium, Playwright puro, `zohaibbashir`) e o motor compilado em Go (`gosom/google-maps-scraper`). Scripts Python com Selenium são lentos, pesados em consumo de memória RAM e quebram com frequência a cada mudança de seletor do Maps.

### Decisão
Subir o **`gosom` como container independente** na porta interna 8080. O FastAPI comunica-se com ele através da API REST nativa que o próprio utilitário expõe (`/api/v1/jobs`), tratando o scraper como uma caixa-preta de infraestrutura.

O container declara `shm_size: '2gb'` no `docker-compose.yml`. O limite padrão de 64 MB de `/dev/shm` faz o Chromium headless crashar silenciosamente em rolagens longas do Google Maps, gerando jobs `PARTIAL` ou `FAILED` sem causa aparente.

### Consequências
* **Positivas:**
  * O `gosom` é compilado em Go, consumindo menos de 10% da CPU e RAM que uma automação equivalente em Selenium consumiria.
  * O ecossistema já vem empacotado com rotinas internas de anti-fingerprinting e gestão de concorrência.
  * Se o Google mudar o layout, basta puxar a versão atualizada da imagem Docker sem reescrever seletores CSS na base de código do backend.
* **Trade-offs:** Adiciona um container a mais no ambiente Docker e exige uma rotina de polling no FastAPI para acompanhar a conclusão do job.

---

## ADR 003: Modelo Híbrido de Desenvolvimento (Docker para Infra + `mise` para Aplicação)

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
O plano comum ao usar Docker é conteinerizar absolutamente tudo (banco, scraper, backend Python e frontend React). No entanto, rodar Vite e FastAPI dentro de contêineres no host Arch Linux adiciona sobrecarga de virtualização de volume sobre o Btrfs, atrasa o Hot Module Replacement (HMR) e dificulta o uso de ferramentas nativas de desenvolvimento do sistema (como `vscodium`, `Agy` e Kitty).

### Decisão
Adotar um **modelo híbrido de desenvolvimento**:
* **No Docker:** Serviços de infraestrutura e utilitários fechados (`PostgreSQL 16` e `gosom`).
* **Nativo no Host (via `mise`):** Aplicação viva (`FastAPI` rodando com Python 3.12 e `Vite` rodando com Node.js LTS).

### Consequências
* **Positivas:**
  * Resposta instantânea de compilação no Vite e recarga a quente no Uvicorn.
  * O `vscodium` e o LSP encontram os pacotes locais sem precisar de configurações de devcontainers.
  * Menor consumo de disco e facilidade para inspecionar logs no terminal.
* **Trade-offs:** Exige que as portas locais (3000, 8000, 5432, 8080) estejam livres no host.

---

## ADR 004: Validação de URLs com `GET Stream` Concorrente vs. `HTTP HEAD`

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
O método clássico para checar se um site está no ar de forma rápida é disparar uma requisição `HTTP HEAD`. Contudo, servidores modernos, provedores de hospedagem no Brasil (Hostinger, Locaweb) e sites sob proteção de WAF/Cloudflare bloqueiam requisições `HEAD` ou barram User-Agents genéricos de bibliotecas HTTP, retornando `403 Forbidden` ou `405 Method Not Allowed`. Isso classificaria sites perfeitamente ativos como `QUEBRADO`, gerando pontuações falsas e abordagens embaraçosas.

### Decisão
Utilizar `httpx.AsyncClient` com:
1. Método **`HTTP GET` com `stream=True`**, lendo apenas os primeiros bytes de cabeçalho e fechando a conexão imediatamente sem baixar o corpo da página.
2. Injeção de cabeçalhos legítimos de navegador desktop (`User-Agent: Mozilla/5.0...`).
3. Concorrência controlada por um semáforo de 30 workers (`asyncio.Semaphore(30)`).
4. Classificação de códigos `401/403` como `ATIVO` (site protegido, e não fora do ar).

### Consequências
* **Positivas:**
  * Eliminação de falsos positivos causados por firewalls de CDN.
  * Validação ultrarrápida: 50 a 100 domínios são testados em menos de 5 segundos no processador de 24 threads.
* **Trade-offs:** Baixa uma fração minúscula a mais de tráfego de rede do que um `HEAD` puro, impacto irrelevante para execução local.

---

## ADR 005: Descarte da Extração Profunda de Reviews no Scraping Inicial

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
No planejamento inicial, a métrica "Data da Avaliação Mais Recente" (`last_review_date`) recebia 15 pontos no Score. Porém, a listagem rápida do Google Maps (`depth 1`) expõe apenas a nota média (`rating`) e o volume total (`reviews_count`). Para descobrir quando foi feita a última avaliação, o scraper precisa abrir ficha por ficha, clicar na aba de reviews e ordenar por data, multiplicando o tempo de varredura por 5x e aumentando drasticamente o risco de bloqueio de IP/CAPTCHA.

### Decisão
Remover a obrigatoriedade de `last_review_date` no pipeline principal de busca. Redistribuir os pontos para **Volume de Avaliações** (até +25 pts) e **Nota Média** (até +15 pts). Deixar a verificação profunda de reviews como um botão opcional de enriquecimento sob demanda no card do lead para a Fase 2.

### Consequências
* **Positivas:**
  * O tempo médio de coleta cai de ~3 minutos para **25 a 45 segundos**.
  * Risco de bloqueio do Google Maps reduzido a quase zero.
  * O volume de avaliações já reflete de forma confiável se o negócio tem fluxo financeiro.
* **Trade-offs:** Negócios consolidados que fecharam as portas há pouco tempo podem aparecer com pontuação alta; o operador descarta manualmente ao checar o WhatsApp.

---

## ADR 006: Localização de Redes Sociais via Google Dorks em 1 Clique vs. Scraping

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
Profissionais sem site costumam manter perfis ativos no Instagram. Tentar extrair essas redes sociais automaticamente via scraping esbarra no mesmo problema: o Google Maps não fornece o link social de quem não tem site cadastrado, e tentar adivinhar `@` por automação gera muitos erros de homônimos.

### Decisão
Substituir raspagens frágeis por um **Botão de Busca Rápida (Google Dork)** no card do lead. Um clique abre uma nova aba no navegador com a query exata:

[https://www.google.com/search?q=](https://www.google.com/search?q=)"{Nome+do+Lead}"+"{Cidade}"+site:instagram.com

  

### Consequências
* **Positivas:**
  * Zero linhas de código de scraping extra, zero dependência frágil de seletores e zero risco de bloqueio.
  * O cérebro humano bate o olho no primeiro resultado da busca do Google e confirma a identidade do profissional em 2 segundos.
* **Trade-offs:** Exige um clique manual do operador quando ele quiser investigar o Instagram do lead antes do contato.

---

## ADR 007: Mitigação de Copy-on-Write (`chattr +C`) no Btrfs para o PostgreSQL

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
A máquina de desenvolvimento utiliza o sistema de arquivos Btrfs com compressão `zstd:3`. Bancos de dados relacionais sofrem com fragmentação extrema em sistemas de arquivos CoW, causando queda contínua de performance e desgaste acelerado do SSD por amplificação de escrita.

### Decisão
Criar o diretório local `./data/postgres` antes da primeira subida do container e aplicar o atributo **NoCoW (`+C`)** via comando canônico `chattr +C`.

### Consequências
* **Positivas:**
  * O PostgreSQL grava suas páginas de 8 KB com velocidade nativa de I/O de bloco, sem duplicação de metadados pelo Btrfs.
  * Elimina a fragmentação crônica do diretório de dados do projeto.
* **Trade-offs:** Arquivos criados sob NoCoW não se beneficiam de snapshots atômicos do Btrfs para aquele subdiretório específico; backups devem ser feitos via `pg_dump`.

---

## ADR 008: Hard Gate no Lead Scoring para Estabelecimentos com Site Ativo

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
Um estabelecimento pode ter nota 5.0 (+15 pts), mais de 50 avaliações (+25 pts), telefone celular verificado (+20 pts) e perfil reivindicado (+10 pts), totalizando **70 pontos** pela soma base. No entanto, se ele já possui um site institucional ativo e moderno, ele **não é cliente** para uma Landing Page de R$ 300. Se a pontuação fosse linear, leads inadequados apareceriam no topo da lista com borda amarela de prioridade.

### Decisão
Aplicar uma **trava obrigatória (Hard Gate)** no motor de scoring:
```python
if lead.website_status == "ATIVO":
    lead.score = 0
else:
    lead.score = max(0, min(100, round(lead.score_calculado)))
```

O clamping `max(0, min(100, ...))` também é obrigatório para os demais leads, pois notas `< 4.0` aplicam `-10 pts` e multiplicadores de nicho poderiam ultrapassar 100.

### Consequências

- **Positivas:**
    
      
    - O topo da lista fica reservado exclusivamente para quem sente a dor imediata da falta de página web (`IMPROVISADO`, `QUEBRADO` ou `SEM_SITE`).
        
          
        
    - Elimina o desperdício de tempo do operador analisando empresas que já têm o problema resolvido.
        
          
        
- **Trade-offs:** Estabelecimentos com sites antigos e feios (mas que respondem HTTP 200) caem para o final da fila no MVP inicial; a análise visual de design deficiente fica reservada para uma fase posterior.
    
      
    

---

## ADR 009: Uso de `phonenumbers` para Sanitização e Classificação de Telefones

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
A primeira versão do pipeline previa uma regex manual para limpar pontuação e inferir celular vs. fixo pela contagem de dígitos e pelo nono dígito. Essa abordagem gera falsos positivos: DDDs inexistentes, números de serviço (`0800`), formatos internacionais e fixos que coincidem com o padrão de celular passam pela validação e recebem os +20 pontos indevidamente.

### Decisão
Substituir a regex caseira pela biblioteca **`phonenumbers`** (port oficial da `libphonenumber` do Google), com região `BR`:
1. Validar e normalizar o número com a região `BR`; usar E.164 (`+55...`) para validação e persistir DDD + número nacional (sem `+55`) em `phone_sanitized`.
2. Validar o DDD e o plano de numeração real.
3. Classificar `PhoneNumberType.MOBILE`, `FIXED_LINE` ou `FIXED_LINE_OR_MOBILE`.
4. Só conceder os +20 pontos de contato quando o tipo for `MOBILE`.

### Consequências
* **Positivas:**
  * Detecção exata de celulares vs. fixos no Brasil, incluindo DDDs válidos e números inválidos.
  * Eliminação de falsos positivos que inflavam o Score e geravam abordagens erradas.
  * Tratamento consistente de `+55`, `0800` e formatos com pontuação.
* **Trade-offs:** Adiciona uma dependência Python (pequena e madura) ao backend; a classificação depende da base de numeração embarcada na biblioteca, que deve ser atualizada junto com as dependências do projeto.

---

## ADR 010: Execução Assíncrona In-Process com Watchdog Passivo vs. Mensageria Externa

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
O fluxo de coleta envolve orquestrar o scraper Go (`gosom`), aguardar a geração do CSV, baixar os dados, validar dezenas de URLs assincronamente e persistir no banco. Em arquiteturas corporativas multi-tenant, esse padrão costuma adotar Celery, Redis, RabbitMQ ou BullMQ. No entanto, o **Abductor** é um sistema de usuário único (single-operator) projetado para rodar estritamente no host local Arch Linux. Adicionar containers de Redis e workers separados aumentaria a complexidade de manutenção, consumo de memória e pontos de falha sem ganho de escala real.

Por outro lado, usar apenas `asyncio.create_task` em memória no FastAPI trazia o risco de tarefas zumbis caso o processo Uvicorn reiniciasse durante o desenvolvimento (`--reload`) ou sofresse crash, deixando a busca eternamente travada em `RUNNING`.

### Decisão
Manter a execução das tarefas assíncronas **in-process via `asyncio.create_task` nativo** no FastAPI, combinado com um **Watchdog Passivo de Timeout** implementado no endpoint de status (`GET /api/searches/{id}/status`) e sincronização de `progress_phase` no PostgreSQL.
Se uma busca estiver marcada como `RUNNING` além de `JOB_TIMEOUT_SECONDS` (padrão: 180 segundos) em relação ao início do ciclo atual (`NOW() - started_at > :timeout_seconds * INTERVAL '1 second'`), o endpoint de consulta força a transição de estado para `FAILED` diretamente no banco, destravando a interface sem dependência de serviços externos e sem matar re-sincronizações legítimas.

### Consequências
* **Positivas:**
  * Zero dependências extras de infraestrutura (sem containers de Redis ou filas Celery).
  * Consumo mínimo de memória e CPU no host.
  * Auto-recuperação garantida: o sistema nunca fica travado em jobs infinitos, mesmo se o processo do backend for encerrado no meio de uma coleta.
* **Trade-offs:** Não suporta múltiplos operadores concorrentes disparando dezenas de buscas simultâneas, o que está explicitamente fora do escopo do MVP local.

---

## ADR 011: Site Vitrine One-Page Turnkey com LGPD Embarcada Nativa vs. Landing Page Genérica

* **Status:** Aprovado
* **Data:** 2026-10-22

### Contexto
Na concepção inicial do produto, a entrega era rotulada como "Landing Page" e a conformidade com a LGPD (Lei Geral de Proteção de Dados) era tratada como um módulo de upsell opcional (+ R$ 100). Essa abordagem gerava dois atritos comerciais graves:
1. O termo "Landing Page" soa passageiro ou ligado exclusivamente a campanhas caras de tráfego pago, gerando resistência em profissionais liberais tradicionais (médicos, advogados, dentistas) que buscam estabilidade e autoridade permanente.
2. Vender LGPD como "extra opcional" passa a impressão de oportunismo comercial ou de que o produto base é incompleto. Pior: esses profissionais lidam diariamente com dados sensíveis e correm riscos regulatórios reais (multas da ANPD e questionamentos éticos da OAB/CRM) sem terem consciência disso.

### Decisão
Reestruturar a oferta principal em torno de um **Site Vitrine One-Page Perene (Turnkey Site Institucional)**, integrando a **conformidade técnica à LGPD nativamente em todos os templates como diferencial central de engenharia**.
* A entrega base (R$ 300 a R$ 450) já inclui banner flutuante de consentimento de cookies, rota/modal `/privacidade` com termos formais de tratamento de dados e conformidade técnica estrita.
* O gancho comercial posiciona o desenvolvedor não como um "fazedor de páginas rápidas", mas como um profissional técnico que entrega uma presença digital permanente, segura e protegida contra passivos regulatórios.
* Os upsells permanecem focados estritamente na alavancagem de aquisição: **Otimização de Perfil no Google Maps (GMB)** (+ R$ 150 a R$ 200) e **Setup de Anúncios no Google Ads Local** (+ R$ 200 a R$ 300).

### Consequências
* **Positivas:**
  * Elevação imediata da percepção de valor: o cliente sente que está contratando uma solução de nível corporativo e não um layout improvisado.
  * Quebra forte de objeção: profissionais de saúde e direito valorizam segurança institucional e proteção contra riscos invisíveis.
  * Padronização técnica dos templates: todos os boilerplates já nascem com o módulo de compliance ativo (`compliance.enable_lgpd_banner: true`).
* **Trade-offs:** Exige redação cuidadosa e juridicamente sóbria dos termos de privacidade padrão em cada vertical (advocacia, odonto, imobiliário).

## 🔗 Documentos Relacionados

- Voltar para a central: `[[00 - MOC - Central de Controle]]`
    
      
    
- Requisitos de software: `[[02 - SRS - Requisitos do Sistema]]`
    
      
    
- Arquitetura e topologia: `[[03 - SDD - Arquitetura e Engenharia]]`
    
      
    
- Esquema físico e DDL SQL: `[[04 - DATA - Modelagem e Banco]]`