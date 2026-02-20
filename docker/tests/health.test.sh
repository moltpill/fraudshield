#!/usr/bin/env bash
# docker/tests/health.test.sh — Test health endpoints of running services
#
# Usage (requires running docker compose stack):
#   docker compose up -d
#   ./docker/tests/health.test.sh
#
# Optionally override base URLs:
#   API_URL=http://localhost:3001 DASHBOARD_URL=http://localhost:3002 \
#   ADMIN_URL=http://localhost:3003 ./docker/tests/health.test.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3002}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3003}"
TIMEOUT="${TIMEOUT:-10}"
RETRY_MAX="${RETRY_MAX:-5}"
RETRY_WAIT="${RETRY_WAIT:-5}"

PASS=0
FAIL=0

pass() { echo "[PASS] $*"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $*" >&2; FAIL=$((FAIL + 1)); }
header() { echo ""; echo "=== $* ==="; }

# ── Helper: HTTP check with retries ──────────────────────────
check_url() {
    local label="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local attempt=0

    while [[ $attempt -lt $RETRY_MAX ]]; do
        attempt=$((attempt + 1))
        status=$(curl -s -o /dev/null -w "%{http_code}" \
                      --connect-timeout "$TIMEOUT" \
                      --max-time "$TIMEOUT" \
                      "$url" 2>/dev/null || echo "000")

        if [[ "$status" == "$expected_status" ]]; then
            pass "${label} → HTTP ${status}"
            return 0
        fi

        if [[ $attempt -lt $RETRY_MAX ]]; then
            echo "      [attempt ${attempt}/${RETRY_MAX}] got HTTP ${status}, retrying in ${RETRY_WAIT}s..."
            sleep "$RETRY_WAIT"
        fi
    done

    fail "${label} → HTTP ${status} (expected ${expected_status}) after ${RETRY_MAX} attempts"
    return 1
}

# ── Helper: JSON body check ────────────────────────────────────
check_json_field() {
    local label="$1"
    local url="$2"
    local field="$3"
    local expected="$4"

    actual=$(curl -s --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$url" 2>/dev/null \
             | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('${field}',''))" 2>/dev/null || echo "")

    if [[ "$actual" == "$expected" ]]; then
        pass "${label} → ${field}=${actual}"
    else
        fail "${label} → ${field}='${actual}' (expected '${expected}')"
    fi
}

# ── Test: API health ──────────────────────────────────────────
header "API (${API_URL})"
check_url     "GET /health"              "${API_URL}/health"        200
check_json_field "GET /health JSON status" "${API_URL}/health"      "status" "ok"

# ── Test: Dashboard ───────────────────────────────────────────
header "Dashboard (${DASHBOARD_URL})"
check_url "GET /"            "${DASHBOARD_URL}/"         200
check_url "GET /login"       "${DASHBOARD_URL}/login"    200

# ── Test: Admin ───────────────────────────────────────────────
header "Admin (${ADMIN_URL})"
check_url "GET /"          "${ADMIN_URL}/"       200
check_url "GET /login"     "${ADMIN_URL}/login"  200

# ── Test: Docker compose service status ──────────────────────
header "Docker Compose service status"

if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
    UNHEALTHY=$(docker compose ps --format json 2>/dev/null \
                | python3 -c "
import sys, json
lines = sys.stdin.read().strip().split('\n')
unhealthy = []
for line in lines:
    if not line: continue
    try:
        s = json.loads(line)
        if 'unhealthy' in s.get('Health', '').lower() or \
           'exited' in s.get('State', '').lower():
            unhealthy.append(s.get('Service', '?'))
    except: pass
print('\n'.join(unhealthy))
" 2>/dev/null || true)

    if [[ -z "$UNHEALTHY" ]]; then
        pass "All services healthy/running"
    else
        while IFS= read -r svc; do
            [[ -n "$svc" ]] && fail "Service '${svc}' is unhealthy/exited"
        done <<< "$UNHEALTHY"
    fi
else
    echo "      [SKIP] docker not available in this environment"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

if [[ $FAIL -gt 0 ]]; then
    echo "FAILED" >&2
    exit 1
else
    echo "All health checks passed!"
    exit 0
fi
