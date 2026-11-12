---
name: Abductor Cockpit
description: Tactical high-precision cockpit for local B2B prospecting and turnkey website delivery
colors:
  primary: "#d97706"
  primary-hover: "#b45309"
  primary-muted: "rgba(217, 119, 6, 0.15)"
  success: "#059669"
  success-muted: "rgba(5, 150, 105, 0.15)"
  warning: "#d97706"
  danger: "#e11d48"
  danger-muted: "rgba(225, 29, 72, 0.15)"
  neutral-bg: "#0c0a09"
  neutral-surface: "#1c1917"
  neutral-surface-raised: "#292524"
  neutral-border: "#292524"
  neutral-border-subtle: "rgba(255, 255, 255, 0.08)"
  neutral-text: "#f5f5f4"
  neutral-text-muted: "#a8a29e"
  neutral-text-dim: "#78716c"
typography:
  display:
    fontFamily: '"Instrument Serif", "Playfair Display", Georgia, serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: '"JetBrains Mono", "Fira Code", monospace'
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#0c0a09"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text-muted}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-pill-active:
    backgroundColor: "{colors.primary}"
    textColor: "#0c0a09"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  nav-pill-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text-muted}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
---

# Design System: Abductor Cockpit

## Overview

**Creative North Star: "O Cockpit Tático de Alta Precisão"**

O Abductor é uma bancada operacional de alta performance para extração, triagem e fechamento de clientes em escala. Sua estética visual é inspirada em ferramentas profissionais de ponta (Linear, Raycast Dark, Bloomberg Terminal e instrumentos de telemetria militar stealth), onde a densidade de dados, o contraste cirúrgico e a ausência de elementos decorativos desnecessários definem a experiência do operador.

A interface opera em uma atmosfera escura contínua, combinando carvão profundo (`#0c0a09`), superfícies de painel de pedra escura (`#1c1917`) e micro-bordas de 1px com iluminação sutil (`#292524`). O visual rejeita deliberadamente gradientes caóticos, sombras neon difusas, cantos arredondados infantis e bordas cartunescas. Cada componente visual existe para servir à velocidade de julgamento do operador: saber instantaneamente qual lead contatar, qual telefone é móvel e disparar o pitch em 1 clique.

**Key Characteristics:**
- **Atmosfera Tática Escura:** Fundo carvão profundo com textura imperceptível de granulação (noise 2.5%) que elimina o aspecto de plástico fosco.
- **Tonal Layering de Precisão:** Profundidade construída por hierarquia de tons de cinza e micro-bordas sutis de 1px, sem sombras difusas pesadas.
- **Acentos Funcionais Estritos:** Âmbar Tático (`#d97706`) reservado para gatilhos primários de ação e foco; Esmeralda Radar (`#059669`) para validações de alta conversão e score 80+.
- **Economia Cognitiva:** Abas organizadas em 'segmented control' limpo, botões com padding balanceado e tipografia mono com números tabulares para leitura instantânea.

## Colors

Paleta sóbria de alto contraste funcional baseada em tons de pedra e carvão, pontuada por sinais de telemetria âmbar e esmeralda.

### Primary
- **Amber Signal** (`#d97706` / hover: `#b45309`): Identidade principal de ação. Usado no botão de disparo da busca, no link direto do WhatsApp ativo e no indicador de aba corrente.
- **Amber Highlight / Muted** (`rgba(217, 119, 6, 0.15)`): Fundo de badges de status em prospecção e estados de foco/seleção.

### Secondary
- **Radar Emerald** (`#059669` / light: `#10b981`): Sinal de alta conversão. Usado para leads com Score $\ge 80$, status de pipeline `FECHADO (PIX)`, celulares validados e indicador de API online.
- **Emerald Muted** (`rgba(5, 150, 105, 0.15)`): Fundo sutil de chips de sucesso e cartões com pontuação de elite.

### Tertiary (Alertas & Exceções)
- **Signal Rose** (`#e11d48` / `#be123c`): Erros críticos, leads recusados (opt-out), sites quebrados ou API offline.

