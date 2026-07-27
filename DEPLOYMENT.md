# Deploying SkillBridge

This covers putting SkillBridge on a real server. Local development uses
`docker-compose.yml` (see [`README.md`](README.md)) — deployment uses the
separate files described here instead:

```text
docker-compose.prod.yml   deployment stack (no bundled Postgres, no seeding,
                           requires real config instead of defaulting to
                           localhost)
backend/Dockerfile.prod   hardened backend image (non-root, dumb-init,
                           HEALTHCHECK)
frontend/Dockerfile.prod  hardened frontend image (same hardening)
```

## What's different from local dev

- **Database**: no bundled Postgres container. `DATABASE_URL` in the root
  `.env` must point at your real database (e.g. a Neon pooled connection
  string with `?sslmode=require`). If it's missing, `docker compose` refuses
  to start instead of silently falling back to a local default.
- **No demo data**: the migrate job only runs `prisma migrate deploy`
  (schema only). It never runs `prisma db seed` — that fills the database
  with fake demo accounts (see `backend/prisma/seed.ts`, look for
  `demoPassword`) meant for local dev only. Your production database's real
  content comes from real user signups.
- **Hardened images**: `Dockerfile.prod` runs as a non-root user, uses
  `dumb-init` as PID 1 so `docker stop` / rolling restarts shut down
  cleanly, and adds a container `HEALTHCHECK` against each service's own
  `/api/v1/health` endpoint. The frontend only starts once every backend
  service reports healthy.

## One-time server setup

1. Install Docker + the Docker Compose plugin on the server.
2. Clone this repo onto the server.
3. Copy env templates and fill in real values:
   ```bash
   cp .env.example .env                                  # root: DATABASE_URL, AUTH_TOKEN_SECRET, domains, NEXT_PUBLIC_* URLs
   cp backend/.env.deploy.example backend/.env            # backend: Resend, MoMo, Cloudinary, Google OAuth, etc.
   ```
   Every `CHANGE ON DEPLOY` line in `backend/.env.deploy.example` needs a
   real value; the file's own comments say which of the two `.env` files
   actually controls each variable under Docker (root vs `backend/.env`).
4. Point your DNS / reverse proxy at the ports this stack exposes
   (3101–3105 for the backend services, 3000 for the frontend), or put
   Nginx/Caddy in front for TLS.

## Bringing the stack up, one service at a time

Building/starting services individually keeps the blast radius of any one
step small and avoids spiking CPU/RAM building everything at once:

```bash
# 1. Apply schema migrations (safe to run against a real database — no seed)
docker compose -f docker-compose.prod.yml --profile setup run --rm backend-migrate

# 2. Build and start each backend service in turn
docker compose -f docker-compose.prod.yml up -d --build identity-api
docker compose -f docker-compose.prod.yml up -d --build learning-api
docker compose -f docker-compose.prod.yml up -d --build matching-api
docker compose -f docker-compose.prod.yml up -d --build marketplace-api
docker compose -f docker-compose.prod.yml up -d --build admin-api

# 3. Build and start the frontend last (waits for the above to be healthy)
docker compose -f docker-compose.prod.yml up -d --build frontend
```

Check status and logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f identity-api
```

## Redeploying after a code change

```bash
git pull
docker compose -f docker-compose.prod.yml --profile setup run --rm backend-migrate   # only if new migrations were added
docker compose -f docker-compose.prod.yml up -d --build <service-that-changed>
```

Only rebuild the services whose code actually changed — the rest keep
running undisturbed.

## Security checklist before going live

- [ ] `AUTH_TOKEN_SECRET` is a real random value (`openssl rand -hex 32`), not the local dev default.
- [ ] `DATABASE_URL` uses `sslmode=require` (or the provider's equivalent) and real credentials.
- [ ] `CORS_ORIGIN` / `APP_BASE_URL` / `PASSWORD_RESET_URL` are your real HTTPS domain, not `localhost`.
- [ ] `MOMO_CALLBACK_HOST` and `GOOGLE_REDIRECT_URI` (in `backend/.env`) are real public HTTPS URLs, and the Google redirect URI is registered on the OAuth client.
- [ ] TLS is terminated somewhere (reverse proxy / load balancer) — this stack itself serves plain HTTP.
- [ ] `backend/.env` and the root `.env` are not committed to git and are readable only by the deploy user.
