#!/bin/bash
# IP Research Tool — start backend + frontend

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8003
FRONTEND_PORT=3003
LOG_DIR="$ROOT/.logs"

mkdir -p "$LOG_DIR"

# ── Backend ──────────────────────────────────────────────
echo "Starting backend on port $BACKEND_PORT..."
source "$ROOT/backend/venv/bin/activate"
python3 -m uvicorn app.main:app \
  --host 0.0.0.0 --port "$BACKEND_PORT" --reload \
  --app-dir "$ROOT/backend" \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend.pid"

# ── Frontend ─────────────────────────────────────────────
echo "Starting frontend on port $FRONTEND_PORT..."
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
NODE_BIN="$(which node)"
NPX_BIN="$(which npx)"

cd "$ROOT/frontend" && $NPX_BIN vite --host 0.0.0.0 --port "$FRONTEND_PORT" \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"

sleep 3

echo ""
echo "  Backend  → http://localhost:$BACKEND_PORT"
echo "  Swagger  → http://localhost:$BACKEND_PORT/docs"
echo "  Frontend → http://localhost:$FRONTEND_PORT"
echo ""
echo "  Logs: $LOG_DIR/"
echo "  Stop with: ./stop.sh"
