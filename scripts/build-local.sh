#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# build-local.sh — build Homestia against a LOCALLY packed Aletheia SDK.
#
# Homestia normally consumes Aletheia.Sdk.* from the GitHub Packages NuGet feed
# (nuget.pkg.github.com/rennnyyy). When no package is published yet — or you are
# iterating on SDK changes before a release — this script packs the sibling
# Aletheia repo into a local folder feed and builds Homestia against it.
# No GitHub feed, no credentials, no publish step.
#
#   bash scripts/build-local.sh                 # FAST: build. Packs the SDK only
#                                               # when the local feed lacks the version.
#   bash scripts/build-local.sh --test          # + run the test suites
#   bash scripts/build-local.sh --angular       # include the Angular admin build
#   bash scripts/build-local.sh --run           # build (with Angular) + run the host
#   bash scripts/build-local.sh --force-pack    # always repack the SDK (after SDK changes)
#   bash scripts/build-local.sh --skip-pack     # never pack (feed must already exist)
#   bash scripts/build-local.sh --version 1.0.0 --feed ../Aletheia/SDK/bin/nupkg
#
# Fast mode: the local feed + NuGet's global cache (~/.nuget/packages) persist, so
# after one pack+restore, later runs skip packing AND resolve from cache almost
# instantly. Repack only when you change Aletheia source: --force-pack, or bump
# --version.
#
# Run flags (see --run): ASPNETCORE_URLS (default http://localhost:5000) and
# ASPNETCORE_ENVIRONMENT (default Development) can be overridden via env.
#
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DOTNET_ROOT="$REPO/Homestia"
ALETHEIA="${ALETHEIA:-$REPO/../Aletheia}"     # sibling repo (Katharsis/Aletheia)
VERSION="${VERSION:-1.0.0-local}"
FEED="${FEED:-$ALETHEIA/SDK/bin/nupkg-local}" # local folder feed of .nupkg files

SKIP_PACK=false
FORCE_PACK=false
RUN_TESTS=false
DO_RUN=false
ANGULAR=""
SKIP_ANGULAR="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --version)   VERSION="${2:?}"; shift ;;
    --feed)      FEED="${2:?}"; shift ;;
    --skip-pack) SKIP_PACK=true ;;
    --force-pack) FORCE_PACK=true ;;
    --test)      RUN_TESTS=true ;;
    --angular)   ANGULAR="--angular"; SKIP_ANGULAR="false" ;;
    # --run implies a full build (Angular facade + Sdk.Web admin) so the host
    # can actually serve its UI, then starts the host.
    --run)       DO_RUN=true; ANGULAR="--angular"; SKIP_ANGULAR="false" ;;
    *) echo "Unknown option: $1"; exit 2 ;;
  esac
  shift
done

if [ ! -d "$DOTNET_ROOT" ]; then
  echo "ERROR: dotnet root not found at $DOTNET_ROOT"; exit 1
fi
if [ ! -f "$ALETHEIA/scripts/pack-sdk.sh" ]; then
  echo "ERROR: sibling Aletheia repo not found at $ALETHEIA (set ALETHEIA=...)"
  exit 1
fi

echo "=== Homestia local build (Aletheia version ${VERSION}) ==="
echo "Aletheia: $ALETHEIA"
echo "Feed:     $FEED"
echo ""

# 1) Pack the Aletheia SDK into the local folder feed — fast mode: skip when the
#    feed already has this exact version. --force-pack (or a version bump) always
#    repacks, which is what you want after editing Aletheia source.
NEEDS_PACK=true
if [ "$SKIP_PACK" = true ]; then
  NEEDS_PACK=false
elif [ "$FORCE_PACK" = false ] && [ -f "$FEED/Aletheia.Sdk.$VERSION.nupkg" ]; then
  NEEDS_PACK=false
  echo "Local feed already has Aletheia.Sdk ${VERSION} - skipping pack (fast)."
  echo "Use --force-pack (or --version <new>) to rebuild from Aletheia source."
fi
if [ "$NEEDS_PACK" = true ]; then
  echo "--- Packing Aletheia SDK ---"
  (cd "$ALETHEIA" && SKIP_ANGULAR="$SKIP_ANGULAR" \
      bash scripts/pack-sdk.sh --version "$VERSION" --out "$FEED")
fi

if [ ! -d "$FEED" ] || ! ls "$FEED"/*.nupkg >/dev/null 2>&1; then
  echo "ERROR: no packages found in local feed $FEED"
  exit 1
fi

# 2) Restore + build Homestia against the local feed (+ nuget.org for 3rd party).
echo "--- Restore + build ---"
cd "$DOTNET_ROOT"
dotnet restore Homestia.slnx \
  -s "$FEED" \
  -s https://api.nuget.org/v3/index.json \
  -p:AletheiaSdkVersion="$VERSION"

if [ "$ANGULAR" = "--angular" ]; then
  dotnet build Homestia.slnx -c Release \
      -p:AletheiaSdkVersion="$VERSION" --no-restore
else
  dotnet build Homestia.slnx -c Release \
      -p:AletheiaSdkVersion="$VERSION" -p:SkipAngularBuild=true --no-restore
fi

if [ "$RUN_TESTS" = true ]; then
  echo "--- Tests ---"
  dotnet test Homestia.slnx -c Release \
      -p:AletheiaSdkVersion="$VERSION" -p:SkipAngularBuild=true \
      --no-build --no-restore
fi

if [ "$DO_RUN" = true ]; then
  echo "--- Run ---"
  echo "Serving at ${ASPNETCORE_URLS:-http://localhost:5000}"
  ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}" \
  ASPNETCORE_URLS="${ASPNETCORE_URLS:-http://localhost:5000}" \
  dotnet run --project src/Program/Homestia.Program.csproj \
      -c Release --no-build --no-restore \
      -p:AletheiaSdkVersion="$VERSION"
fi

echo ""
echo "=== Local build OK (Aletheia ${VERSION}) ==="
