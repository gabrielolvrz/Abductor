---
title: Abductor - Documento de Requisitos de Produto (PRD)
project: Abductor
type: prd
tags:
  - prd
  - produto
  - negocio
  - estrategia
  - vendas
created: 2026-10-22
status: aprovado
---

# 🎯 01 - PRD — Visão de Produto

> Documento de alinhamento estratégico do **Abductor**. Define a dor de mercado, o perfil de cliente ideal (ICP), a esteira de monetização e as fronteiras do que entra e do que fica de fora do MVP.

---

## 1. O Problema Real

Profissionais liberais e empresas locais com serviços de alto valor (como advogados, dentistas, clínicas e arquitetos) dependem do Google para receber clientes todos os dias. 

A maioria deles tem boas avaliações no espaço físico, mas comete um dos três erros graves no ambiente digital:
1. **Não tem site cadastrado** na ficha do Google Maps.
2. **Usa um link improvisado** (Linktree, Beacons, perfil do Instagram ou link cru de WhatsApp), o que passa amadorismo para quem busca um serviço sério.
3. **Tem um domínio que já caiu ou expirou** (erro 404/500/DNS), pagando o pato sem perceber que está perdendo clientes há meses.

Esses profissionais não precisam de um portal institucional pesado com painel WordPress vulnerável ou banco de dados custoso. Eles precisam de um **Site Vitrine One-Page perene (Turnkey Site Institucional)**: uma estrutura definitiva, rápida, elegante e responsiva, com apresentação clara da autoridade, áreas de atuação e botão direto para o WhatsApp da recepção.

Mais importante: profissionais liberais sérios tratam dados de clientes e pacientes todos os dias e correm riscos regulatórios reais (LGPD/ANPD) sem saber. Ao entregar um **Site Vitrine já 100% em conformidade com as normas e com a LGPD integrada nativamente** (termos de privacidade e consentimento de dados), o desenvolvedor se posiciona como um engenheiro rigoroso, transformando a segurança jurídica em um diferencial competitivo inquestionável.

O problema de quem vende esse serviço não é falta de demanda: é o **tempo perdido prospectando no braço**, abrindo ficha por ficha no mapa e tentando descobrir se o dono tem dinheiro para pagar e se o telefone é fixo ou celular.

---

## 2. Objetivo do Abductor

Construir uma ferramenta local de inteligência de vendas para:
* **Automatizar a triagem:** Varrer o Google Maps por nicho e cidade, descartando quem já tem site e separando apenas oportunidades quentes.
* **Calcular probabilidade de fechamento (Score):** Priorizar donos com caixa ativo (muitas avaliações e nota alta) e contato direto (celular/WhatsApp).
* **Acelerar a abordagem:** Permitir que o operador abra o WhatsApp com a mensagem personalizada pronta e registre o status da negociação em menos de 10 segundos por lead.
* **Meta financeira:** Criar um funil de prospecção diária capaz de levantar caixa rápido vendendo Sites Vitrine One-Page turnkey com ticket consolidado de **R$ 300,00 a R$ 850,00**.

---

## 3. Perfil de Cliente Ideal (ICP)

Nem todo negócio local vale a abordagem. O foco do Abductor é cirúrgico:

### ✅ Quem queremos abordar (Alta Conversão)
* **Profissionais liberais e clínicas:** Advogados (trabalhistas, imobiliários, previdenciários), dentistas/odontologia estética, médicos especialistas, psicólogos, clínicas de estética avançada e arquitetos.
* **Serviços especializados:** Oficinas de carros importados, instaladores de energia solar, marcenarias planejadas.
* **Características comuns:**
  * O ticket de um único cliente novo paga o valor do Site Vitrine (R$ 300 a R$ 450).
  * O próprio profissional ou sócio atende o WhatsApp diretamente.
  * O negócio já investe em fachada, equipe ou equipamentos (preza pela reputação e teme passivos legais).

### ❌ Quem descartamos (Baixa Conversão / Gargalo)
* **Alimentação e varejo popular:** Hamburguerias de bairro, lanchonetes, bazares e lojas de roupas (margem curta, preferem iFood ou catálogo simples).
* **Serviços de emergência rápida:** Chaveiros, borracharias, desentupidoras (o cliente só clica no botão "Ligar", raramente lê páginas).
* **Grandes empresas ou hospitais:** Estruturas com recepção blindada, ramais e burocracia corporativa onde a mensagem nunca chega no tomador de decisão.

---

## 4. Esteira de Monetização & Precificação

Para maximizar o faturamento com entrega em 24h, o modelo entrega uma presença perene completa de entrada e monetiza a tração com upsells opcionais:

