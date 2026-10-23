---
title: Abductor - Verticais e Boilerplates Modulares (TEMPLATES)
project: Abductor
type: templates
tags:
  - templates
  - boilerplates
  - frontend
  - modularidade
  - landing-pages
  - automacao
created: 2026-10-22
status: aprovado
---

# 🧩 07 - TEMPLATES — Verticais e Boilerplates Modulares

> Especificação de arquitetura modular do **Abductor**. Este documento orienta como isolar pesos de Lead Scoring, scripts de abordagem e templates visuais de Sites Vitrine One-Page por profissão, permitindo lançar e entregar soluções para novos nichos em minutos sem tocar no código central do sistema.

---

## 1. Por que Modularizar em Verticais?

Quando você vende um Site Vitrine One-Page perene por R$ 300 a R$ 450 e entrega em 24 horas, **cada minuto gasto ajustando código é margem de lucro perdida**. 

Tentar criar uma página do zero a cada cliente inviabiliza o negócio. Por outro lado, usar um modelo genérico ("Site para Empresas") gera páginas frias que não passam autoridade.

O segredo do Abductor é o desacoplamento em **Módulos Verticais**:
* O **Core do Sistema** (Scraper, FastAPI, Banco PostgreSQL, Frontend do Dashboard) permanece genérico e estável.
* As **Regras do Nicho** (pesos de avaliações, termos de busca e roteiros de abordagem) ficam confinadas em arquivos isolados de configuração.
* Os **Modelos de Site Vitrine One-Page** ficam pré-construídos em diretórios independentes, prontos para receber os dados do cliente e subir na Vercel com um comando de terminal.

---

## 2. Estrutura de Diretórios dos Módulos Verticais

As verticais se dividem entre a inteligência de prospecção (Backend) e os templates de entrega rápida (Frontend):

> [!IMPORTANT]
> **Fonte da verdade em runtime:** o PostgreSQL (`pitch_scripts`, `searches` e `leads`). Os arquivos `rules.json` e `pitches.json` em `backend/app/verticals/` são apenas **seeds iniciais** carregados no boot da aplicação. Edições feitas em `/abordagens` são persistidas na tabela `pitch_scripts` e não sobrescrevem os arquivos.

```text
abductor/
├── backend/
│   └── app/
│       └── verticals/                     # Seeds iniciais de nicho (runtime = PostgreSQL)
│           ├── _shared/                   # Fallback padrão
│           │   ├── default_rules.json
│           │   └── default_pitches.json
│           ├── advocacia/                 # Vertical: Advocacia
│           │   ├── rules.json             # Calibração de scoring e termos do Maps
│           │   └── pitches.json           # Modelos de WhatsApp para advogados
│           ├── odonto/                    # Vertical: Clínicas Odontológicas
│           │   ├── rules.json
│           │   └── pitches.json
│           └── imobiliario/               # Vertical: Corretores e Imobiliárias
│               ├── rules.json
│               └── pitches.json
│
└── templates/                             # Boilerplates de Sites Vitrine One-Page (Deployáveis)
    └── vercel-advocacia/                  # Esteira de produção da vertical Advocacia
        ├── README.md                      # Guia operacional de duplicação e deploy Vercel
        ├── base/                          # Molde mestre imutável (HTML + Tailwind + site.config.json)
        │   ├── index.html                 # Single-page responsiva com suporte a 5 temas
        │   ├── privacidade.html           # Termos e política de privacidade LGPD dinâmicos
        │   ├── site.config.json           # Molde canônico de configuração
        │   └── assets/                    # Favicon e imagens padrão
        └── clientes/                      # Instâncias locais geradas por cliente (gitignored)
            └── .gitkeep
```

## 3. Especificação do `rules.json` (Calibração do Backend)

Cada pasta de vertical em `backend/app/verticals/{nicho}/rules.json` define como o motor de Lead Scoring deve tratar aquele tipo de profissional:

  

```json
{
  "slug": "advocacia",
  "display_name": "Advogados e Escritórios de Advocacia",
  "search_terms": [
    "Advogado Trabalhista",
    "Advogado Imobiliário",
    "Advogado Previdenciário",
    "Advogado de Família",
    "Escritório de Advocacia"
  ],
  "scoring": {
    "reviews_threshold_high": 15,
    "reviews_points_high": 25,
    "reviews_threshold_mid": 5,
    "reviews_points_mid": 15,
    "rating_ideal_min": 4.5
  },
  "blocked_terms_in_name": [
    "Defensoria",
    "OAB",
    "Tribunal",
    "Fórum",
    "Sindicato"
  ],
  "dork_pattern": "\"{name}\" \"{city}\" (site:instagram.com OR site:linkedin.com)"
}
```

