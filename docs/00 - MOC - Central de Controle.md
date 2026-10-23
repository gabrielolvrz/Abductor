---
title: Abductor - Map of Content (MOC)
project: Abductor
type: moc
tags:
  - moc
  - prospecção
  - scraping
  - mvp
  - vendas
created: 2026-10-22
status: em-construcao
---

# 🛸 Abductor — Central de Controle (MOC)

> O **Abductor** é um sistema local de inteligência de prospecção e fechamento rápido de **Sites Vitrine One-Page perenes (Turnkey Sites Institucionais)** com **conformidade LGPD nativa embarcada como diferencial técnico** (R$ 300 a R$ 850). Ele varre o Google Maps, filtra profissionais liberais com alta reputação física e presença digital amadora (Linktree, WhatsApp cru ou sem site), calcula um score de conversão com Hard Gate e entrega o lead pronto para contato direto.

---

## 🧭 Mapa de Navegação da Documentação

Cada arquivo desta pasta responde a uma necessidade técnica ou operacional específica. Use os links para navegar sem sobrecarga mental:

```
📁 Abductor/ 
├── 📑 00 - MOC - Central de Controle.md <-- Você está aqui 
├── 📄 [[01 - PRD - Visao de Produto]] 
├── 📄 [[02 - SRS - Requisitos do Sistema]] 
├── 📄 [[03 - SDD - Arquitetura e Engenharia]] 
├── 📄 [[04 - DATA - Modelagem e Banco]] 
├── 📄 [[05 - ADR - Decisoes de Arquitetura]] 
├── 📄 [[06 - PLAYBOOK - Abordagens e Vendas]] 
├── 📄 [[07 - TEMPLATES - Verticais e Boilerplates]] 
├── 📄 [[08 - RUNBOOK - Setup da Maquina]] 
└── 📄 [[09 - TASKS - Checklist de Execucao]]
```

---

## 📚 Índice Modular de Documentos

### 🎯 1. Produto e Negócio
* **[[01 - PRD - Visao de Produto]]:** O coração da oferta. Explica o problema de mercado, as personas (advogados, dentistas, corretores), a esteira de monetização (Site Vitrine One-Page perene com LGPD nativa de entrada + upsells em Google Meu Negócio e Google Ads Local) e os limites de escopo do MVP.
* **[[06 - PLAYBOOK - Abordagens e Vendas]]:** O roteiro de combate. Scripts de abordagem focados em presença institucional definitiva e blindagem jurídica contra riscos regulatórios da LGPD, quebra de objeções e checklists práticos de entrega em 24h.

### ⚙️ 2. Engenharia e Requisitos
* **[[02 - SRS - Requisitos do Sistema]]:** O manual do software. Requisitos Funcionais (RF) e Não Funcionais (RNF), regras de validação determinística de URLs com anti-redirect de encurtadores, critérios de sanitização de telefone (`phonenumbers`), penalidade para incontactáveis e a fórmula do Lead Scoring (0 a 100) com Hard Gate e clamping.
* **[[03 - SDD - Arquitetura e Engenharia]]:** O projeto estrutural. Topologia do sistema, fluxo de comunicação assíncrona com o scraper em Go (`gosom`), sincronização de `progress_phase`, watchdog passivo de timeout e motor assíncrono `httpx`.
* **[[05 - ADR - Decisoes de Arquitetura]]:** O porquê das escolhas. Registro histórico das 11 decisões críticas (ADR 001 a ADR 011): relação N:N, modelo híbrido com `mise`, descarte de reviews profundas iniciais, NoCoW no Btrfs, Hard Gate, tasks locais in-process com watchdog e posicionamento turnkey institucional com LGPD nativa.

### 💾 3. Dados e Infraestrutura
* **[[04 - DATA - Modelagem e Banco]]:** O esquema do banco. DDL SQL completo para PostgreSQL 16 com `citext` e `gen_random_uuid()`, chave única de busca, `progress_phase`, integridade N:N (`searches` $\leftrightarrow$ `leads`), subquery global `EXISTS` para alerta de telefone compartilhado e configuração NoCoW no Btrfs.
* **[[08 - RUNBOOK - Setup da Maquina]]:** Como subir tudo. Comandos diretos de terminal para Arch Linux: criação do volume NoCoW, subida do `docker compose` com healthcheck estável, ativação de runtimes no `mise`, script executável unificado `abductor.sh` no Hyprland e resolução de permissões.

### 🚀 4. Escala e Execução
* **[[07 - TEMPLATES - Verticais e Boilerplates]]:** O plano de modularidade. Como isolar regras de negócio, pesos e boilerplates de Sites Vitrine One-Page por profissão, gerando o arquivo `site.config.json` turnkey em 1 clique via API com conformidade LGPD nativa.
* **[[09 - TASKS - Checklist de Execucao]]:** O backlog prático. Tarefas divididas em 8 fases de desenvolvimento (Setup Host, Banco, Scraper, Motores, API FastAPI, Cockpit React, Templates e Validação em Campo) para acompanhar o progresso diário sem atrito.

---

## ⚡ Guia Rápido: O que consultar quando...

| Situação no dia a dia | Onde ir |
| :--- | :--- |
| **"Preciso ajustar os campos das tabelas ou criar uma migration"** | ➔ `[[04 - DATA - Modelagem e Banco]]` |
| **"Tô na dúvida de quantos pontos dar para um lead com Linktree ou sem telefone"** | ➔ `[[02 - SRS - Requisitos do Sistema]]` |
| **"Como o FastAPI gerencia os jobs do scraper e o watchdog sem travar a tela?"** | ➔ `[[03 - SDD - Arquitetura e Engenharia]]` |
| **"Por que não estamos usando Celery/Redis para filas em background?"** | ➔ `[[05 - ADR - Decisoes de Arquitetura]]` *(ADR 010)* |
| **"O lead respondeu no WhatsApp, como quebro a objeção e puxo o upsell?"** | ➔ `[[06 - PLAYBOOK - Abordagens e Vendas]]` |
| **"O container do gosom ou do postgres não sobe ou acusa erro de permissão"** | ➔ `[[08 - RUNBOOK - Setup da Maquina]]` |
| **"Quero criar uma vertical especializada em clínicas de estética"** | ➔ `[[07 - TEMPLATES - Verticais e Boilerplates]]` |

---

## 🛠️ Resumo da Arquitetura do Host

* **Ambiente:** Arch Linux (Kernel Linux/Linux-LTS) no host `Arch-Logos` sob Wayland / Hyprland.
* **Hardware:** Intel Xeon E5-2670 v3 (24 threads) + AMD RX 580 + Filesystem Btrfs.
* **Inicializador do Cockpit:** Script executável `~/.local/bin/abductor` que sobe Docker, Kitty e abre o navegador.
* **Serviços em Docker:** PostgreSQL 16 (volume persistente em `./data/postgres` com `chattr +C`) e container autônomo do `gosom/google-maps-scraper`.
* **Serviços Nativos:** Backend FastAPI (Python via `mise`) e Frontend Vite + React + TS (Node.js via `mise`).
