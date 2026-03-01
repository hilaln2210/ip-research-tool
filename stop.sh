#!/bin/bash
# IP Research Tool — stop all services

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"

for svc in backend frontend; do
  PID_FILE="$LOG_DIR/$svc.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID"
      echo "Stopped $svc (PID $PID)"
    else
      echo "$svc was not running"
    fi
    rm -f "$PID_FILE"
  else
    echo "No PID file for $svc"
  fi
done
