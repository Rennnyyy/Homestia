#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# run.sh — Start Homestia in development mode
#          .NET API on :5000 | Angular dev server on :4200 → proxies /api to :5000
# ══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/src/Web"
DOTNET_PORT="${DOTNET_PORT:-5000}"
ANGULAR_PORT="${ANGULAR_PORT:-4200}"

cleanup() {
    echo ""
    echo "  Shutting down..."
    if [[ -n "${DOTNET_PID:-}" ]]; then
        kill "$DOTNET_PID" 2>/dev/null || true
        wait "$DOTNET_PID" 2>/dev/null || true
    fi
    if [[ -n "${ANGULAR_PID:-}" ]]; then
        kill "$ANGULAR_PID" 2>/dev/null || true
        wait "$ANGULAR_PID" 2>/dev/null || true
    fi
    echo "  Done."
}
trap cleanup EXIT INT TERM

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Homestia — Development Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Ensure Angular dependencies are installed ────────────────────────────────
if [[ ! -d "$WEB_DIR/node_modules" ]]; then
    echo ""
    echo "  Installing Angular dependencies..."
    cd "$WEB_DIR"
    npm ci --silent
fi

# ── Start .NET host ──────────────────────────────────────────────────────────
echo ""
echo "  Starting .NET host on http://localhost:$DOTNET_PORT ..."
cd "$SCRIPT_DIR"
ASPNETCORE_URLS="http://localhost:$DOTNET_PORT" \
    dotnet run --project src/Program --no-launch-profile &
DOTNET_PID=$!

# ── Start Angular dev server ─────────────────────────────────────────────────
echo "  Starting Angular dev server on http://localhost:$ANGULAR_PORT ..."
cd "$WEB_DIR"
npx ng serve --port "$ANGULAR_PORT" --proxy-config proxy.conf.json &
ANGULAR_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  .NET API   → http://localhost:$DOTNET_PORT"
echo "  Angular UI → http://localhost:$ANGULAR_PORT (proxies /api → .NET)"
echo "  Press Ctrl+C to stop both."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for either process to exit
wait -n
