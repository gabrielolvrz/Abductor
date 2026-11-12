# 🐾 Esteira Turnkey de Pet Shop & Clínicas Veterinárias (`vercel-petshop`)

Esteira de templates estáticos de altíssima performance para Sites Vitrine One-Page de Pet Shops, Centros de Estética Animal (Banho & Tosa) e Clínicas Veterinárias, com arquitetura modular reativa aos 4 pilares do negócio, conformidade ética ao CFMV (Resoluções 1.649/2025 e 1.675/2025) e adequação nativa à LGPD.

---

## 📁 Estrutura do Diretório

```text
templates/vercel-petshop/
├── base/                   # Molde mestre imutável (atualizações afetam novos clientes)
│   ├── assets/             # Ícones vetoriais SVG, ilustrações e placeholders
│   ├── index.html          # Front-end estático reativo aos pilares de site.config.json
│   ├── privacidade.html    # Aviso formal de privacidade LGPD e ética veterinária CFMV
│   ├── site.config.json    # Configuração modelo padrão do centro pet integrado
│   ├── vercel.json         # Headers de segurança e cache imutável
│   └── AI_GUIDELINES.md    # Diretrizes éticas CFMV e regras de edição para IAs
└── clientes/               # Instâncias isoladas por cliente (.gitignore ativo)
    ├── .gitkeep            # Mantém pasta no repositório sem expor dados de clientes
    └── <nome_do_lead>/     # Cópia independente do cliente
```

---

## 🚀 Passo a Passo Operacional (CLI)

### 1. Criar uma Nova Instância de Cliente
Duplique a pasta `base/` para a pasta de clientes usando o nome normalizado do lead (sem acentos nem espaços):

```bash
cd /home/gabrielolvr/Projects/personal/Abductor/templates/vercel-petshop
cp -r base clientes/villa_pet_center
cd clientes/villa_pet_center
```

### 2. Aplicar o `site.config.json` do Cockpit
Substitua o arquivo `site.config.json` pelo arquivo baixado no modal configurador da vertical Pet Shop no Cockpit Abductor (`/` ou `/pipeline`):

```bash
cp ~/Downloads/site.config.json ./site.config.json
```

O layout da seção de serviços se recomporá automaticamente para 1, 2, 3 ou 4 pilares ativos conforme selecionado no modal.

### 3. Teste e Pré-visualização Local
Abra um servidor HTTP simples para testar no navegador (porta 5000):

```bash
python -m http.server 5000
# Acesse no navegador: http://localhost:5000
```

Para testar instantaneamente qualquer uma das 5 paletas de cores sem editar o JSON, use o parâmetro `?theme=` na URL:
- `http://localhost:5000/?theme=teal-honey`
- `http://localhost:5000/?theme=sage-earth`
- `http://localhost:5000/?theme=lavender-mint`
- `http://localhost:5000/?theme=navy-sunshine`
- `http://localhost:5000/?theme=boutique-dark`

### 4. Deploy Instantâneo na Vercel (Produção)
Com a Vercel CLI autenticada, publique a instância em menos de 10 segundos:

```bash
vercel --prod --yes
```

Copie a URL gerada e envie no WhatsApp para o fechamento imediato com o proprietário do Pet Shop ou Clínica Veterinária.
