#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# 🛸 ABDUCTOR — Launcher Unificado do Cockpit de Prospecção & Vendas
# ==============================================================================

ABDUCTOR_DIR="/home/gabrielolvr/Projects/personal/Abductor"
cd "$ABDUCTOR_DIR" || exit 1

echo "🛸 [1/3] Iniciando infraestrutura Docker (PostgreSQL 16 + gosom)..."
docker compose up -d

if [[ "${1:-}" == "--check" || "${1:-}" == "--dry-run" ]]; then
  echo "✅ Containers verificados:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  exit 0
fi

echo "🚀 [2/3] Inicializando Backend FastAPI (:8000) e Frontend React/Vite (:3000)..."
if command -v kitty >/dev/null 2>&1 && [[ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]]; then
  kitty --title "Abductor Backend (:8000)" -d "$ABDUCTOR_DIR/backend" zsh -c "source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" &
  kitty --title "Abductor Frontend (:3000)" -d "$ABDUCTOR_DIR/frontend" zsh -c "npm run dev" &
else
  (
    cd "$ABDUCTOR_DIR/backend"
    source .venv/bin/activate
    nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 >/tmp/abductor_backend.log 2>&1 &
  )
  (
    cd "$ABDUCTOR_DIR/frontend"
    nohup npm run dev >/tmp/abductor_frontend.log 2>&1 &
  )
fi

echo "🌐 [3/3] Aguardando serviços e abrindo o Cockpit em http://localhost:3000 ..."
sleep 2
if command -v xdg-open >/dev/null 2>&1 && [[ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]]; then
  xdg-open "http://localhost:3000" >/dev/null 2>&1 &
fi

echo "✅ Ecossistema Abductor em execução!"