### Neutral
- **Void Black** (`#0c0a09`): Fundo global da bancada (`body`).
- **Carbon Surface** (`#1c1917`): Superfície de cards, modais e containers de abas.
- **Raised Surface** (`#292524`): Superfície de botões secundários, inputs em repouso e divisores.
- **Micro Border** (`#292524` / `rgba(255, 255, 255, 0.08)`): Contorno de 1px em todos os painéis e cartões.
- **Primary Text** (`#f5f5f4`): Títulos, dados principais do lead e texto de destaque.
- **Muted Text** (`#a8a29e`): Rótulos, descrições secundárias e ícones inativos.
- **Dim Text** (`#78716c`): Metadados de baixa prioridade, carimbos de data/hora e dicas.

### Named Rules
**The Single Primary Action Rule.** Cada bloco visual ou modal possui no máximo UM botão primário com preenchimento sólido em Âmbar Signal. Todas as ações concorrentes devem ser botões secundários em Carbon Surface ou botões ghost discretos.
**The Status-Only Accent Rule.** As cores esmeralda e rosa são puramente semânticas: nunca use esmeralda para decoração ou botões comuns; reserve-a estritamente para status de sucesso, validação e pontuação alta.

## Typography

**Display Font:** "Instrument Serif", "Playfair Display", Georgia, serif  
**Body Font:** Inter, system-ui, -apple-system, sans-serif  
**Data/Mono Font:** "JetBrains Mono", "Fira Code", ui-monospace, monospace  

**Character:** Contraste sofisticado entre a autoridade clássica da serif na marca e a neutralidade mecânica de precisão da sans-serif e mono para leitura rápida de métricas e tabelas.

### Hierarchy
- **Display / Brand** (`font-serif`, 700, 1.25rem - 1.5rem, line-height 1.2, tracking-tight): Logotipo "ABDUCTOR" e títulos institucionais do playbook.
- **Headline** (`font-sans`, 600, 1.125rem / 18px, line-height 1.3): Títulos de seções, cabeçalhos de modais e colunas do Kanban.
- **Title** (`font-sans`, 600, 0.875rem / 14px, line-height 1.4): Nome do estabelecimento no card do lead e títulos de formulário.
- **Body** (`font-sans`, 400, 0.875rem / 14px, line-height 1.5): Endereço, notas operacionais, roteiros de abordagem e descrições.
- **Label / Metric** (`font-mono`, 500, 0.75rem / 12px, tabular-nums, tracking-wide): Pontuação (Score), contadores numéricos, telefones sanitizados e badges de status.

### Named Rules
**The Tabular Precision Rule.** Qualquer número, telefone, valor em R$ ou contagem de leads DEVE usar a classe `tabular-nums font-mono` para alinhamento vertical estrito e sem tremor visual durante atualizações.

## Layout

- **Modelo Espacial:** Grid responsivo fluido com container máximo de `max-w-[1920px]` centralizado, desenhado para telas ultrawide e monitores de alta resolução.
- **Header Global Fixo:** Barra de navegação `sticky top-0 z-30` com altura balanceada, efeito `backdrop-blur-md` e borda inferior sutil de 1px.
- **Ritmo de Espaçamento:** Escala de 4 passos fundamentais:
  - `gap-1` / `gap-1.5` (4px - 6px): Entre abas de navegação e ícones com texto.
  - `gap-3` / `p-3.5` (12px - 14px): Padding interno de cards e controles de formulário.
  - `gap-4` / `p-4` (16px): Espaçamento padrão entre cartões e colunas.
  - `gap-6` / `p-6` (24px): Padding externo da página e modais estruturais.

## Elevation & Depth

O sistema rejeita sombras difusas pesadas ou caixas flutuantes que poluem telas de monitoramento. A profundidade é puramente tonal (**Tonal Layering**):
- Nível 0 (Fundo): `#0c0a09` (Void Black)
- Nível 1 (Bancadas & Painéis): `#1c1917` (Carbon Surface) com borda de 1px `#292524`
- Nível 2 (Cards & Controles): `#1c1917` elevado por micro-borda destacada (`border-stone-800` ou `border-amber-600/40` quando ativo)
- Nível 3 (Modais & Drawers): Fundo `#1c1917` sobre backdrop semi-transparente escuro (`bg-black/75 backdrop-blur-sm`) com borda perimetral de 1px.

