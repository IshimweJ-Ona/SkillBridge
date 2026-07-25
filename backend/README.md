# SkillBridge Backend

NestJS + Prisma + PostgreSQL backend for the SkillBridge employability platform. Runs as **5 separate service processes** sharing one Prisma schema, not one monolith:

| Service | Port | Covers |
|---|---|---|
| `identity-api` | 3101 | auth, users, profiles, subscriptions, feedback |
| `learning-api` | 3102 | skill challenges, submissions, badges |
| `matching-api` | 3103 | companies, jobs, applications, real-time notifications gateway |
| `marketplace-api` | 3104 | freelance listings, contracts, escrow, disputes |
| `admin-api` | 3105 | analytics, reports, audit log, user/company administration |

All 5 share the same Prisma schema, the same source under `src/`, and the same `.env` — they differ only in which NestJS module they boot (`apps/<service>/src/<service>.module.ts`) and which port they listen on. Every route is versioned under `/api/v1`.

This README is for **local development**. For deployment, see [`DEPLOYMENT.md`](../DEPLOYMENT.md) at the repo root — it walks through the full server setup and points at [`.env.deploy.example`](.env.deploy.example) for exactly which values in this folder to change.

## Requirements

- Node.js 20+
- npm
- Either a local PostgreSQL 16 install, **or** Docker Desktop (recommended — no local Postgres install needed)

## 1. Environment

```bash
cp .env.example .env
```

Every value in `.env.example` is commented with what it does and whether it's required. Short version: `DATABASE_URL` and `AUTH_TOKEN_SECRET` matter immediately; Resend/WhatsApp/MTN MoMo/Cloudinary/Google OAuth can all stay empty for local dev — each degrades gracefully (skipped email, "not configured" payment error, manual URL upload fallback, OAuth button redirects with an error) instead of crashing anything.

## 2. Database

**Option A — Docker (recommended, no local Postgres install needed).** From the **project root** (one level up):

```bash
docker compose --profile local-db up -d postgres
```

Wait for it to report healthy (`docker compose ps`), then skip to step 3. The default `backend/.env.example` `DATABASE_URL` already matches this container (`localhost:5432`, user `sb_user`, password `sb_password`, database `SB_DB`) — no edits needed. This container is gitignored/ephemeral local state; deploying doesn't use it (see the root README).

**Option B — a Postgres install already on your machine.** The database name must be `SB_DB` — because it has uppercase letters, keep the double quotes around it in SQL.

```bash
psql -U postgres
```

```sql
CREATE ROLE sb_user WITH LOGIN CREATEDB PASSWORD 'sb_password';
CREATE DATABASE "SB_DB" OWNER sb_user;
GRANT ALL PRIVILEGES ON DATABASE "SB_DB" TO sb_user;
\connect "SB_DB"
GRANT ALL ON SCHEMA public TO sb_user;
ALTER SCHEMA public OWNER TO sb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO sb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO sb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO sb_user;
\q
```

(`CREATEDB` lets `prisma migrate dev` create its temporary shadow database.)

## 3. Install, Migrate, Seed

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

The seed script prints every seeded user with their profile. All seeded accounts share the password:

```text
SkillBridge@123
```

## 4. Run

**Docker (recommended)** — from the project root, brings up all 5 services plus the frontend:

```bash
docker compose --profile local-db up -d
```

**Native, one service at a time** (fast iteration, no rebuild needed per change):

```bash
npm run dev:identity      # or dev:learning / dev:matching / dev:marketplace / dev:admin
```

