# Deploying SkillBridge

The actual, current, known-working runbook for this deployment. Infra:

```text
6725-lb-01     HAProxy load balancer, TLS termination (www.jonaintra.tech),
               path-based routing (/movie_trends, /resume, /kbyg, /skillbridge)
6725-web-01    App server #1 - nginx (path routing under /skillbridge/*) +
               the full SkillBridge Docker stack
6725-web-02    App server #2 - identical setup to web-01
```

Domain: **only `www.jonaintra.tech` resolves** — the bare `jonaintra.tech`
apex has no DNS record. Every URL below uses `www`.

Images are **built on your local machine, pushed to Docker Hub
(`jonathan22liv/...`), then pulled on both servers** — never built on the
servers themselves. The servers are too small (1GB RAM) to build a Next.js
frontend without thrashing; see the "why" in git history if curious. The
servers are `linux/arm64` — every build below uses `docker buildx --platform
linux/arm64`.

## Files

```text
docker-compose.prod.yml   deployment stack (6 backend services + frontend,
                           no bundled Postgres, no seeding)
backend/Dockerfile.prod   hardened backend image (shared by all 6 backend
                           services - only the runtime `command:` differs)
frontend/Dockerfile.prod  hardened frontend image
```

## Whenever backend code changes (including a new Prisma migration)

**1. On your local machine — build + push all 6 backend images:**
```
docker buildx build --platform linux/arm64 -f backend/Dockerfile.prod -t jonathan22liv/identity-api:latest -t jonathan22liv/learning-api:latest -t jonathan22liv/matching-api:latest -t jonathan22liv/marketplace-api:latest -t jonathan22liv/admin-api:latest -t jonathan22liv/messaging-api:latest --push backend
```

