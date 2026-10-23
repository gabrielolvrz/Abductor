---
title: Abductor - Guia Operacional e Setup Local (RUNBOOK)
project: Abductor
type: runbook
tags:
  - runbook
  - setup
  - arch-linux
  - btrfs
  - docker
  - mise
  - devops
created: 2026-10-22
status: aprovado
---

# 🛠️ 08 - RUNBOOK — Setup da Máquina e Execução Local

> Guia passo a passo para inicializar, configurar e rodar o ecossistema do **Abductor** do zero no host Arch Linux (`Arch-Logos`). Focado em comandos diretos de terminal (Kitty/Zsh), configuração NoCoW no Btrfs, orquestração via Docker e execução nativa via `mise`.

---

## 1. Verificação Prévia do Host

Antes de clonar ou iniciar o projeto, confirme se os utilitários essenciais do seu ambiente estão operacionais:

```bash
# 1. Checar se o Docker Engine e o socket estão ativos
systemctl is-active docker.socket || sudo systemctl enable --now docker.socket

# 2. Confirmar se o usuário atual pertence ao grupo docker (evita sudo)
groups | grep -q docker && echo "Docker OK (sem sudo)" || echo "Aviso: adicione o usuário ao grupo docker"

# 3. Validar se o mise está acessível no shell
mise --version

# 4. Validar espaço disponível no subvolume Btrfs
btrfs filesystem usage /home
```

## 2. Preparação do Diretório & Btrfs (NoCoW Obrigatório)

> [!CAUTION]
> 
> **Atenção ao Btrfs:** Bancos relacionais como o PostgreSQL degradam performance e sofrem fragmentação extrema sob Copy-on-Write (CoW). A pasta de dados do PostgreSQL deve receber o atributo `+C` **antes** de qualquer container ser iniciado.
> 
>   

Execute na pasta onde o projeto está instalado (ex: `~/Projects/personal/Abductor`):

```Bash
# Criar árvore de diretórios do projeto (se necessário)
mkdir -p ~/Projects/personal/Abductor/{backend,frontend,templates,data/postgres,data/gosom}
cd ~/Projects/personal/Abductor

# Desativar Copy-on-Write nos diretórios de persistência de dados
chattr +C ./data/postgres
chattr +C ./data/gosom

# Ajustar permissões permissivas para bind mount local (evita 'Permission denied' do usuário postgres UID 70 no Alpine)
chmod 777 ./data/postgres ./data/gosom

# Validação: a saída DEVE exibir a letra 'C' maiúscula
lsattr -d ./data/postgres ./data/gosom
```

> [!IMPORTANT]
> A pasta `./data/postgres` deve estar **100% vazia** antes do primeiro `docker compose up`. O compose monta o volume diretamente em `/var/lib/postgresql/data`; não é necessário (nem recomendado) criar o subdiretório `pgdata`. Como o container `postgres:16-alpine` roda internamente com UID `70` (`postgres`), o `chmod 777` local garante que o `initdb` inicialize sem atrito de permissão, e o próprio daemon do Postgres restringe as permissões internamente para `0700` ao criar o cluster.

## 3. Configuração dos Containers (`docker-compose.yml`)

Crie o arquivo `docker-compose.yml` na raiz do projeto (`~/Projects/personal/Abductor/docker-compose.yml`):

```YAML
version: '3.8'

services:
  # --------------------------------------------------------------------------
  # 1. Banco de Dados Relacional (PostgreSQL 16)
  # --------------------------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: abductor_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres123}
      POSTGRES_DB: ${DB_NAME:-abductor_db}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/01_init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-abductor_db}"]
      interval: 5s
      timeout: 3s
      retries: 5

  # --------------------------------------------------------------------------
  # 2. Motor de Scraping Autônomo do Google Maps (Go)
  # --------------------------------------------------------------------------
  gosom:
    image: gosom/google-maps-scraper:latest
    container_name: abductor_gosom
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data/gosom:/gmapsdata
    command: ["-web", "-data-folder", "/gmapsdata", "-addr", ":8080"]
    # Chromium headless precisa de /dev/shm maior que o default de 64 MB do Docker
    shm_size: '2gb'
    healthcheck:
      test: ["CMD-SHELL", "bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/8080' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
```

## 4. Variáveis de Ambiente (`.env`)

Crie o arquivo `.env` na raiz do projeto:

  

Ini, TOML

```TOML
# Configuração do Banco de Dados Local
DB_USER=postgres
DB_PASSWORD=postgres123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abductor_db
DATABASE_URL=postgresql+asyncpg://postgres:postgres123@localhost:5432/abductor_db

# Integração com o Scraper gosom
GOSOM_API_URL=http://localhost:8080

# Backend FastAPI Settings
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000

# Concorrência HTTP para Validação de Sites
VALIDATOR_MAX_CONCURRENCY=30
VALIDATOR_TIMEOUT_SECONDS=4.0
```

## 5. Setup do Backend (FastAPI + Python 3.12 via `mise`)

O backend roda nativamente no host para fornecer recarga instantânea de código sem overhead de virtualização.

  



