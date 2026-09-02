#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# resolve-aletheia-version.sh — print the newest published Aletheia CI version
# from the GitHub Packages NuGet feed.
#
# Homestia pins Aletheia.Sdk.* to one exact version (AletheiaSdkVersion in
# Directory.Build.props). NuGet floating versions are not allowed under central
# package management, so when a deploy should ride the latest Aletheia CI build,
# this script resolves that version and the workflow overrides the property with
# -p:AletheiaSdkVersion=<result>.
#
# Uses the GitHub REST API (package versions are not enumerable anonymously on a
# private feed):
#   GET /users/<owner>/packages/nuget/Aletheia.Sdk/versions
#
# Auth: ALETHEIA_PAT (or GH_TOKEN) with read:packages for the owner account.
#
# Outputs nothing (exit 1) when no CI version can be resolved — callers should
# then fall back to the committed default.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

OWNER="${OWNER:-rennnyyy}"
PACKAGE="${PACKAGE:-Aletheia.Sdk}"
TOKEN="${ALETHEIA_PAT:-${GH_TOKEN:-}}"
# Only ride prerelease CI builds (stable releases are chosen deliberately).
MATCH="${MATCH:--ci.}"

if [ -z "$TOKEN" ]; then
  echo "resolve-aletheia-version: no ALETHEIA_PAT/GH_TOKEN set" >&2
  exit 1
fi

JSON="$(curl -sS -m 30 \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/users/${OWNER}/packages/nuget/${PACKAGE}/versions")"

# Pick the most recently created version whose name contains the match marker.
VERSION="$(printf '%s' "$JSON" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if not isinstance(data, list):
    sys.exit(0)
match = '$MATCH'
ci = [v for v in data if match in v.get('name', '')]
if not ci:
    sys.exit(0)
newest = max(ci, key=lambda v: v.get('created_at', ''))
print(newest['name'])
")"

if [ -z "$VERSION" ]; then
  echo "resolve-aletheia-version: no version matching '*${MATCH}*' found for ${PACKAGE}" >&2
  exit 1
fi

echo "$VERSION"
