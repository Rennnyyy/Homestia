#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:?usage: deploy.sh <staging|prod>}"

APP_VERSION="${APP_VERSION:-${GITHUB_SHA:-latest}}"
IMAGE="${IMAGE:-ghcr.io/${GITHUB_REPOSITORY,,}}"
APP_SLUG="${APP_SLUG:-homestia}"
APP_PUBLIC="${APP_PUBLIC:-false}"
SSH_HOST="${SSH_HOST:?SSH_HOST required}"
SSH_USER="${SSH_USER:?SSH_USER required}"
SSH_KEY="${SSH_KEY:?SSH_PRIVATE_KEY secret required}"

# ---- Forward GitHub-deployed secrets ------------------------------------
# Every DEPLOY_* env var set by the workflow is forwarded to the server and
# written into .env.<stage> with the prefix stripped, e.g.
#   DEPLOY_TEST=abc  ->  TEST=abc
shell_quote() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\"'\"'/g")"; }
DEPLOY_ASSIGNMENTS=""
for _name in $(env | sed -n 's/^\(DEPLOY_[A-Za-z0-9_]*\)=.*/\1/p'); do
  DEPLOY_ASSIGNMENTS+="${_name}=$(shell_quote "${!_name}") "
done

APP_DIR="/opt/apps/${APP_SLUG}"
PROVIDER_NAME="${APP_SLUG}-${STAGE}"

# ---- SSH setup -----------------------------------------------------------
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/id_deploy && chmod 600 ~/.ssh/id_deploy
ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null

# ---- Copy deploy artifacts to the server ---------------------------------
ssh -i ~/.ssh/id_deploy "$SSH_USER@$SSH_HOST" "mkdir -p '$APP_DIR'"
scp -i ~/.ssh/id_deploy \
  docker-compose.yml \
  "docker-compose.${STAGE}.yml" \
  "auth/blueprint.${STAGE}.yaml" \
  "auth/blueprint.public.${STAGE}.yaml" \
  "$SSH_USER@$SSH_HOST:$APP_DIR/"

# ---- Remote deploy -------------------------------------------------------
ssh -i ~/.ssh/id_deploy "$SSH_USER@$SSH_HOST" \
  "$DEPLOY_ASSIGNMENTS APP_DIR='$APP_DIR' APP_VERSION='$APP_VERSION' IMAGE='$IMAGE' APP_SLUG='$APP_SLUG' APP_PUBLIC='$APP_PUBLIC' STAGE='$STAGE' PROVIDER_NAME='$PROVIDER_NAME' GHCR_USER='${GHCR_USER:-}' GHCR_PAT='${GHCR_PAT:-}' bash -s" <<'REMOTE'
set -euo pipefail
cd "$APP_DIR"

# Rebuild the stage secrets file from GitHub-provided DEPLOY_* vars.
ENV_FILE=".env.${STAGE}"
: > "$ENV_FILE"
chmod 600 "$ENV_FILE"
for _name in $(env | sed -n 's/^\(DEPLOY_[A-Za-z0-9_]*\)=.*/\1/p'); do
  printf '%s=%s\n' "${_name#DEPLOY_}" "${!_name}" >> "$ENV_FILE"
done

if [ -n "$GHCR_PAT" ] && [ -n "$GHCR_USER" ]; then
  echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null 2>&1
fi

export IMAGE APP_VERSION APP_SLUG

# Public apps bypass Authentik entirely: strip the forward-auth middleware.
if [ "$APP_PUBLIC" = "true" ]; then
  sed -i '/middlewares=authentik@docker/d' "docker-compose.${STAGE}.yml"
fi

docker compose -p "${APP_SLUG}-${STAGE}" -f docker-compose.yml -f "docker-compose.${STAGE}.yml" pull
# Drop GHCR credentials so later public-image pulls (e.g. goauthentik/*) aren't denied.
docker logout ghcr.io >/dev/null 2>&1 || true
docker compose -p "${APP_SLUG}-${STAGE}" -f docker-compose.yml -f "docker-compose.${STAGE}.yml" up -d

AK="$(docker ps -q -f name=authentik-server | head -1)"
[ -n "$AK" ] || { echo "authentik-server container not found" >&2; exit 1; }

# Public apps get a link-only Authentik entry (no provider, no auth); others get a proxy provider.
if [ "$APP_PUBLIC" = "true" ]; then
  BP="blueprint.public.${STAGE}.yaml"
else
  BP="blueprint.${STAGE}.yaml"
fi
sed "s/__APP_SLUG__/${APP_SLUG}/g" "$BP" > "/tmp/app-${STAGE}.yaml"
docker cp "/tmp/app-${STAGE}.yaml" "$AK:/blueprints/app-${STAGE}.yaml"
docker exec "$AK" ak apply_blueprint "app-${STAGE}.yaml"

# Attach the provider to the embedded outpost (additive, never replaces) — authenticated apps only.
if [ "$APP_PUBLIC" != "true" ]; then
  docker exec "$AK" ak shell -c "from authentik.outposts.models import Outpost; from authentik.providers.proxy.models import ProxyProvider; o=Outpost.objects.filter(name='authentik Embedded Outpost').first(); p=ProxyProvider.objects.filter(name='${PROVIDER_NAME}').first(); o.providers.add(p) if o and p else None"
fi
REMOTE

echo "Deployed ${APP_SLUG} to ${STAGE} (${IMAGE}:${APP_VERSION})"