```
[ ETAPA 1: FECHAMENTO RÁPIDO ]
Site Vitrine One-Page Perene (Turnkey Institucional com Front-end Puro)
├── Criação e personalização visual com identidade do nicho
├── Deploy na Vercel ou GitHub Pages com SSL automático (custo zero de servidor)
├── Blindagem Técnica LGPD Embarcada Nativa (Banner de cookies + página/modal de privacidade formal)
├── Botão flutuante de agendamento direto no WhatsApp
└── Valor Base: R$ 300,00 a R$ 450,00 à vista (Pix)

[ ETAPA 2: UPSELLS DE ALAVANCAGEM NA CONVERSA ]
├── + R$ 150 a R$ 200: Otimização de Google Meu Negócio (GMB)
│   (Revisão de categorias primárias/secundárias, fotos da estrutura e lista de serviços)
└── + R$ 200 a R$ 300: Setup de Google Ads Local
    (Criação de campanha de pesquisa local na cidade com palavras-chave de intenção de compra)

[ TICKET FINAL CONSOLIDADO ]
R$ 650,00 a R$ 850,00 por cliente fechado
```

---

## 5. Jornada do Usuário no Sistema

O fluxo de uso diário foi desenhado para eliminar qualquer atrito manual:

1. **Definição da Busca:** O usuário abre o painel local, escolhe a categoria no dropdown (ex: `Advogado`), informa a cidade (`Uberlândia`) e opcionalmente o bairro (`Centro`).
2. **Checagem de Cache Inteligente:** Se a busca foi concluída com sucesso anteriormente, os dados carregam em `<100ms` exibindo a data da coleta. Se o status anterior foi `FAILED`, uma nova varredura é disparada automaticamente.
3. **Disparo do Scraper (se necessário):** O backend aciona o `gosom` em segundo plano com atualização em tempo real do stepper de fases (`SCRAPING` ➔ `PARSING` ➔ `VALIDATING` ➔ `SCORING`).
4. **Triagem Instantânea:** A lista carrega com ordenação decrescente de Score. O usuário bate o olho nos cards de borda verde (Score $\ge 80$).
5. **Abordagem em 1 Clique:**
   * Clica em **Ver Script**: abre a mensagem personalizada com o nome limpo do escritório (`clean_business_name`), nota e cidade, com argumento técnico de conformidade LGPD.
   * Clica em **Abrir WhatsApp**: a conversa é iniciada com a mensagem pronta no navegador.
6. **Atualização do Mini-CRM:** O usuário muda o status do card de `NOVO` para `CONTATADO` ou `RECUSADO` (opt-out preservativo), persistindo no PostgreSQL.

---

## 6. Escopo do MVP

Para colocar a ferramenta em campo o mais rápido possível, as fronteiras de desenvolvimento estão travadas:

### 🟢 O que está DENTRO do escopo (Obrigatório)
* Execução 100% local no Arch Linux, com persistência em PostgreSQL 16 via Docker (NoCoW Btrfs).
* Motor de busca no Google Maps via `gosom/google-maps-scraper`.
* Lógica Cache-First com suporte a jobs assíncronos, watchdog passivo de timeout e coletas parciais.
* Validação automática de URLs com cabeçalhos reais e inspeção pós-redirect (neutraliza `bit.ly` apontando para redes sociais).
* Hard Gate no motor de Lead Scoring: zera o score de quem já tem site funcional e penaliza leads sem telefone (-30 pts).
* Identificação e formatação automática de números de WhatsApp (celular vs. fixo) via `phonenumbers`.
* Mini-CRM embutido no card (status da negociação, anotações rápidas e trava de opt-out).
* Edição inline de telefone, Instagram e notas comerciais no próprio card.
* Abertura do WhatsApp com a mensagem do script pré-preenchida via `?text=${encodeURIComponent(mensagem)}` na URL `wa.me`.
* Higienização de razão social via `clean_business_name` (elimina `LTDA`, `ME` nos scripts).
* Página central de Scripts de Vendas (`/abordagens`) e Playbook de Recursos (`/playbook`).
* Exportação do arquivo `site.config.json` turnkey em 1 clique no card do lead.
* Botão de Google Dork para localizar redes sociais do lead em um clique.

### 🔴 O que está FORA do escopo (Não fazer agora)
* Multi-usuário, autenticação por login/senha ou deploy em nuvem (SaaS).
* Integração direta com APIs oficiais pagas do Google Cloud.
* Criação automatizada de sites por IA dentro do sistema.
* Disparo em massa de mensagens no WhatsApp (risco alto de banimento de chip).
* Raspagem profunda da data individual de cada avaliação no Google Maps (lenta e com risco de bloqueio de IP).

---

## 7. Critérios de Sucesso do MVP

O sucesso do Abductor será medido por métricas práticas de operação:

* **Tempo de triagem:** Identificar e qualificar 30 leads prontos para abordagem em menos de 3 minutos de operação.
* **Eficiência de contato:** Conseguir abordar pelo menos 15 profissionais por hora sem alternar entre abas do navegador para redigir mensagens.
* **Validação comercial:** Fechar os primeiros 3 a 5 projetos de Site Vitrine One-Page perene (recuperando todo o tempo investido no desenvolvimento do software).

---

## 🔗 Documentos Relacionados
* Voltar para a central: [[00 - MOC - Central de Controle]]
* Próximo passo técnico: [[02 - SRS - Requisitos do Sistema]]
* Estratégia de vendas detalhada: [[06 - PLAYBOOK - Abordagens e Vendas]]
