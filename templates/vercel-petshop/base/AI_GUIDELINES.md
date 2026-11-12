# 🐾 DIRETRIZES TÉCNICAS E ÉTICAS PARA ASSISTENTES DE IA (`AI_GUIDELINES.md`)

> **Documento de Instrução Permanente de Sistema.**
> Este arquivo governa qualquer personalização, geração de conteúdo ou edição realizada por agentes de IA na esteira de templates `templates/vercel-petshop/`.

---

## 1. Escopo e Propósito

O template contido neste diretório é um **Site Vitrine One-Page Turnkey** projetado para Pet Shops, Centros de Estética Animal (Banho & Tosa), Clínicas Veterinárias e Hotéis/Creches Pet com forte reputação local no Google Maps.

Toda personalização para um cliente específico deve ocorrer exclusivamente por meio da edição do arquivo `site.config.json` ou inclusão de fotos/ilustrações na pasta `assets/`, preservando a arquitetura de arquivo único autossuficiente (`index.html`).

---

## 2. O Que Pode Ser Editado Livremente (Permissões)

A IA tem autorização total para personalizar no `site.config.json`:

1. **Dados Institucionais (`business`):**
   - `name`: Nome comercial limpo (sem `LTDA`, `ME`, `EPP`, `CNPJ`).
   - `tagline`: Headline afetuosa e profissional destacando os diferenciais do espaço.
   - `city`, `state`, `address_display`, `phone_display`, `office_hours`.
   - `whatsapp_number`: Apenas dígitos numéricos com DDI `55` (ex.: `5534998765432`).
   - `crmv_number`: Nome e registro do Médico Veterinário Responsável Técnico (`CRMV/UF`) quando a clínica veterinária estiver ativa.
   - `taxi_dog_enabled` (`true` ou `false`) e `taxi_dog_message`.

2. **Paleta de Cores (`theme` e `visuals`):**
   - Escolher qualquer um dos **5 presets homologados**:
     1. `teal-honey` (Turquesa Spa `#0d9488` & Mel Vibrante `#f59e0b` — Padrão Claro)
     2. `sage-earth` (Verde Sálvia `#6096ba` & Terracota `#e76f51` — Natural/Eco Vet Claro)
     3. `lavender-mint` (Lavanda Spa `#8b5cf6` & Menta `#10b981` — Grooming Delicado Claro)
     4. `navy-sunshine` (Azul Náutico `#3b82f6` & Amarelo Solar `#f59e0b` — Centro Veterinário Claro)
     5. `boutique-dark` (Preto Quente `#121214` & Âmbar Caramelo `#d97706` — Estética Animal de Luxo Escuro)

3. **Itens, Textos e Mensagens dos 4 Pilares (`pillars`):**
   - Títulos (`title`), subtítulos (`subtitle`), descrições (`description`), listas de itens (`items`), detalhes de protocolo (`details`) e mensagens contextuais de WhatsApp (`whatsapp_message`).

4. **Avaliações Reais (`testimonials`):**
   - Inserir **somente** avaliações verídicas extraídas literalmente da ficha do Google Maps do cliente.
   - Caso não haja avaliações em texto selecionadas, manter `"testimonials": []` para acionar automaticamente o **Banner de Reputação Verificada do Google Maps**.

---

## 3. Como Ativar ou Desativar Cada Pilar no `site.config.json`

O template adapta automaticamente o seu grid visual (sem buracos ou espaços vazios) conforme a quantidade de pilares ativos (1, 2, 3 ou 4 pilares):

- **Método 1 (Chave Booleana `enabled`):**
  Em cada objeto dentro do array `"pillars"`, defina `"enabled": true` para exibir o pilar ou `"enabled": false` para ocultá-lo:
  - `id: "grooming"` ➔ 🛁 Estética Animal & Banho e Tosa
  - `id: "veterinary"` ➔ 🩺 Clínica Veterinária & Vacinação
  - `id: "petshop"` ➔ 🛍️ Pet Shop & Farmácia Veterinária
  - `id: "hotel"` ➔ 🏨 Hotelzinho, Daycare & Creche

- **Método 2 (Omissão no Array `pillars`):**
  O modal do Cockpit Abductor pode exportar apenas os objetos dos pilares selecionados dentro do array `"pillars"`. O motor de renderização recomporá o layout automaticamente:
  - **1 pilar ativo:** Layout Hero Expandido + Sub-grade de 4 cards com os serviços específicos do pilar.
  - **2 pilares ativos:** Grid simétrico de 2 colunas amplas (`lg:grid-cols-2`).
  - **3 pilares ativos:** Bento Grid de 3 colunas (`lg:grid-cols-3`).
  - **4 pilares ativos:** Bento Grid 2x2 equilibrado (`md:grid-cols-2`).

- **Serviço de Táxi Dog (Leva e Traz):**
  Controlado pela chave `"business.taxi_dog_enabled": true | false`.

---

## 4. O Que é Estritamente PROIBIDO (Guardrails Éticos e Técnicos)

1. **PROIBIDO Inventar Depoimentos Falsos (Regra Zero Fake):**
   - Nunca crie nomes fictícios de tutores ou avaliações inventadas. Quando não houver avaliações reais copiadas do Google Maps, mantenha `"testimonials": []`.
2. **PROIBIDO Violar as Resoluções do CFMV (nº 1.649/2025 e nº 1.675/2025):**
   - Nunca prometa curas veterinárias milagrosas, procedimentos cirúrgicos "100% sem risco" ou divulgue tabelas abertas de preços de consultas e cirurgias veterinárias na vitrine.
   - Se o pilar `"veterinary"` estiver ativo, preserve a identificação do Responsável Técnico (`CRMV/UF`) no rodapé.
3. **PROIBIDO Quebrar a Arquitetura de Arquivo Único:**
   - Não introduza bundlers pesados, React, Vue ou múltiplos arquivos CSS/JS externos bloqueantes. O `index.html` deve permanecer autossuficiente para carregar em menos de 0.5s em conexões móveis 4G.
