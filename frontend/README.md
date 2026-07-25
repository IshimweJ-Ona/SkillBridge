# SkillBridge Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 web app for the SkillBridge employability platform — dark "SkillBridge EdTech" theme, four role-specific experiences (Youth, Employer, Analyst, Administrator).

This README is for **local development**. For deployment (Docker image, build-time env vars, database hosting), see the root [`README.md`](../README.md).

## Requirements

- Node.js 20+
- npm

## 1. Environment

```bash
cp .env.example .env.local
```

The one setting that matters is `NEXT_PUBLIC_USE_MOCK_API`:

- **`true` (default)** — runs entirely on in-browser mock data persisted to `localStorage`. No backend, no database, no other terminal needed. Every flow (signup, login, profile editing, job applications, marketplace, employer/analyst/admin dashboards) works end-to-end against fixture data seeded on first load.
- **`false`** — talks to the real backend. All 5 backend services must be running first — see [`../backend/README.md`](../backend/README.md), or from the project root: `docker compose --profile local-db up -d`.

## 2. Install & Run

```bash
npm install
npm run dev
```

```text
http://localhost:3000
```

## Demo Accounts

**Mock mode** (`NEXT_PUBLIC_USE_MOCK_API=true`) — all passwords `SkillBridge@123`:

| Role | Identifier |
|---|---|
| Youth | `jonathan.ishimwe@example.com` |
| Employer | `hr@techsolutions.rw` |
| Analyst | `analyst@skillbridge.rw` |
| Administrator | `admin@skillbridge.rw` |

**Live backend mode** (`NEXT_PUBLIC_USE_MOCK_API=false`, seeded via `npm run prisma:seed` in `backend/`) — different accounts, same password `SkillBridge@123`:

| Role | Identifier |
|---|---|
| Youth | `aline.youth@skillbridge.rw` |
| Employer | `eric.employer@skillbridge.rw` |
| Analyst | `analyst@skillbridge.rw` |
| Administrator | `admin@skillbridge.rw` |

Analyst and Administrator accounts are invite-only in the real product (no self-service signup) — sign in directly with the accounts above rather than looking for a sign-up option for those roles.

## What's Where

```text
app/(auth)/         welcome, sign-in, sign-up, OTP verify, forgot/reset password
app/(youth)/         dashboard, jobs, applications, profile, skills & badges,
                     learning hub, marketplace, wallet, messages (demo-only)
app/employer/        dashboard, company, job postings, applicants, messages (demo-only)
app/analyst/         dashboard, reports, feedback analysis, audit log
app/admin/           dashboard, users, companies, reports, audit log, settings
app/oauth-callback/  Google OAuth redirect landing page

lib/api/             real/ and mock/ implementations behind one interface per
                     domain, switched by NEXT_PUBLIC_USE_MOCK_API (lib/api/index.ts)
lib/i18n/             English/French dictionary-based translation (see below)
components/ui/        shared primitives (Button, Card, Input, Toast, FileUpload, ...)
components/layout/     Sidebar, TopNav, HelpButton, NotificationBell, LanguageSwitcher
components/onboarding/ role-specific first-login onboarding overlay
```

"Messages" screens are intentionally static demo content — no messaging backend module exists yet (see `SkillBridge_SRS_Update.md`).

## Language

A language switcher (top nav) toggles English/French app-wide via `lib/i18n` — a small React Context + `localStorage`, not routing-based (`next-intl`-style `[locale]` segments), so switching languages never reloads the page or loses in-progress form state. Kinyarwanda is specified in the SRS but not yet built (see `SkillBridge_SRS_Update.md`).

## Available Scripts

```bash
npm run dev         # start dev server
npm run build        # production build
npm run start        # run a production build (after npm run build)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
```

## Troubleshooting

- **Blank data / "Could not connect"** in live mode — confirm all 5 backend services are actually running (`curl http://localhost:3101/api/v1/health`) and that `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.local`, then restart `npm run dev` (env vars are only read at server start).
- **Switched `NEXT_PUBLIC_*` values and nothing changed** — restart the dev server; Next.js only reads `.env.local` on startup, not on hot-reload.
- **Mock data looks wrong / stuck** — mock mode persists its fixture "database" to `localStorage`; clear it via your browser devtools (Application → Local Storage) to reset to the original seed data.
