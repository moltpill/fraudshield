#!/usr/bin/env bash
# scripts/deploy-hetzner.sh — Quick deploy helper for Hetzner production
#
# Usage (run from any directory):
#   ./scripts/deploy-hetzner.sh
#
# Or remotely:
#   ssh root@46.62.220.221 'cd /opt/claworg && ./scripts/deploy-hetzner.sh'
#
# This script:
#   - Pulls latest code
#   - Rebuilds and restarts all containers with --force-recreate
#   - Uses --force-recreate to ensure Docker picks up label/middleware changes
#
# Why --force-recreate?
#   Traefik and other reverse proxies read configuration from Docker labels.
#   Without --force-recreate, label changes aren't applied to running containers,
#   causing 404s and middleware issues after deployments.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
REPO_DIR="${REPO_DIR:-/opt/claworg}"
BRANCH="${BRANCH:-main}"

# Detect compose file setup
COMPOSE_CMD="docker compose"
if [[ -f "${REPO_DIR}/docker-compose.hetzner.yml" ]]; then
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.hetzner.yml"
fi

# ── Deploy ────────────────────────────────────────────────────
cd "$REPO_DIR"

echo "==> Deploying FraudShield to Hetzner (branch: ${BRANCH})"
echo "    Using: ${COMPOSE_CMD}"

echo "--> Pulling latest code"
git fetch --all
git checkout "$BRANCH"
git reset --hard "origin/${BRANCH}"

echo "--> Building Docker images"
$COMPOSE_CMD build --pull

echo "--> Running database migrations"
$COMPOSE_CMD run --rm api npx prisma migrate deploy || true

echo "--> Restarting services (force recreate)"
$COMPOSE_CMD up -d --force-recreate --remove-orphans

echo "--> Waiting for services to stabilize"
sleep 5

echo "--> Health check"
$COMPOSE_CMD ps

# Verify API
if $COMPOSE_CMD exec -T api wget -qO- http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ API health check passed"
else
    echo "✗ API health check failed"
    $COMPOSE_CMD logs api --tail=30
    exit 1
fi

echo "--> Pruning old images"
docker image prune -f

echo ""
echo "==> Deploy complete!"