### Named Rules
**The Border-As-Light Rule.** A separação entre elementos em dark mode nunca depende de sombra projetada, mas de uma micro-borda de 1px com iluminação sutil (`border-stone-800` ou `rgba(255, 255, 255, 0.08)`).

## Shapes

- **Cantos Disciplinados:**
  - `rounded-lg` (8px): Botões de ação, inputs de busca, tags e abas individuais.
  - `rounded-xl` (12px): Cards de leads, caixas de busca, painel de abas e modais.
  - `rounded-full` (9999px): Indicadores de status da API e bolinhas de status vivo.
- **Proibição de Formas:** Botões retangulares de ação NUNCA devem usar `rounded-full` (estilo pill gigante). Eles devem manter cantos precisos de 8px para reforçar a sensação de comando tático.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px).
- **Primary:** `bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-4 py-2 transition-all duration-150 active:scale-[0.98]`.
- **Secondary:** `bg-stone-900 border border-stone-700 hover:border-stone-600 hover:bg-stone-800 text-stone-200 font-medium px-3.5 py-2`.
- **Ghost:** `bg-transparent hover:bg-stone-800/60 text-stone-400 hover:text-stone-100 px-3 py-2`.
- **Icon Buttons:** `h-8 w-8 rounded-lg flex items-center justify-center border border-stone-800 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-stone-700`.

### Navigation Tabs (Segmented Control)
- **Container:** `bg-stone-900/90 border border-stone-800 p-1 rounded-xl flex items-center gap-1`.
- **Aba Ativa:** `bg-amber-600 text-stone-950 font-semibold shadow-sm rounded-lg px-3.5 py-2 text-xs flex items-center gap-2`.
- **Aba Inativa:** `text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 font-medium rounded-lg px-3.5 py-2 text-xs flex items-center gap-2 transition-colors duration-150`.

### Cards (LeadCard)
- **Container:** `bg-stone-900/90 border border-stone-800 hover:border-stone-700 rounded-xl p-4 transition-all duration-200`.
- **Borda de Score Alto:** Quando `score >= 80`, a borda esquerda ou contorno ganha acento `border-emerald-600/70` com badge de destaque.

### Inputs / Fields
- **Container:** `bg-stone-900 border border-stone-700 focus-within:border-amber-600 text-stone-100 rounded-lg px-3 py-2 text-sm placeholder:text-stone-500 transition-colors`.

### Chips / Status Badges
- **Shape:** `rounded-md px-2 py-0.5 text-xs font-mono font-medium border`.
- **Variantes:**
  - Novo: `border-stone-700 bg-stone-800 text-stone-200`
  - Contatado: `border-amber-600/50 bg-amber-600/15 text-amber-300`
  - Fechado: `border-emerald-600/50 bg-emerald-600/20 text-emerald-300`
  - Recusado: `border-rose-700/60 bg-rose-950/40 text-rose-300`

## Do's and Don'ts

### Do:
- **Do** manter a quantidade e o propósito de todas as abas e botões existentes, preservando o fluxo de memória muscular do operador.
- **Do** usar `tabular-nums font-mono` em todo número, pontuação ou telefone para evitar tremores visuais.
- **Do** usar o botão âmbar sólido exclusivamente para a ação principal de cada bloco (ex: Disparar Prospecção, Abrir WhatsApp).
- **Do** adotar micro-bordas de 1px com contraste sutil para separar cartões e seções em vez de sombras pesadas.
- **Do** fornecer estados de `:hover`, `:active` e `:focus-visible` táteis em todos os elementos clicáveis.

### Don't:
- **Don't** aplicar gradientes multicoloridos ou efeitos de neon/glow artificial.
- **Don't** usar botões estilo pill gigante (`rounded-full`) em ações e formulários retangulares.
- **Don't** esconder informações essenciais atrás de cliques desnecessários: o cockpit prioriza scanability rápida.
- **Don't** usar verde ou vermelho fora de contextos semânticos de validação, sucesso ou erro.
