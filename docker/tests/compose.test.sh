#!/usr/bin/env bash
# docker/tests/compose.test.sh — Validate docker-compose configuration
#
# Usage:
#   ./docker/tests/compose.test.sh
#
# Exits 0 on success, 1 on any failure.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0

pass() { echo "[PASS] $*"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $*" >&2; FAIL=$((FAIL + 1)); }
header() { echo ""; echo "=== $* ==="; }

cd "$REPO_ROOT"

# Provide minimal env vars so compose config doesn't fail on required vars
export POSTGRES_PASSWORD=test_password
export REDIS_PASSWORD=test_password
export NEXTAUTH_SECRET=test_secret_32chars_xxxxxxxxxx
export ADMIN_NEXTAUTH_SECRET=test_secret_32chars_xxxxxxxxxx
export DOMAIN=test.example

# ── Test 1: compose config is valid ──────────────────────────
header "Docker Compose config validation"

if docker compose config --quiet 2>/dev/null; then
    pass "docker compose config is valid"
else
    fail "docker compose config failed"
fi

# ── Test 2: Required services are defined ─────────────────────
header "Required services"

REQUIRED_SERVICES=(api dashboard admin caddy postgres)
COMPOSE_SERVICES=$(docker compose config --services 2>/dev/null)

for svc in "${REQUIRED_SERVICES[@]}"; do
    if echo "$COMPOSE_SERVICES" | grep -q "^${svc}$"; then
        pass "Service '${svc}' is defined"
    else
        fail "Service '${svc}' is MISSING"
    fi
done

# ── Test 3: Dockerfiles exist ─────────────────────────────────
header "Dockerfile existence"

DOCKERFILES=(Dockerfile.api Dockerfile.dashboard Dockerfile.admin)
for df in "${DOCKERFILES[@]}"; do
    if [[ -f "$REPO_ROOT/$df" ]]; then
        pass "$df exists"
    else
        fail "$df is MISSING"
    fi
done

# ── Test 4: Caddyfile exists ──────────────────────────────────
header "Caddyfile"

if [[ -f "$REPO_ROOT/Caddyfile" ]]; then
    pass "Caddyfile exists"
else
    fail "Caddyfile is MISSING"
fi

# ── Test 5: Required volumes are declared ─────────────────────
header "Volumes"

REQUIRED_VOLUMES=(postgres_data redis_data caddy_data caddy_config)
COMPOSE_OUTPUT=$(docker compose config 2>/dev/null)

for vol in "${REQUIRED_VOLUMES[@]}"; do
    if echo "$COMPOSE_OUTPUT" | grep -q "${vol}:"; then
        pass "Volume '${vol}' is declared"
    else
        fail "Volume '${vol}' is MISSING"
    fi
done

# ── Test 6: Health checks are defined ────────────────────────
header "Health checks"

# docker compose config emits YAML; we use a simple awk approach:
# Look for the service block and then check if healthcheck appears
# before the next top-level service key.
COMPOSE_YAML=$(docker compose config 2>/dev/null)

HEALTH_SERVICES=(api dashboard admin postgres)
for svc in "${HEALTH_SERVICES[@]}"; do
    # Extract lines between "  <svc>:" and the next service at the same indent
    # then check for "healthcheck"
    if echo "$COMPOSE_YAML" | awk "
        /^  ${svc}:/ { in_svc=1 }
        in_svc && /^  [a-z]/ && !/^  ${svc}:/ { in_svc=0 }
        in_svc && /healthcheck/ { found=1 }
        END { exit (found ? 0 : 1) }
    " 2>/dev/null; then
        pass "Service '${svc}' has a health check"
    else
        fail "Service '${svc}' is missing a health check"
    fi
done

# ── Test 7: No services expose DB ports publicly ─────────────
header "Security: DB not publicly exposed"

DB_PORTS=$(docker compose config 2>/dev/null | grep -A5 'postgres:' | grep 'published:' || true)
if [[ -z "$DB_PORTS" ]]; then
    pass "PostgreSQL port not published to host (good)"
else
    fail "PostgreSQL port is published to host — remove it for production"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

if [[ $FAIL -gt 0 ]]; then
    echo "FAILED" >&2
    exit 1
else
    echo "All tests passed!"
    exit 0
fi
