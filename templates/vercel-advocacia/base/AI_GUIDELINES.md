# ⚖️ DIRETRIZES TÉCNICAS E ÉTICAS PARA ASSISTENTES DE IA (AI_GUIDELINES.md)

> **Documento de Instrução Permanente de Sistema.**
> Este arquivo governa qualquer personalização, geração de conteúdo ou edição realizada por agentes de IA na esteira de templates `vercel-advocacia/`.

---

## 1. Escopo e Propósito

O template contido neste diretório é um **Site Vitrine Institucional One-Page Turnkey** desenvolvido para advogados e sociedades de advocacia com reputação física e ausência de presença digital perene.

Toda personalização para um cliente específico deve operar exclusivamente através da edição de dados no arquivo `site.config.json` ou adição de assets autorais em `assets/`.

---

## 2. O Que a IA PODE Alterar (Permissões de Edição)

A IA tem autorização para modificar exclusivamente:

1. **Textos Institucionais do Escritório (`business` no JSON):**
   - Nome comercial limpo do escritório (`business.name`), sem sufixos empresariais crus como `LTDA`, `ME`, `EPP`.
   - Tagline de autoridade e especialidade (`business.tagline`).
   - Cidade e Estado de atuação (`business.city`, `business.state`).
   - Endereço físico completo (`business.address_display`).
   - Número de inscrição na OAB (`business.oab_number`, ex.: `OAB/MG 123.456`).
   - Telefone de exibição formatado (`business.phone_display`) e número WhatsApp nacional puro (`business.whatsapp_number`, no formato `55DDDNUMERO`).
   - Mensagem padrão de abertura de conversa no WhatsApp (`business.whatsapp_default_message`).
   - Horário de funcionamento (`business.office_hours`).

2. **Paleta de Cores e Estética (`theme` e `visuals` no JSON):**
   - Chave `theme_preset`: escolher estritamente entre os 5 presets corporativos curados:
     - **Temas Escuros:**
       - `navy-gold`: Azul Marinho Profundo (`#0f172a`) & Ouro Nobre (`#c5a059`)
       - `sovereign-dark`: Preto Ônix (`#0d0f12`) & Ouro Champanhe (`#d4af37`) - Estilo Mattos Filho
       - `espresso-amber`: Café Torrado (`#120e0b`) & Âmbar Ocre (`#c28e46`) - Estilo Boutique Quente
     - **Temas Claros:**
       - `oxford-linen`: Linho Pergaminho (`#f7f5f0`), cards brancos & Azul Oxford (`#0a192f`) com acento bronze (`#8c6d3b`) - Estilo Pinheiro Neto
       - `atlantic-blue`: Cinza Gelo (`#f1f4f8`), cards brancos & Azul Imperial (`#002244`) com acento atlântico (`#005088`) - Estilo Machado Meyer / B2B
   - Chave `custom_accent_hex`: código hexadecimal opcional para override manual da cor de acento.
   - Alternância entre Foto e Monograma:
     - `use_profile_photo: true` + `profile_photo_url: "./assets/profile.jpg"`
     - `use_profile_photo: false` + `monogram_initials: "CS"` (2 a 3 letras das iniciais do titular).

3. **Áreas de Atuação Jurídica (`services` no JSON):**
   - De 3 a 6 áreas de atuação reais do escritório.
   - Linguagem empática, clara, orientada à dor do cidadão ou empresa, sem jargão jurídico hermético.

4. **Depoimentos e Prova Social (`testimonials` no JSON):**
   - Inserir **apenas** avaliações reais e espontâneas extraídas da ficha pública do Google Maps.
   - Caso o cliente não possua depoimentos em texto, deixar a lista vazia (`"testimonials": []`) para ativar automaticamente o banner de reputação consolidada com nota e volume do Maps.

5. **Dúvidas Frequentes (`faq` no JSON):**
   - Perguntas procedimentais sobre documentação, formato de atendimento (presencial/online) e sigilo.

---

## 3. O Que a IA NUNCA PODE Fazer (Guardrails e Proibições Estritas)

Em obediência ao **Provimento nº 205/2021 do Conselho Federal da OAB** e à **Lei nº 13.709/2018 (LGPD)**, é expressamente **PROIBIDO**:

1. **PROIBIDO Mencionar Preços e Condições Comerciais:**
   - Jamais mencione valores de honorários, preços de consulta, formas de pagamento, parcelamentos ou chamadas como *"consulta gratuita"* ou *"sem custo inicial"*.
2. **PROIBIDO Fazer Promessas de Resultado:**
   - Jamais utilize termos como *"causa ganha"*, *"garantia de sucesso"*, *"100% de êxito"*, *"resultado garantido"* ou promessas de agilidade judicial fora do controle do profissional.
3. **PROIBIDO Chamadas Mercantilistas ou Agressivas:**
   - Jamais utilize gatilhos de varejo como *"contrate com desconto"*, *"promoção por tempo limitado"* ou *"compre agora"*.
   - Use sempre CTAs institucionais: *"Consulte nossa equipe"*, *"Fale com um advogado"*, *"Agende uma avaliação do seu caso"*.
4. **PROIBIDO Inventar Avaliações Falsas:**
   - Se não houver comentários no Google Maps, mantenha `testimonials: []`. Nunca gere nomes falsos ou depoimentos fictícios.
5. **PROIBIDO Inserir Banners Invasivos de Cookies:**
   - O template opera sem cookies de rastreamento de terceiros. A conformidade com a LGPD e o sigilo ético é assegurada de forma honesta e sóbria no rodapé apontando para `privacidade.html`.
6. **PROIBIDO Adicionar Dependências Pesadas:**
   - Não adicione React, Vue, frameworks de compilação pesada ou pacotes em `node_modules` no template estático do cliente. O template deve permanecer HTML5 + Vanilla JS puro, carregando em menos de 0.5s em conexões móveis.

---

## 4. Referência Rápida do Esquema `site.config.json`

```json
{
  "business": {
    "name": "Nome do Escritório (Sem LTDA/ME)",
    "tagline": "Frase de Posicionamento e Autoridade",
    "city": "Cidade",
    "state": "UF",
    "phone_display": "(DD) 99999-9999",
    "whatsapp_number": "55DD999999999",
    "whatsapp_default_message": "Olá! Vi o site institucional e gostaria de agendar uma avaliação jurídica.",
    "address_display": "Rua, Número - Bairro, Cidade - UF, CEP",
    "oab_number": "OAB/UF 00.000",
    "office_hours": "Segunda a Sexta, das 09h às 18h"
  },
  "visuals": {
    "theme_preset": "navy-gold | sovereign-dark | espresso-amber | oxford-linen | atlantic-blue",
    "custom_accent_hex": null,
    "use_profile_photo": false,
    "profile_photo_url": "./assets/doutor.svg",
    "monogram_initials": "CS"
  },
  "metrics": {
    "rating": "4.9",
    "reviews_count": 48,
    "years_experience": "+10",
    "cases_count": "+500"
  },
  "services": [
    {
      "title": "Área de Atuação",
      "description": "Explicação clara e objetiva do suporte técnico oferecido."
    }
  ],
  "testimonials": [],
  "faq": [
    {
      "question": "Pergunta Frequente",
      "answer": "Resposta ética e esclarecedora."
    }
  ],
  "compliance": {
    "enable_lgpd_banner": false,
    "privacy_policy_url": "/privacidade.html"
  }
}
```
