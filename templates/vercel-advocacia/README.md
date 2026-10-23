# 🏛️ Esteira Turnkey de Advocacia (`vercel-advocacia`)

Esteira de templates estáticos de altíssima performance para Sites Vitrine One-Page de sociedades de advocacia e advogados autônomos, com conformidade integral ao Provimento 205/2021 da OAB e à Lei Geral de Proteção de Dados (LGPD).

---

## 📁 Estrutura do Diretório

```text
templates/vercel-advocacia/
├── base/                   # Molde mestre imutável (atualizações afetam novos clientes)
│   ├── assets/             # Doutor SVG, Monograma heráldico SVG e Hero
│   ├── index.html          # Front-end estático com ingestão dinâmica de site.config.json
│   ├── privacidade.html    # Aviso formal de privacidade e sigilo profissional LGPD/OAB
│   ├── site.config.json    # Configuração modelo padrão
│   ├── vercel.json         # Headers de segurança e cache imutável
│   └── AI_GUIDELINES.md    # Diretrizes éticas OAB e restrições para assistentes de IA
└── clientes/               # Instâncias isoladas por cliente (.gitignore ativo)
    ├── .gitkeep            # Mantém pasta no repositório sem expor dados de clientes
    └── <nome_do_lead>/     # Cópia independente do cliente
```

---

## 🚀 Passo a Passo Operacional (CLI)

### 1. Criar uma Nova Instância de Cliente
Duplique a pasta `base/` para a pasta de clientes usando o nome normalizado do lead (sem acentos nem espaços):

```bash
cd /home/gabrielolvr/Projects/personal/Abductor/templates/vercel-advocacia
cp -r base clientes/dr_carlos_eduardo
cd clientes/dr_carlos_eduardo
```

### 2. Aplicar o `site.config.json` do Cockpit
Substitua o arquivo `site.config.json` pelo arquivo baixado no modal de exportação do Cockpit Abductor (`/` ou `/pipeline`):

```bash
# Caso tenha baixado na pasta Downloads:
cp ~/Downloads/site.config.json ./site.config.json
```

Se o cliente forneceu foto profissional, salve-a em `./assets/profile.jpg` e garanta que `"use_profile_photo": true` esteja configurado no JSON. Caso contrário, o modo editorial com monograma heráldico (`"use_profile_photo": false`) será ativado automaticamente.

### 3. Teste e Pré-visualização Local
Abra um servidor HTTP simples para testar no navegador (porta 5000):

```bash
python -m http.server 5000
# Acesse no navegador: http://localhost:5000
```

### 4. Deploy Instantâneo na Vercel (Produção)
Com a Vercel CLI autenticada, publique a instância em menos de 10 segundos:

```bash
vercel --prod --yes
```

Copie a URL gerada (ex.: `https://dr-carlos-eduardo.vercel.app`) e cole no WhatsApp para o fechamento imediato com o cliente.
