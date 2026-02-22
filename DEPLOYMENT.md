# Deployment Guide

## Hetzner Production Server

- **Server:** `root@46.62.220.221`
- **Repo Path:** `/opt/claworg`
- **Branch:** `main`

## Quick Deploy

SSH into the server and run:

```bash
cd /opt/claworg
./scripts/deploy-hetzner.sh
```

Or deploy remotely:

```bash
ssh root@46.62.220.221 'cd /opt/claworg && ./scripts/deploy-hetzner.sh'
```

## Manual Deploy

```bash
cd /opt/claworg
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.hetzner.yml build --pull
docker compose -f docker-compose.yml -f docker-compose.hetzner.yml up -d --force-recreate --remove-orphans
```

## ⚠️ Important: Always Use `--force-recreate`

When deploying container changes, **always** use `--force-recreate`:

```bash
docker compose up -d --force-recreate
```

### Why?

Docker labels (used by Traefik, Caddy routing rules, etc.) are only read when containers are **created**, not when they're restarted. Without `--force-recreate`:

- Label changes won't take effect
- Middleware configurations won't update
- You'll get 404 errors even after successful deployments
- Routing rules will be stale

### What `--force-recreate` Does

- Stops and removes existing containers
- Creates new containers from the current image/config
- Ensures all Docker labels are re-read
- Guarantees middleware/routing changes take effect

### When You Need It

- After changing Docker labels in compose files
- After modifying traefik/caddy routing
- After adding/removing middleware
- Basically: **always use it for production deploys**

## CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys on push to `main`. It uses `scripts/deploy.sh` which includes `--force-recreate`.

## Compose Files

- **`docker-compose.yml`** — Base configuration (works for dev and prod)
- **`docker-compose.hetzner.yml`** — Production overrides (logging, etc.)

Use both for production:

```bash
docker compose -f docker-compose.yml -f docker-compose.hetzner.yml <command>
```

## Troubleshooting

### 404 After Deploy

If you're getting 404s after a deploy:

1. Check if containers were recreated:
   ```bash
   docker compose ps
   ```

2. Force recreate:
   ```bash
   docker compose up -d --force-recreate
   ```

3. Check logs:
   ```bash
   docker compose logs -f caddy
   docker compose logs -f api
   ```

### Health Check Failures

```bash
# Check individual service health
docker compose exec api wget -qO- http://localhost:3001/health

# View service logs
docker compose logs api --tail=50
```

### Database Issues

```bash
# Run migrations manually
docker compose run --rm api npx prisma migrate deploy

# Access postgres
docker compose exec postgres psql -U fraudshield -d fraudshield
```