> [!NOTE]
> O `rules.json` não possui multiplicador de score. O backend aplica `Score Final = max(0, min(100, round(Score_Calculado)))`; qualquer calibração de nicho deve respeitar esse teto para não violar a constraint `chk_leads_score_range` do PostgreSQL.

### Explicação dos Campos:

- **`search_terms`:** Termos exatos injetados no dropdown de busca da interface para garantir os melhores resultados no Google Maps.
    
      
    
- **`scoring`:** Limiares customizados de prova social. Um escritório com 15 avaliações já ganha pontuação máxima de reviews (+25 pts).
    
      
    
- **`blocked_terms_in_name`:** Filtro pré-processamento consumido diretamente pelo pipeline de ingestão do backend (`services/ingestion.py`). Se o nome retornado pelo Maps contiver termos públicos, governamentais ou institucionais (como _Defensoria Pública_, _Fórum_, _OAB_, _Tribunal_), o registro é descartado na fase de parsing do CSV antes de disparar checagens de rede ou Lead Scoring.
    
      
    
- **`dork_pattern`:** Fórmula customizada do botão de busca rápida para o nicho.
    
      
    

## 4. O Boilerplate de Site Vitrine One-Page (Frontend Puro)

Os templates em `templates/vertical-{nicho}/` são projetados para rodar como **páginas estáticas puras** (HTML + Tailwind via CDN ou Vite estático), eliminando dependências de servidores, bancos de dados ou manutenções mensais.

  

### 4.1. Anatomia Obrigatória da Página de Alta Conversão

```text
┌────────────────────────────────────────────────────────┐
│ HEADER: Logo / Monograma + Botão WhatsApp Superior     │
├────────────────────────────────────────────────────────┤
│ HERO SECTION:                                          │
│ • Headline forte com benefício direto                  │
│ • Sub-headline com OAB e atuação regional              │
│ • Botão CTA Principal: "Falar com Especialista"        │
│ • Foto profissional ou Monograma heráldico             │
├────────────────────────────────────────────────────────┤
│ PROVA SOCIAL (Google Maps & Compliance OAB):           │
│ • Banner Verificado: "Nota 4.9 no Google Maps"         │
│ • "Mais de 40 avaliações verificadas"                  │
│ • Zero avaliações fakes (OAB Provimento 205/2021)      │
├────────────────────────────────────────────────────────┤
│ ÁREAS DE ATUAÇÃO / SERVIÇOS:                           │
│ • 3 cards com hover suave, borda iluminada e ícones    │
├────────────────────────────────────────────────────────┤
│ COMO FUNCIONA O ATENDIMENTO (3 PASSOS):                │
│ • 1. Contato Inicial ➔ 2. Análise ➔ 3. Solução         │
├────────────────────────────────────────────────────────┤
│ SOBRE O ESCRITÓRIO & FAQ:                              │
│ • Estrutura física, dados institucionais e 4 FAQs      │
├────────────────────────────────────────────────────────┤
│ FOOTER: Endereço, Horários, Link LGPD + Copyright      │
│ + BOTÃO FLUTUANTE DE WHATSAPP FIXO NO CANTO INFERIOR   │
└────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Conformidade OAB (Provimento 205/2021):** O template veta expressamente a fabricação de avaliações. Se `testimonials: []`, o site ativa automaticamente o banner institucional de reputação verificada do Google Maps. Depoimentos em texto só devem ser preenchidos quando forem extraídos de avaliações reais e autorizadas no Google Meu Negócio.

### 4.2. O Arquivo de Injeção Rápida (`site.config.json`)

Para não precisar abrir arquivos HTML para alterar dados simples, cada template consome um arquivo de configuração central. Para criar o site de um novo cliente, **você só altera este arquivo**:

```json
{
  "business": {
    "name": "Dr. Carlos Eduardo Advocacia & Consultoria",
    "tagline": "Atuação Jurídica Estratégica, Ética e Personalizada",
    "city": "Uberlândia",
    "state": "MG",
    "phone_display": "(34) 99876-5432",
    "whatsapp_number": "5534998765432",
    "whatsapp_default_message": "Olá! Gostaria de agendar uma avaliação jurídica sobre o meu caso.",
    "address_display": "Av. Rondon Pacheco, 2100 - Saraiva, Uberlândia - MG",
    "oab_number": "OAB/MG Sob Consulta",
    "office_hours": "Segunda a Sexta, das 09h às 18h"
  },
  "theme": {
    "preset": "navy-gold",
    "mode": "dark",
    "backgroundColor": "#0f172a",
    "surfaceColor": "#162032",
    "primaryText": "#f8f6f0",
    "bodyText": "#94a3b8",
    "accentColor": "#c5a059",
    "borderColor": "#1e293b"
  },
  "visuals": {
    "theme_preset": "navy-gold",
    "theme_mode": "dark",
    "use_profile_photo": false,
    "profile_photo_url": "./assets/doutor.svg",
    "monogram_initials": "CE"
  },
  "metrics": {
    "rating": "4.9",
    "reviews_count": 48,
    "years_experience": "+12",
    "cases_count": "+650"
  },
  "services": [
    {
      "title": "Rescisão Indireta e Verbas Trabalhistas",
      "description": "Cálculo detalhado de haveres rescisórios, equiparação salarial e proteção integral."
    },
    {
      "title": "Acidentes de Trabalho e Doenças Ocupacionais",
      "description": "Reparação civil por danos materiais e morais com estabilidade provisória."
    },
    {
      "title": "Consultoria Trabalhista Preventiva",
      "description": "Assessoria e pareceres técnicos para alinhamento de rotinas e mitigação de passivos."
    }
  ],
  "testimonials": [],
  "faq": [
    {
      "question": "Como funciona o primeiro contato e a avaliação do caso?",
      "answer": "O primeiro contato é realizado diretamente pelo WhatsApp institucional do escritório."
    }
  ],
  "compliance": {
    "enable_lgpd_banner": false,
    "privacy_policy_url": "/privacidade.html"
  }
}
```

### 4.3. Curadoria dos 5 Presets Visuais de Alto Padrão

O template e o modal de exportação no Cockpit suportam 5 presets corporativos balanceados (3 escuros e 2 claros):

1. **`navy-gold` (Azul Marinho Profundo & Ouro Nobre - Dark):**
   - Fundo `#0f172a`, Superfície `#162032`, Acento `#c5a059`.
   - Ideal para escritórios generalistas e contencioso corporativo.
