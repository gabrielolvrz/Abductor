# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Gabriel (Solopreneur / Desenvolvedor & Operador Comercial):** Opera o sistema sozinho a partir de uma estação Arch Linux (Hyprland), prospectando prestadores de serviços e profissionais liberais locais em alta velocidade, enviando abordagens no WhatsApp e entregando sites em 24h.
- **Clientes Finais do Operador (Profissionais Liberais & Negócios Locais):** Advogados, clínicas odontológicas, clínicas veterinárias/pet shops, corretores/imobiliárias e consultórios com alta reputação física no Google Maps (4.5+ estrelas), mas presença digital amadora ou sem site.

## Product Purpose
O Abductor existe para transformar estabelecimentos físicos conceituados e mal atendidos no ambiente digital em clientes pagantes de Sites Vitrine One-Page perenes (Turnkey Institucional de R$ 300 a R$ 850), utilizando a blindagem jurídica LGPD como diferencial técnico irresistível. O sucesso do produto significa:
1. Extração rápida e higienização automática de dezenas de leads qualificados do Google Maps sem atrito.
2. Contato ágil via WhatsApp em 1 clique com scripts customizados de alta conversão.
3. Exportação instantânea da configuração do site (`site.config.json`) para deploy imediato na Vercel em menos de 24 horas.

## Positioning
Prospecção focada com **Lead Scoring e Hard Gate absoluto**: se o lead já possui site ativo e estruturado, o score é zerado e ele é descartado, concentrando 100% da energia em profissionais com presença digital vulnerável (sem site, site quebrado ou links improvisados como Linktree/WhatsApp cru). Diferencia-se de agências tradicionais por oferecer entrega turnkey hiperveloz (24h) com conformidade LGPD nativa (política de privacidade, aviso de cookies e transparência no tratamento de dados) já inclusa no preço de entrada.

## Operating Context
- **Ambiente de Trabalho:** Arch Linux sob Wayland/Hyprland com inicializador unificado (`./abductor.sh`).
- **Cockpit Web:** Frontend SPA local em React/TypeScript/Tailwind (porta `:3000`), alimentado por FastAPI (porta `:8000`) e PostgreSQL 16 local (porta `:5432`).
- **Scraper Dedicado:** Container Go (`gosom`) na porta `:8080` para extração stealth e autônoma do Google Maps sem dependência de Selenium/Puppeteer.
- **Rituais de Venda:**
  - Extração matinal por nicho e cidade.
  - Varredura e qualificação no Kanban do Cockpit.
  - Disparo manual de mensagens pelo WhatsApp Web / celular para evitar bloqueios de spam.
  - Fechamento com entrada de 50%, preenchimento do `site.config.json` e deploy na Vercel (`npx vercel --prod`).

## Capabilities and Constraints
- **Capacidades Confirmadas:**
  - Extração assíncrona com monitoramento de progresso e watchdog passivo de 180s.
  - Validação de URLs concorrente com detecção de agregadores e redirecionamentos (`httpx`).
  - Sanitização de telefones brasileiros (`phonenumbers`) com detecção de linhas móveis (`MOBILE`) e links diretos `wa.me`.
  - Lead Scoring determinístico (0 a 100) calibrado por volume de avaliações, rating, verificação de ficha e presença web.
  - Limpeza de nomes empresariais em runtime para abordagem humanizada sem mutilar o dado bruto do Maps.
  - Gestão de nichos dinâmicos e regras de pontuação por segmento.
  - Esteira turnkey com templates HTML/CSS/JS ultraleves (PageSpeed 95+) para Advocacia e Pet Shop.
- **Restrições & Inegociáveis:**
  - Sem filas externas pesadas (sem Celery ou Redis) — execução estritamente in-process com `asyncio`.
  - Hard Gate inviolável: `website_status == 'ATIVO'` força `score = 0`.
  - Dados do CRM (status do pipeline e anotações manuais) nunca são sobrescritos em novas buscas do Maps.
  - Arquitetura local NoCoW (`+C`) em Btrfs para banco e scraper.

## Brand Commitments
- **Nome:** Abductor.
- **Tom de Voz:** Direto, pragmático, consultivo e focado em autoridade e proteção do negócio do cliente.
- **Identidade do Cockpit:** Interface escura, densa, profissional, inspirada em terminais operacionais modernos (cinzas profundos, acentos de destaque ciano/azul/esmeralda), projetada para produtividade contínua sem cansaço visual.

## Evidence on Hand
- Especificações e contratos de arquitetura completos em `docs/` (`00` a `09`).
- Suíte de 44 testes unitários automatizados cobrindo todos os motores de regras em `backend/tests/`.
- Templates turnkey funcionais e testados em `templates/vercel-advocacia/` e `templates/vercel-petshop/`.
- Assets vetoriais e de imagem específicos para as verticais em `templates/*/base/assets/`.

## Product Principles
1. **Zero Fricção Operacional:** A interface deve permitir prospectar, qualificar, disparar contato e exportar sites sem etapas intermediárias desnecessárias.
2. **Hard Gate Anti-Desperdício:** Nunca gaste tempo nem atenção com leads que já têm sites estruturados; foque cirurgicamente no gap digital evidente.
3. **Entrega Turnkey Hiperveloz:** A customização do site do cliente deve ser viabilizada via configuração pura (`site.config.json`), sem necessidade de reescrever código frontend a cada cliente.
4. **Respeito à Privacidade e LGPD:** Tratamento exclusivo de dados manifestamente públicos do Google Maps e conformidade regulatória entregue ao cliente final.
5. **Robustez Local:** Sistema autocontido, sem dependências de nuvem para operar o cockpit, com persistência relacional resiliente.
