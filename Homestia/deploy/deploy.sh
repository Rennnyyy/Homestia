#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# deploy.sh — Build & deploy Homestia to Fly.io (homestia.fly.dev)
#
# Usage:  ./deploy.sh [--local]
#   (default)  Remote build on Fly.io's builder (no local container needed)
#   --local    Build locally with podman, then push to Fly.io registry
#
# Prerequisites:
#   1. Install flyctl:  brew install flyctl
#   2. Authenticate:    fly auth login
#   3. (local only)     podman:  brew install podman && podman machine init && podman machine start
# ══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The Docker build context must be the parent of both Homestia/ and Aletheia/
# so that project references resolve correctly.
# deploy/ → Homestia/ → Katharsis/
BUILD_CONTEXT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOCKERFILE="$SCRIPT_DIR/Dockerfile"
FLY_CONFIG="$SCRIPT_DIR/fly.toml"
IMAGE_TAG="registry.fly.io/homestia:latest"

LOCAL_BUILD=false
if [[ "${1:-}" == "--local" ]]; then
    LOCAL_BUILD=true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Homestia — Deploy to Fly.io"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Build context : $BUILD_CONTEXT"
echo "  Dockerfile    : $DOCKERFILE"
echo "  Fly config    : $FLY_CONFIG"
echo "  Mode          : $([ "$LOCAL_BUILD" = true ] && echo 'local (podman)' || echo 'remote (Fly.io builder)')"
echo ""

# ── Step 1: Verify prerequisites ────────────────────────────────────────────
if ! command -v flyctl &> /dev/null; then
    echo "  ERROR: flyctl not found. Install it: brew install flyctl"
    exit 1
fi

if [[ "$LOCAL_BUILD" == true ]]; then
    if ! command -v podman &> /dev/null; then
        echo "  ERROR: podman not found. Install it: brew install podman"
        echo "         Then: podman machine init && podman machine start"
        exit 1
    fi
    # Ensure podman machine is running
    if ! podman info &>/dev/null; then
        echo "  Starting podman machine..."
        podman machine start || {
            echo "  ERROR: Could not start podman. Run: podman machine init && podman machine start"
            exit 1
        }
    fi
fi

# ── Step 2: Ensure the Fly.io app exists ────────────────────────────────────
echo "  Checking Fly.io app 'homestia'..."
if ! flyctl apps list 2>/dev/null | grep -q "homestia"; then
    echo "  Creating Fly.io app 'homestia'..."
    flyctl apps create homestia --org personal || {
        echo "  ERROR: Could not create app. Run 'fly apps create homestia' manually."
        exit 1
    }
fi
echo ""

# ── Step 3: Deploy ──────────────────────────────────────────────────────────
cd "$BUILD_CONTEXT"

if [[ "$LOCAL_BUILD" == true ]]; then
    echo "  Building image locally with podman..."
    podman build \
        --platform linux/amd64 \
        -t "$IMAGE_TAG" \
        -f "$DOCKERFILE" \
        .
    echo ""

    echo "  Pushing image to Fly.io registry..."
    # Authenticate podman to the Fly.io container registry
    flyctl auth token 2>/dev/null | podman login registry.fly.io \
        --username x \
        --password-stdin || {
        echo "  ERROR: Could not authenticate to registry.fly.io"
        exit 1
    }
    podman push "$IMAGE_TAG"
    echo ""

    echo "  Deploying to Fly.io..."
    flyctl deploy \
        --config "$FLY_CONFIG" \
        --image "$IMAGE_TAG" \
        --ha=false
else
    echo "  Deploying to Fly.io (remote build + deploy)..."
    flyctl deploy \
        --config "$FLY_CONFIG" \
        --dockerfile "$DOCKERFILE" \
        --remote-only \
        --ha=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy complete!"
echo "  https://homestia.fly.dev"
echo ""
echo "  Check status:  flyctl status  --config \"$FLY_CONFIG\""
echo "  View logs:     flyctl logs    --config \"$FLY_CONFIG\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