2. **`sovereign-dark` (Preto Ônix & Dourado Champanhe - Dark):**
   - Fundo `#0d0f12`, Superfície `#161a1f`, Acento `#d4af37`.
   - Estilo imponente de bancas de fusões e aquisições (M&A).
3. **`espresso-amber` (Café Espresso & Âmbar Quente - Dark):**
   - Fundo `#120e0b`, Superfície `#1c1612`, Acento `#d97706`.
   - Calidez e prestígio tradicional (Família, Sucessões, Agronegócio).
4. **`oxford-linen` (Cinza Nobre / Oxford & Ouro Velho - Light):**
   - Fundo `#f8f6f0`, Superfície `#ffffff`, Acento `#b8860b`.
   - Papel linho nobre editorial, altíssimo contraste em ambientes claros.
5. **`atlantic-blue` (Branco Puro & Azul Real Corporativo - Light):**
   - Fundo `#f8fafc`, Superfície `#ffffff`, Acento `#1d4ed8`.
   - Estilo moderno internacional e compliance tributário.

> [!TIP]
> O endpoint `GET /api/leads/{id}/export-config` ou o modal de exportação do cockpit gera este arquivo automaticamente a partir dos dados do lead no Abductor, permitindo alternar fotos vs monograma e escolher qualquer uma das 5 paletas instantaneamente.

## 5. As 3 Verticais Iniciais Homologadas

### 🎯 Vertical 1: Advocacia e Consultoria Jurídica (`/advocacia`)

- **Tom Visual:** Sóbrio, elegante (Tons de azul marinho, cinza chumbo, detalhes dourados/âmbar).
    
      
    
- **Particularidades Éticas (OAB):**
    
      
    - Não usar termos mercantilistas ("Preços imperdíveis", "O melhor da cidade").
        
          
        
    - Usar verbos de consulta: _"Agende uma avaliação do seu caso"_, _"Fale diretamente com nossa equipe jurídica"_.
        
          
        
- **Diferencial de Entrada (LGPD Nativa):** O Site Vitrine One-Page já é entregue em conformidade com as diretrizes da ANPD e provimentos da OAB, com aviso de consentimento e termos formais de privacidade integrados, neutralizando riscos de denúncias ou autuações sem custo adicional para o cliente.
- **Gatilho de Upsell:** Otimização de Google Meu Negócio (+ R$ 150) e Google Ads Local (+ R$ 200 a R$ 300), pois advogados necessitam de buscas qualificadas no momento da dor jurídica.
    
      
    

### 🎯 Vertical 2: Odontologia e Estética Facial (`/odonto`)

- **Tom Visual:** Limpo, clínico, moderno (Tons de branco puro, ciano/azul piscina, verde menta ou lilás suave para harmonização facial).
    
      
    
