#!/usr/bin/env bash
# scripts/hetzner-setup.sh — Initial server setup for Hetzner Cloud (Ubuntu 22.04)
#
# Run this ONCE on a fresh server as root:
#   curl -fsSL https://raw.githubusercontent.com/your-org/fraud-sdk-saas/main/scripts/hetzner-setup.sh | bash
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose plugin
#   3. Creates a 'deploy' user with Docker access
#   4. Clones the repo
#   5. Prompts to configure .env

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/your-org/fraud-sdk-saas.git}"
REPO_DIR="${REPO_DIR:-/opt/fraudshield}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
BRANCH="${BRANCH:-main}"

# ── Helpers ───────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Run this script as root."

# ── 1. System update ──────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git ca-certificates gnupg lsb-release ufw fail2ban

# ── 2. Install Docker ─────────────────────────────────────────
info "Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
else
    info "Docker already installed: $(docker --version)"
fi

# Ensure Docker Compose plugin is available
docker compose version &>/dev/null || error "Docker Compose plugin not found. Install it manually."

systemctl enable docker
systemctl start docker

# ── 3. Create deploy user ─────────────────────────────────────
info "Creating '${DEPLOY_USER}' user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

# Copy root's authorized_keys to deploy user (CI will SSH as this user)
DEPLOY_HOME="/home/${DEPLOY_USER}"
mkdir -p "${DEPLOY_HOME}/.ssh"
cp ~/.ssh/authorized_keys "${DEPLOY_HOME}/.ssh/" 2>/dev/null || warn "No authorized_keys to copy"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"
chmod 700 "${DEPLOY_HOME}/.ssh"
chmod 600 "${DEPLOY_HOME}/.ssh/authorized_keys" 2>/dev/null || true

# ── 4. Firewall (UFW) ─────────────────────────────────────────
info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp   # HTTP/3 (QUIC)
ufw --force enable

# ── 5. Clone repository ───────────────────────────────────────
info "Cloning repository to ${REPO_DIR}..."
if [[ -d "${REPO_DIR}/.git" ]]; then
    info "Repo already exists, pulling latest..."
    sudo -u "$DEPLOY_USER" git -C "$REPO_DIR" pull
else
    sudo -u "$DEPLOY_USER" git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$REPO_DIR"

# ── 6. Configure environment ──────────────────────────────────
ENV_FILE="${REPO_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    info "Creating .env from .env.example..."
    cp "${REPO_DIR}/.env.example" "$ENV_FILE"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    warn "IMPORTANT: Edit ${ENV_FILE} with your real values before starting services!"
    warn "  - Set DOMAIN, POSTGRES_PASSWORD, NEXTAUTH_SECRET, ADMIN_NEXTAUTH_SECRET"
    warn "  - Then run: cd ${REPO_DIR} && ./scripts/deploy-hetzner.sh"
else
    info ".env already exists, skipping."
fi

# ── 7. Optional: Create data directory ───────────────────────
mkdir -p /opt/fraudshield-data
chown "${DEPLOY_USER}:${DEPLOY_USER}" /opt/fraudshield-data

# ── Done ──────────────────────────────────────────────────────
info ""
info "=== Setup complete! ==="
info ""
info "Next steps:"
info "  1. Edit ${ENV_FILE}"
info "  2. cd ${REPO_DIR}"
info "  3. ./scripts/deploy-hetzner.sh"
info ""
info "Deploy user SSH: ssh ${DEPLOY_USER}@$(hostname -I | awk '{print $1}')"