**2. Commit and push your source changes to git** (the migrate job builds from the server's own checkout, not from a pulled image — it needs the new migration file physically present there).

**3. On *both* `web-01` and `web-02`:**
```bash
cd /srv/SkillBridge
git pull

docker compose -f docker-compose.prod.yml --profile setup run --rm backend-migrate

docker compose -f docker-compose.prod.yml pull identity-api && docker compose -f docker-compose.prod.yml up -d identity-api
docker compose -f docker-compose.prod.yml pull learning-api && docker compose -f docker-compose.prod.yml up -d learning-api
docker compose -f docker-compose.prod.yml pull matching-api && docker compose -f docker-compose.prod.yml up -d matching-api
docker compose -f docker-compose.prod.yml pull marketplace-api && docker compose -f docker-compose.prod.yml up -d marketplace-api
docker compose -f docker-compose.prod.yml pull admin-api && docker compose -f docker-compose.prod.yml up -d admin-api
docker compose -f docker-compose.prod.yml pull messaging-api && docker compose -f docker-compose.prod.yml up -d messaging-api
```

## Whenever frontend code changes

**1. On your local machine:**
```
docker buildx build --platform linux/arm64 -f frontend/Dockerfile.prod --build-arg NEXT_PUBLIC_USE_MOCK_API=false --build-arg NEXT_PUBLIC_IDENTITY_API_URL=https://www.jonaintra.tech/skillbridge/api/identity --build-arg NEXT_PUBLIC_LEARNING_API_URL=https://www.jonaintra.tech/skillbridge/api/learning --build-arg NEXT_PUBLIC_MATCHING_API_URL=https://www.jonaintra.tech/skillbridge/api/matching --build-arg NEXT_PUBLIC_MARKETPLACE_API_URL=https://www.jonaintra.tech/skillbridge/api/marketplace --build-arg NEXT_PUBLIC_ADMIN_API_URL=https://www.jonaintra.tech/skillbridge/api/admin --build-arg NEXT_PUBLIC_MESSAGING_API_URL=https://www.jonaintra.tech/skillbridge/api/messaging --build-arg NEXT_PUBLIC_WS_URL=https://www.jonaintra.tech/skillbridge/api/matching -t jonathan22liv/frontend:latest --push frontend
```

**2. On *both* `web-01` and `web-02`:**
```bash
docker compose -f docker-compose.prod.yml pull frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Full from-scratch bring-up (both servers)

```bash
cd /srv/SkillBridge && git pull
docker compose -f docker-compose.prod.yml --profile setup run --rm backend-migrate
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d identity-api
docker compose -f docker-compose.prod.yml up -d learning-api
docker compose -f docker-compose.prod.yml up -d matching-api
docker compose -f docker-compose.prod.yml up -d marketplace-api
docker compose -f docker-compose.prod.yml up -d admin-api
docker compose -f docker-compose.prod.yml up -d messaging-api
docker compose -f docker-compose.prod.yml up -d frontend
```

## Required root `.env` (same values on both servers, `/srv/SkillBridge/.env`)

```
DATABASE_URL=<Neon pooled connection string, sslmode=require>
AUTH_TOKEN_SECRET=<real random secret>
ECR_REGISTRY=jonathan22liv
APP_BASE_URL=https://www.jonaintra.tech/skillbridge
CORS_ORIGIN=https://www.jonaintra.tech
PASSWORD_RESET_URL=https://www.jonaintra.tech/skillbridge/reset-password
LEARNING_API_PUBLIC_URL=https://www.jonaintra.tech/skillbridge/api/learning
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_IDENTITY_API_URL=https://www.jonaintra.tech/skillbridge/api/identity
NEXT_PUBLIC_LEARNING_API_URL=https://www.jonaintra.tech/skillbridge/api/learning
NEXT_PUBLIC_MATCHING_API_URL=https://www.jonaintra.tech/skillbridge/api/matching
NEXT_PUBLIC_MARKETPLACE_API_URL=https://www.jonaintra.tech/skillbridge/api/marketplace
NEXT_PUBLIC_ADMIN_API_URL=https://www.jonaintra.tech/skillbridge/api/admin
NEXT_PUBLIC_MESSAGING_API_URL=https://www.jonaintra.tech/skillbridge/api/messaging
NEXT_PUBLIC_WS_URL=https://www.jonaintra.tech/skillbridge/api/matching
```
Note: the `NEXT_PUBLIC_*` values here are only for reference/consistency —
they're baked into the frontend image at build time on your local machine
(the `--build-arg` flags above), not read from the server's `.env` at runtime.

`backend/.env` (also both servers) needs `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
set to a **verified Resend domain** (not a `@gmail.com` address — Resend
rejects that outside sandbox mode).

## nginx — `/etc/nginx/sites-available/jonaintra.tech` (both servers)

One `location` block per backend service, all proxying to `127.0.0.1:<port>`:

| Service | Port | nginx path |
|---|---|---|
| identity-api | 3101 | `/skillbridge/api/identity/` |
| learning-api | 3102 | `/skillbridge/api/learning/` |
| matching-api | 3103 | `/skillbridge/api/matching/` |
| marketplace-api | 3104 | `/skillbridge/api/marketplace/` |
| admin-api | 3105 | `/skillbridge/api/admin/` |
| messaging-api | 3106 | `/skillbridge/api/messaging/` |
| frontend | 3000 | `/skillbridge/` (catch-all, must come after the API blocks above) |

Example block (messaging shown, same pattern for the others):
```nginx
    location /skillbridge/api/messaging/ {
        proxy_pass http://127.0.0.1:3106/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
```
After any nginx edit: `sudo nginx -t && sudo systemctl reload nginx`.

**Known gotcha**: `web-02` previously had Ubuntu's stock `sites-enabled/default`
still active with `default_server` on port 80, which silently intercepted
requests before `jonaintra.tech`'s own block ran. Confirm it's gone:
```bash
ls -la /etc/nginx/sites-enabled/   # should show ONLY jonaintra.tech
```

## Verify everything end-to-end

```bash
# On the LB (6725-lb-01) - both should show UP
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | grep -E "^(skillbridge_backend|pxname)" | cut -d',' -f1,2,18

# On each web server
docker compose -f docker-compose.prod.yml ps            # all 7 containers "Up (healthy)"
curl -s http://localhost:3101/api/v1/health | head -c 200; echo
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/skillbridge/   # expect 200
```

Then load `https://www.jonaintra.tech/skillbridge/` in a real browser.

## What's deliberately NOT automated

- **No demo data in production.** `backend-migrate` only runs `prisma migrate
  deploy` (schema only) — never `prisma db seed`, which fills the database
  with fake demo accounts (see `backend/prisma/seed.ts`, `demoPassword`) for
  local dev only.
- **Real skill-challenge content** (Python/JS/CSS/HTML/MySQL + soft-skill
  tests) comes from `backend/prisma/seed.prod.ts` instead — safe to re-run,
  skips anything that already exists:
  ```bash
  docker compose -f docker-compose.prod.yml run --rm backend-migrate sh -c "npm run prisma:seed:prod"
  ```

## Security checklist before going live

- [ ] `AUTH_TOKEN_SECRET` is a real random value (`openssl rand -hex 32`), not a placeholder.
- [ ] `DATABASE_URL` uses `sslmode=require` and real Neon credentials.
- [ ] `CORS_ORIGIN` / `APP_BASE_URL` / `PASSWORD_RESET_URL` use `https://www.jonaintra.tech`, not `localhost` or the bare apex domain.
- [ ] `RESEND_FROM_EMAIL` is on a domain verified in Resend, not `@gmail.com`.
- [ ] `MOMO_CALLBACK_HOST` and `GOOGLE_REDIRECT_URI` (in `backend/.env`) are real public HTTPS URLs, registered wherever those providers require it.
- [ ] `backend/.env` and the root `.env` are not committed to git and are readable only by the deploy user.
