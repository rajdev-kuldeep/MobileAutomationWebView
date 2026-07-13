#!/usr/bin/env bash
# =============================================================================
# Cashi Automation Live View — local startup
#
# Usage:
#   ./start-live-view.sh              # build UI if needed, start server on :4545
#   ./start-live-view.sh --dev       # backend + Vite dev server (HMR on :5173)
#   ./start-live-view.sh --simulate  # also run a fake test run for a demo
#
# Then start your test run in another terminal:
#   mvn test -DsuiteXmlFile=local_android_debug.xml -DliveView.enabled=true
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT/automation-live-server"
UI_DIR="$ROOT/automation-live-ui"
PORT="${LIVEVIEW_PORT:-4545}"

DEV_MODE=false
SIMULATE=false
for arg in "$@"; do
  case "$arg" in
    --dev) DEV_MODE=true ;;
    --simulate) SIMULATE=true ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

echo "── Cashi Automation Live View ─────────────────────────────"

# ---- install dependencies on first run ------------------------------------
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "installing server dependencies…"
  (cd "$SERVER_DIR" && npm install --no-audit --no-fund)
fi
if [ ! -d "$UI_DIR/node_modules" ]; then
  echo "installing UI dependencies…"
  (cd "$UI_DIR" && npm install --no-audit --no-fund)
fi

# ---- build ------------------------------------------------------------------
if [ ! -d "$SERVER_DIR/dist" ]; then
  echo "building server…"
  (cd "$SERVER_DIR" && npm run build)
fi
if [ "$DEV_MODE" = false ] && [ ! -d "$UI_DIR/dist" ]; then
  echo "building UI…"
  (cd "$UI_DIR" && npm run build)
fi

cleanup() {
  # shellcheck disable=SC2046
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

# ---- start ------------------------------------------------------------------
echo "starting automation-live-server on port $PORT…"
(cd "$SERVER_DIR" && node dist/index.js) &

sleep 1

if [ "$DEV_MODE" = true ]; then
  echo "starting Vite dev server…"
  (cd "$UI_DIR" && npm run dev) &
  sleep 1
  URL="http://localhost:5173"
else
  URL="http://localhost:$PORT"
fi

echo ""
echo "───────────────────────────────────────────────────────────"
echo "  Dashboard:        $URL"
echo "  Event ingestion:  http://localhost:$PORT/api/events"
echo "  Health:           http://localhost:$PORT/health"
echo "───────────────────────────────────────────────────────────"
echo ""
echo "Start your automation with:"
echo "  mvn test -DsuiteXmlFile=local_android_debug.xml -DliveView.enabled=true"
echo ""

if [ "$SIMULATE" = true ]; then
  echo "running simulated test run…"
  sleep 1
  node "$ROOT/scripts/simulate-run.mjs" || true
fi

wait
