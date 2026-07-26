# SkillBridge

SkillBridge is a youth employability platform: skills validation (timed challenges → verified badges), profile building & visibility coaching, rule-based job matching & placement, and a freelance marketplace with escrow-style payments — plus dedicated dashboards for employers, read-only analysts, and administrators.

Stack: **NestJS + Prisma + PostgreSQL** backend (5 independently-runnable services), **Next.js 16 + TypeScript + Tailwind CSS v4** frontend.

```text
skillbridge/
  backend/    NestJS API (5 services), Prisma schema + migrations, seed data
  frontend/   Next.js web app
  docs/       design reference (mockups the frontend theme is built from)
  docker-compose.yml               local Docker stack (+ deploy config)
  SkillBridge_SRS_Update.md         what's changed vs. the original SRS,
                                    and exactly where to edit it
```

**This README covers local development only.** For deployment (putting this on a real server), see [`DEPLOYMENT.md`](DEPLOYMENT.md).

## The Fastest Path: Docker

If you have Docker Desktop, this is the whole setup:

```bash
docker compose --profile local-db up -d postgres
docker compose --profile local-db --profile setup run --rm backend-migrate
docker compose --profile local-db up -d
```

That's Postgres + all 5 backend services + the frontend, all built from source and talking to each other. Open <http://localhost:3000>.

```bash
docker compose --profile local-db ps                 # check status
docker compose --profile local-db logs -f identity-api  # tail one service
docker compose --profile local-db down                # stop everything
docker compose --profile local-db down -v              # also delete the database volume
```

The `local-db` profile is deliberate: it's what makes the bundled Postgres container opt-in for local dev, so the exact same `docker-compose.yml` also works unmodified on a real server pointed at an external database (see the file's own comments) — nothing to toggle by hand.

## Without Docker

Two terminals, backend first:

**Terminal 1 — backend** (detail: [`backend/README.md`](backend/README.md))

```bash
cd backend
cp .env.example .env      # then create the SB_DB database - see backend/README.md
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run build
npm run start:pm2         # all 5 services, or npm run dev:identity etc. for just one
```

**Terminal 2 — frontend** (detail: [`frontend/README.md`](frontend/README.md))

```bash
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_USE_MOCK_API=false to use the real backend
npm install
npm run dev
```

## Frontend Without Any Backend

The frontend also runs completely standalone — `NEXT_PUBLIC_USE_MOCK_API=true` (the default in `frontend/.env.example`) runs entirely on in-browser mock data with no backend, database, or second terminal required. Useful for UI work or a quick look without setting up Postgres at all. See `frontend/README.md` for demo account credentials in both modes.

## Verification

Before considering either side "done":

```bash
# backend/
npx tsc --noEmit -p tsconfig.build.json && npm run build && node --test test && npx prisma validate

# frontend/
npm run typecheck && npm run build && npm run lint
```

## Where Things Are Documented

- **How to run it locally** — this file, `backend/README.md`, `frontend/README.md`.
- **What changed vs. the original SRS, and where to edit the real document** — `SkillBridge_SRS_Update.md`.
- **Design reference** — `docs/design/` (the mockups the actual dark-red "SkillBridge EdTech" theme was built from; the SRS's own Section 3.1 color spec is stale — see the SRS update doc).
- **Deployment** — [`DEPLOYMENT.md`](DEPLOYMENT.md): what stays the same, what to configure, step-by-step, security checklist, redeploy procedure.

