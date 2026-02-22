#!/usr/bin/env bash
# scripts/deploy.sh — SSH deploy script for FraudShield
#
# Usage (from CI or manually):
#   SSH_HOST=1.2.3.4 SSH_USER=deploy REPO_DIR=/opt/fraudshield ./scripts/deploy.sh
#
# Requires on the server:
#   - Docker + Docker Compose plugin
#   - Git repo cloned to $REPO_DIR
#   - .env file present in $REPO_DIR

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
SSH_HOST="${SSH_HOST:?SSH_HOST not set}"
SSH_USER="${SSH_USER:-deploy}"
REPO_DIR="${REPO_DIR:-/opt/fraudshield}"
BRANCH="${BRANCH:-main}"
SSH_KEY_FILE="${SSH_KEY_FILE:-}"   # optional: path to identity file

SSH_OPTS="-o StrictHostKeyChecking=no -o BatchMode=yes"
if [[ -n "$SSH_KEY_FILE" ]]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY_FILE"
fi

ssh_run() {
    ssh $SSH_OPTS "${SSH_USER}@${SSH_HOST}" "$@"
}

# ── Deploy ────────────────────────────────────────────────────
echo "==> Deploying to ${SSH_USER}@${SSH_HOST}:${REPO_DIR} (branch: ${BRANCH})"

ssh_run bash -s <<EOF
set -euo pipefail

cd "${REPO_DIR}"

echo "--> Pulling latest code (${BRANCH})"
git fetch --all
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "--> Building Docker images"
docker compose build --pull

echo "--> Running database migrations"
docker compose run --rm api npx prisma migrate deploy

echo "--> Restarting services (force recreate for label/middleware changes)"
docker compose up -d --force-recreate --remove-orphans

echo "--> Waiting for services to be healthy (max 120s)"
timeout=120
elapsed=0
while [[ \$elapsed -lt \$timeout ]]; do
    if docker compose ps | grep -E "(unhealthy|starting)" | grep -v "caddy"; then
        sleep 5
        elapsed=\$((elapsed + 5))
    else
        break
    fi
done

echo "--> Health check"
sleep 3
docker compose ps

# Verify API health endpoint
if ! docker compose exec -T api wget -qO- http://localhost:3001/health > /dev/null 2>&1; then
    echo "ERROR: API health check failed"
    docker compose logs api --tail=50
    exit 1
fi

echo "--> Pruning old images"
docker image prune -f

echo "==> Deploy complete!"
EOF