- **Particularidades:**
    
      
    - Foco em clareza de atendimento (se aceita convênios ou atende particular).
        
          
        
    - Destaque para fotos reais de antes/depois (com autorização) ou da infraestrutura com tecnologia moderna (cadeiras novas, raio-X digital).
        
          
        
- **Gatilho de Upsell:** Otimização de Google Meu Negócio (+ R$ 150) é prioritário, pois quase todas as buscas por dentistas ocorrem no Google Maps por proximidade do bairro.
    
      
    

### 🎯 Vertical 3: Corretores de Imóveis de Alta Performance (`/imobiliario`)

- **Tom Visual:** Imponente, minimalista (Preto, grafite, dourado ou verde esmeralda).
    
      
    
- **Particularidades:**
    
      
    - Apresentação em destaque de 3 a 4 imóveis da carteira (com fotos grandes, metragem, localização e valor de oportunidade).
        
          
        
    - Foco em contato rápido para agendar visitas via WhatsApp.
        
          
        
- **Gatilho de Upsell:** Google Ads Local (+ R$ 200 a R$ 300) é a venda mais rápida, porque corretores entendem que um clique qualificado de alguém procurando _"Apartamento à venda no Centro"_ pode virar uma comissão de R$ 15.000.
    
      
    

## 6. Pipeline de Customização e Deploy em 15 Minutos

Quando o cliente aprovar a proposta e fizer o Pix, o ciclo de entrega segue este passo a passo no terminal:

  

```bash
# 1. Duplicar o template mestre base para a pasta de instâncias do cliente
cp -r templates/vercel-advocacia/base templates/vercel-advocacia/clientes/advogado-carlos

# 2. Entrar na pasta do cliente
cd templates/vercel-advocacia/clientes/advogado-carlos

# 3. Exportar o site.config.json gerado pelo Cockpit ou via API
curl -s "http://localhost:8000/api/leads/<lead_id>/export-config" -o site.config.json

# 4. Revisar o JSON exportado (opcional) ou adicionar foto profissional em assets/
nvim site.config.json

# 5. Fazer deploy instantâneo na Vercel (Produção com SSL grátis)
vercel --prod --yes
```

O comando do Vercel CLI compila o HTML estático e devolve o link ativo com certificado HTTPS em menos de **30 segundos** (ex: `https://dr-carlos-advocacia.vercel.app`).

  

### Configuração de Domínio Próprio (.com.br)

Se o cliente quiser o domínio oficial dele (ex: `drcarlosadvocacia.com.br`):

  

1. Peça para ele registrar no **Registro.br** (R$ 40/ano) ou registre com os dados dele.
    
      
    
2. No painel da Vercel, clique em **Settings ➔ Domains ➔ Add Domain**.
    
      
    
3. No painel do Registro.br, aponte os DNS para os servidores da Vercel (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`) ou adicione o registro CNAME apontando para `cname.vercel-dns.com`.
    
      
    
4. Em 15 minutos o domínio próprio estará respondendo no ar com certificado SSL automático.
    
      
    

## 7. Como Criar uma Nova Vertical no Futuro

Para expandir o Abductor para um novo segmento (ex.: _Veterinárias e Pet Shops_):

  

1. **No Backend:** Crie a pasta `backend/app/verticals/veterinaria/` com os seeds iniciais (`rules.json` e `pitches.json`). Em runtime, os scripts editados em `/abordagens` vivem na tabela `pitch_scripts` do PostgreSQL.
    
      
    
2. Adicione o `rules.json` contendo os termos de busca (`"Clínica Veterinária"`, `"Hospital Veterinário 24h"`) e ajuste os limiares de prova social (`reviews_threshold_high`/`reviews_threshold_mid`), sempre respeitando o teto de 100 pontos.
    
      
    
3. Adicione o `pitches.json` com roteiros voltados para tutores de animais e emergências.
    
      
    
4. **No Frontend:** Duplique um dos templates visuais em `templates/vertical-veterinaria/` e adapte as cores e seções de serviços para cuidados animais.
    
      
    
5. Pronto: a nova categoria passa a ser triada no dashboard com pontuação calibrada e você tem um modelo pronto para entrega imediata.
    
      
    

## 🔗 Documentos Relacionados

- Voltar para a central: `[[00 - MOC - Central de Controle]]`
    
      
    
- Requisitos de Lead Scoring: `[[02 - SRS - Requisitos do Sistema]]`
    
      
    
- Scripts de abordagem e upsell: `[[06 - PLAYBOOK - Abordagens e Vendas]]`
    
      
    
- Setup da máquina local: `[[08 - RUNBOOK - Setup da Maquina]]`