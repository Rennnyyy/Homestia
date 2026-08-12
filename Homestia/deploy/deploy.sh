#!/usr/bin/env bash
# deploy/deploy.sh – Deploy Homestia to Fly.io.
#
# Prerequisites:
#   brew install flyctl          # https://fly.io/docs/hands-on/install-flyctl/
#   fly auth login
#   fly apps create homestia --config Homestia/Homestia/deploy/fly.toml
#
# Usage (from workspace root — Katharsis/):
#   bash Homestia/Homestia/deploy/deploy.sh
#
# After first deploy, the app is live at:
#   https://homestia.fly.dev

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# deploy/ → Homestia/ → Katharsis/
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FLY_CONFIG="Homestia/Homestia/deploy/fly.toml"

check() { command -v "$1" >/dev/null 2>&1 || { echo "✗ '$1' not found. Install it and retry."; exit 1; }; }

check fly

cd "$WORKSPACE_ROOT"

echo ""
echo "▶ Deploying Homestia…"
# --depot=false: use Fly's own remote builders instead of Depot.
# Depot intermittently fails with 401 "ensure depot builder failed" even
# with valid auth — the legacy builder avoids that auth path entirely.
fly deploy \
    --config "$FLY_CONFIG" \
    --strategy immediate \
    --depot=false

HOSTNAME="$(fly status --config "$FLY_CONFIG" --json | jq -r '.Hostname')"
URL="https://${HOSTNAME}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Homestia is live!"
echo "  App → $URL"
echo "  API → $URL/api"
echo "═══════════════════════════════════════════════════════"