**Native, all 5 at once with crash isolation** (matches how it actually runs in production — one service crashing doesn't take down the others):

```bash
npm run build
npm run start:pm2
pm2 logs        # tail all 5
pm2 stop all
```

Health check any running service:

```text
GET http://localhost:3101/api/v1/health
```

## Signup & Auth Behavior

- Youth users can sign up with email **or** phone; employers must use email.
- Verification is a 6-digit OTP — sent by email if the account has one, otherwise by WhatsApp (`WHATSAPP_*` must be configured; unconfigured accounts with phone-only signup won't receive a code).
- Sessions are httpOnly cookies (`access_token`/`refresh_token`), never `localStorage` — the frontend never touches the raw token.
- Google OAuth (`GET /auth/google`) works end-to-end if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` are set; otherwise it redirects to the frontend with `?error=oauth_not_configured` rather than erroring.

## Real-Time Notifications (built, not yet used by the frontend)

`matching-api` runs a Socket.IO gateway (`@nestjs/websockets`) on the `/notifications` namespace: connect with a JWT (`auth: { token: "Bearer <access token>" }`), and the socket joins a private `user:<uuid>` room, receiving `notification:received` events the instant a notification is created. Fully implemented and working server-side — the frontend doesn't connect to it yet (it currently polls `GET /notifications/me/unread-count` every 30s instead). `NEXT_PUBLIC_WS_URL` is already defined in the frontend env for whenever this gets wired up.

## API Reference

Grouped by controller; `PUBLIC` = no auth required, otherwise the roles listed (or "any authenticated role" if no specific role is required).

<details>
<summary>auth</summary>

```text
POST   /api/v1/auth/signup                 PUBLIC
POST   /api/v1/auth/verify-otp              PUBLIC
POST   /api/v1/auth/login                   PUBLIC
POST   /api/v1/auth/refresh                 PUBLIC
POST   /api/v1/auth/resend-otp              PUBLIC
POST   /api/v1/auth/password-reset/request  PUBLIC
POST   /api/v1/auth/forgot-password         PUBLIC
POST   /api/v1/auth/password-reset/confirm  PUBLIC
POST   /api/v1/auth/reset-password          PUBLIC
POST   /api/v1/auth/change-password         any authenticated role
POST   /api/v1/auth/password/change         any authenticated role
GET    /api/v1/auth/google                  PUBLIC
GET    /api/v1/auth/google/callback         PUBLIC
GET    /api/v1/auth/me                      any authenticated role
PATCH  /api/v1/auth/onboarding              any authenticated role
POST   /api/v1/auth/logout                  any authenticated role
```
</details>

<details>
<summary>users, profiles, subscriptions</summary>

```text
POST   /api/v1/users                        ADMINISTRATOR
GET    /api/v1/users                        ADMINISTRATOR
GET    /api/v1/users/stats/summary          ADMINISTRATOR
GET    /api/v1/users/:uuid                  ADMINISTRATOR
PATCH  /api/v1/users/:uuid/status           ADMINISTRATOR
PATCH  /api/v1/users/:uuid                  ADMINISTRATOR
DELETE /api/v1/users/:uuid                  ADMINISTRATOR

POST   /api/v1/profiles                     YOUTH_USER, ADMINISTRATOR
GET    /api/v1/profiles                     EMPLOYER, ADMINISTRATOR, ANALYST
GET    /api/v1/profiles/stats/summary       ADMINISTRATOR, ANALYST
GET    /api/v1/profiles/by-user/:userUuid   YOUTH_USER, ADMINISTRATOR
GET    /api/v1/profiles/public/:uuid        PUBLIC
GET    /api/v1/profiles/:uuid/completeness  YOUTH_USER, EMPLOYER, ADMINISTRATOR, ANALYST
GET    /api/v1/profiles/:uuid               YOUTH_USER, EMPLOYER, ADMINISTRATOR, ANALYST
PATCH  /api/v1/profiles/:uuid/visibility    YOUTH_USER, ADMINISTRATOR
PATCH  /api/v1/profiles/:uuid               YOUTH_USER, ADMINISTRATOR
DELETE /api/v1/profiles/:uuid               YOUTH_USER, ADMINISTRATOR

GET    /api/v1/subscriptions                       ADMINISTRATOR, ANALYST
GET    /api/v1/subscriptions/stats/summary          ADMINISTRATOR, ANALYST
GET    /api/v1/subscriptions/by-user/:userUuid      YOUTH_USER, EMPLOYER, ADMINISTRATOR
PATCH  /api/v1/subscriptions/by-user/:userUuid      YOUTH_USER, EMPLOYER, ADMINISTRATOR
```
</details>

<details>
<summary>challenges, badges</summary>

```text
POST   /api/v1/companies/:companyUuid/challenges       EMPLOYER, ADMINISTRATOR
GET    /api/v1/challenges                              PUBLIC
GET    /api/v1/challenges/:uuid                        PUBLIC
POST   /api/v1/challenges/:uuid/start                  YOUTH_USER, ADMINISTRATOR
PATCH  /api/v1/challenge-submissions/:uuid/autosave     YOUTH_USER, ADMINISTRATOR
POST   /api/v1/challenge-submissions/:uuid/submit       YOUTH_USER, ADMINISTRATOR
GET    /api/v1/badges/by-user/:userUuid                YOUTH_USER, EMPLOYER, ADMINISTRATOR
GET    /api/v1/badges/verify/:uuid                     PUBLIC
```
</details>

<details>
<summary>companies, jobs, applications</summary>

```text
POST   /api/v1/companies                    EMPLOYER, ADMINISTRATOR
GET    /api/v1/companies                    any authenticated role
GET    /api/v1/companies/mine               EMPLOYER
PATCH  /api/v1/companies/:uuid/verify       ADMINISTRATOR
POST   /api/v1/companies/:companyUuid/jobs  EMPLOYER, ADMINISTRATOR

GET    /api/v1/jobs                         PUBLIC
GET    /api/v1/jobs/matches/me              YOUTH_USER, ADMINISTRATOR
GET    /api/v1/jobs/mine                    EMPLOYER
GET    /api/v1/jobs/:uuid                   PUBLIC
POST   /api/v1/jobs/:uuid/match             EMPLOYER, ADMINISTRATOR
POST   /api/v1/jobs/:uuid/applications      YOUTH_USER, ADMINISTRATOR
POST   /api/v1/jobs/:uuid/confirm-placement EMPLOYER, ADMINISTRATOR

GET    /api/v1/applications                 YOUTH_USER, EMPLOYER, ADMINISTRATOR
PATCH  /api/v1/applications/:uuid/status    EMPLOYER, ADMINISTRATOR
```
</details>

<details>
<summary>marketplace</summary>

```text
POST   /api/v1/marketplace/listings                     YOUTH_USER, ADMINISTRATOR
GET    /api/v1/marketplace/listings                     PUBLIC
GET    /api/v1/marketplace/listings/mine                YOUTH_USER, ADMINISTRATOR
GET    /api/v1/marketplace/listings/:uuid                PUBLIC
POST   /api/v1/marketplace/listings/:uuid/requests       YOUTH_USER, EMPLOYER, ADMINISTRATOR
GET    /api/v1/marketplace/requests/mine                 YOUTH_USER, ADMINISTRATOR
POST   /api/v1/marketplace/requests/:uuid/contracts       YOUTH_USER, ADMINISTRATOR
GET    /api/v1/marketplace/contracts/mine                 YOUTH_USER, ADMINISTRATOR
PATCH  /api/v1/marketplace/contracts/:uuid/status          ADMINISTRATOR, EMPLOYER, YOUTH_USER
POST   /api/v1/marketplace/contracts/:uuid/release-payment  ADMINISTRATOR
POST   /api/v1/marketplace/contracts/:uuid/reviews           YOUTH_USER, ADMINISTRATOR
POST   /api/v1/marketplace/transactions/:uuid/disputes        YOUTH_USER, EMPLOYER, ADMINISTRATOR
GET    /api/v1/marketplace/earnings/me                    YOUTH_USER, ADMINISTRATOR
```
</details>

<details>
<summary>admin, feedback, notifications, integrations</summary>

```text
GET    /api/v1/admin/analytics/summary                   ADMINISTRATOR, ANALYST
GET    /api/v1/admin/analytics/skill-demand               ADMINISTRATOR, ANALYST
GET    /api/v1/admin/analytics/employment-outcomes         ADMINISTRATOR, ANALYST
POST   /api/v1/admin/reports                              ADMINISTRATOR, ANALYST
GET    /api/v1/admin/reports                              ADMINISTRATOR, ANALYST
GET    /api/v1/admin/audit-logs                           ADMINISTRATOR, ANALYST
POST   /api/v1/admin/data-exports/me                       ADMINISTRATOR, ANALYST
PATCH  /api/v1/admin/data-exports/:uuid/complete            ADMINISTRATOR
POST   /api/v1/admin/maintenance/archive-inactive-users      ADMINISTRATOR

POST   /api/v1/feedback                     PUBLIC
GET    /api/v1/feedback                     ADMINISTRATOR, ANALYST
GET    /api/v1/feedback/stats/summary       ADMINISTRATOR, ANALYST
GET    /api/v1/feedback/:uuid               ADMINISTRATOR, ANALYST
PATCH  /api/v1/feedback/:uuid/status        ADMINISTRATOR
PATCH  /api/v1/feedback/:uuid               ADMINISTRATOR
DELETE /api/v1/feedback/:uuid               ADMINISTRATOR

GET    /api/v1/notifications/me                       any authenticated role
GET    /api/v1/notifications/me/unread-count            any authenticated role
PATCH  /api/v1/notifications/me/read-all                any authenticated role
PATCH  /api/v1/notifications/me/:uuid/read               any authenticated role
GET    /api/v1/notifications/me/preferences               any authenticated role
PATCH  /api/v1/notifications/me/preferences                any authenticated role
GET    /api/v1/notifications                             ADMINISTRATOR, ANALYST
POST   /api/v1/notifications/job-matches/send-due          ADMINISTRATOR
POST   /api/v1/notifications/retry-failed                  ADMINISTRATOR
PATCH  /api/v1/notifications/:uuid/sent                     ADMINISTRATOR

GET    /api/v1/integrations/status                                    ADMINISTRATOR, ANALYST
POST   /api/v1/media/cloudinary/signature                              YOUTH_USER, EMPLOYER, ADMINISTRATOR
POST   /api/v1/payments/transactions/:uuid/momo/request-to-pay          YOUTH_USER, EMPLOYER, ADMINISTRATOR
GET    /api/v1/payments/transactions/:uuid/momo/status                  YOUTH_USER, EMPLOYER, ADMINISTRATOR
POST   /api/v1/payments/transactions/:uuid/momo/disburse                 YOUTH_USER, EMPLOYER, ADMINISTRATOR
GET    /api/v1/payments/transactions/:uuid/momo/disbursement-status       YOUTH_USER, EMPLOYER, ADMINISTRATOR

GET    /api/v1/health                       PUBLIC
```
</details>

## Verification

Run before considering backend work done:

```bash
npx tsc --noEmit -p tsconfig.build.json
npm run build
node --test test
npx prisma validate
npm audit --audit-level=moderate
```

## Troubleshooting

- **"database does not exist"** — confirm it was created with the exact quoted name `"SB_DB"`.
- **Prisma can't connect** — check `DATABASE_URL` in `.env` matches whatever's actually running (Docker Postgres is on `5432` inside the compose network / `5433` from the host if you connect an external tool to it; a native install is whatever port you configured it on).
- **Port already in use** — change `PORT`/`IDENTITY_API_PORT`/etc. in `.env`, and update the matching `NEXT_PUBLIC_*_API_URL` in `frontend/.env.local`.
- **A payment/OAuth/upload endpoint returns "not configured"** — expected until you fill in the matching section of `.env`; nothing else in the app breaks because of it.
