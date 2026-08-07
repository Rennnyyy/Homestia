#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# build.sh — Build the Homestia platform (Angular facade + .NET host)
# ══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/src/Web"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Building Homestia"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Install Angular dependencies ─────────────────────────────────────
echo ""
echo "  [1/3] Installing Angular dependencies..."
cd "$WEB_DIR"
npm ci --silent

# ── Step 2: Build Angular facade ─────────────────────────────────────────────
echo ""
echo "  [2/3] Building Angular facade..."
npx ng build --configuration production

# ── Step 3: Build .NET host ──────────────────────────────────────────────────
echo ""
echo "  [3/3] Building .NET host..."
cd "$SCRIPT_DIR"
dotnet build --nologo -v q

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Build complete. Run ./run.sh to start."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