```Bash
cd ~/Projects/personal/Abductor/backend

# 1. Travar a versão do Python no diretório via mise
mise use python@3.12

# 2. Criar e ativar o ambiente virtual isolado
python -m venv .venv
source .venv/bin/activate

# 3. Instalar pacotes de alta performance
pip install --upgrade pip
pip install \
    "fastapi[all]" \
    "uvicorn[standard]" \
    "sqlalchemy[asyncio]" \
    "asyncpg" \
    "httpx" \
    "pydantic-settings" \
    "python-dotenv" \
    "phonenumbers" \
    "tldextract"

# 4. Copiar o DDL inicial (se ainda não existir)
# Salve o DDL gerado no '04 - DATA' dentro de backend/init.sql
```

## 6. Setup do Frontend (Vite + React + TS via `mise`)



```Bash
cd ~/Projects/personal/Abductor/frontend

# 1. Travar versão do Node.js LTS via mise
mise use node@lts

# 2. Criar boilerplate com Vite, React e TypeScript (caso seja o primeiro setup)
#    Se a pasta frontend já tiver arquivos, o Vite perguntará se pode limpar o diretório.
#    Confirme apenas se for um projeto novo; nunca limpe uma pasta com trabalho não versionado.
npm create vite@latest . -- --template react-ts

# 3. Instalar dependências de interface e utilitários
npm install
# Tailwind v3 fixado para manter o fluxo `npx tailwindcss init -p`.
# Para Tailwind v4, troque por `npm install -D tailwindcss @tailwindcss/vite` e registre o plugin no vite.config.ts.
npm install -D tailwindcss@^3 postcss autoprefixer
npm install lucide-react clsx tailwind-merge axios @tanstack/react-query

# 4. Inicializar configuração do Tailwind (v3)
npx tailwindcss init -p
```

### Ajuste de Configuração: `frontend/vite.config.ts`

Certifique-se de que a porta local esteja fixada em 3000 para sincronizar com os CORS do backend:

  



```TypeScript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Libera acesso na rede local se necessário
  }
})
```

## 7. Rotina de Inicialização Diária (Comandos Operacionais)

Para o dia a dia, execute os comandos abaixo divididos em abas ou janelas do Kitty:

  

### Terminal 1: Subir a Infraestrutura (Docker)



```Bash
cd ~/Projects/personal/Abductor
docker compose up -d

# Validar se os containers subiram com saúde (healthy)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Terminal 2: Subir a API Core (Backend)



```Bash
cd ~/Projects/personal/Abductor/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

_A documentação interativa da API fica disponível em:_ `http://localhost:8000/docs`

  

### Terminal 3: Subir a Interface SPA (Frontend)



```Bash
cd ~/Projects/personal/Abductor/frontend
npm run dev
```

_A interface de controle abre no navegador em:_ `http://localhost:3000`

  

## 8. Script Rápido de Inicialização Única (`abductor.sh`)

Para abrir todo o sistema em um único comando no Hyprland, crie um script executável em `~/.local/bin/abductor`:

  



```Bash
cat << 'EOF' > ~/.local/bin/abductor
#!/usr/bin/env bash

ABDUCTOR_DIR="$HOME/Projects/personal/Abductor"
cd "$ABDUCTOR_DIR" || exit 1

echo "🛸 Iniciando infraestrutura do Abductor..."
docker compose up -d

# Abrir terminais com Kitty rodando backend e frontend
kitty --title "Abductor Backend" -d "$ABDUCTOR_DIR/backend" zsh -c "source .venv/bin/activate && uvicorn app.main:app --reload --port 8000" &
kitty --title "Abductor Frontend" -d "$ABDUCTOR_DIR/frontend" zsh -c "npm run dev" &

# Aguarda 2 segundos e abre o navegador
sleep 2
xdg-open "http://localhost:3000" &
EOF

chmod +x ~/.local/bin/abductor
```

_Agora basta digitar `abductor` no terminal Kitty ou no lançador `anyrun` para iniciar todo o cockpit de vendas._

  

## 9. Troubleshooting & Comandos de Manutenção

### ❌ Porta 5432 ou 8080 Ocupada

Se você já possui outra instância de PostgreSQL rodando localmente no Arch:

  



```Bash
# Identificar o processo que está segurando a porta
sudo ss -tulpn | grep -E ':(5432|8080|8000|3000)'

# Se for um serviço do systemd local segurando o Postgres:
sudo systemctl stop postgresql
```

### ❌ Erro de Permissão no Docker Socket

Se o comando `docker compose up` reclamar de permissão de acesso ao `/var/run/docker.sock`:

  



```Bash
sudo usermod -aG docker $USER
newgrp docker
```

### ❌ Reset Total da Base de Dados Local

Se precisar limpar o banco e recomeçar do zero com o DDL original:

  



```Bash
cd ~/Projects/personal/Abductor
docker compose down -v
# Manter o atributo NoCoW caso recrie a pasta
mkdir -p ./data/postgres && chattr +C ./data/postgres
docker compose up -d
```

### ❌ Inspecionar Logs do Scraper em Tempo Real

Para verificar se o Google Maps está bloqueando consultas ou exigindo CAPTCHA:

  



```Bash
docker logs -f abductor_gosom
```

## 🔗 Documentos Relacionados

- Voltar para a central: `[[00 - MOC - Central de Controle]]`
    
      
    
- Desenho técnico e arquitetura: `[[03 - SDD - Arquitetura e Engenharia]]`
    
      
    
- Esquema físico e DDL SQL: `[[04 - DATA - Modelagem e Banco]]`
    
      
    
- Lista de tarefas de execução: `[[09 - TASKS - Checklist de Execucao]]`