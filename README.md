# MedHome — Home Medicine Tracker

A private, single-owner web app for keeping track of the medicines you have at
home: what you own, how much is left, when it expires, and what you are
currently taking.

MedHome is an **inventory and tracking tool only**. It does not give medical
advice, and it never suggests doses, medicines or treatment lengths — every
treatment is entered by you.

---

## What it does

- **Medicines** — name, active ingredient, strength, form (tablet, capsule,
  syrup, cream, spray, drops, other) and free-form notes.
- **Packages / batches** — a medicine can have several physical packages, each
  with its own quantity, unit, expiration date and date added. Two boxes of
  Ibuprofen 400 mg with different expiry dates stay separate but belong to the
  same medicine.
- **Expiration tracking** — every package is bucketed as expired, expiring
  within 30 days, within 90 days, or not close to expiry. Expired packages stay
  visible until you remove them.
- **Treatments** — dose quantity, doses per day, start and optional end date.
  MedHome calculates daily consumption, available quantity, estimated days
  remaining, the expected run-out date, and whether stock is enough to finish a
  course that has an end date.
- **Take dose** — one tap records the dose, deducts it from the
  **first-expiring non-expired package**, and recalculates the projections.
- **History** — an append-only log of every inventory change (doses, stock
  added, discards, corrections, packages added and removed) with optional
  reasons.
- **Dashboard** — active treatments with Take dose, running low, expiring soon,
  expired, and the headline totals.

The interface is mobile-first: large touch targets, a bottom tab bar on phones,
bottom-sheet forms, quantity presets and quick expiry shortcuts.

---

## Technology

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) with React 19 and TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL — Neon, provisioned through the Vercel Marketplace |
| ORM / migrations | Drizzle ORM + drizzle-kit (SQL migrations in `drizzle/`) |
| Auth | Owner password (bcrypt hash) → signed JWT in an HTTP-only cookie (`jose`) |
| Validation | Zod, server-side on every write |
| Tests | Vitest (business logic) |
| Hosting | Vercel, deployed from GitHub |

### Project layout

```
drizzle/                 Generated SQL migrations
scripts/
  migrate.ts             Applies migrations (local or production)
  hash-password.ts       Generates the OWNER_PASSWORD_HASH value
src/
  app/
    (app)/               Authenticated pages: dashboard, medicines, treatments,
                         expiring, history. The layout enforces the session.
    api/                 Route handlers; every private one calls requireApiSession()
    login/               Public login screen
  components/            Reusable UI (forms, sheets, cards, nav, primitives)
  db/                    Drizzle schema and the lazily-created connection
  lib/                   Pure business logic, auth, validation, shared types
  server/                Data access used by pages and route handlers
  middleware.ts          Blocks unauthenticated page and API requests
tests/                   Vitest suites for the business logic
```

Server-only code (`src/db`, `src/server`, `src/lib/session.ts`) imports
`server-only`, so it can never end up in a client bundle.

---

## Running it locally

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (a free Neon project works well; a local Postgres is
  fine too)

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (server-side only) |
| `SESSION_SECRET` | Random string used to sign the session cookie |
| `OWNER_PASSWORD_HASH` | bcrypt hash of your password — never the password itself |
| `SESSION_TTL_DAYS` | Optional, session lifetime in days (default 30) |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Generate the password hash:

```bash
npm run hash-password -- "your-password-here"
```

Paste the printed `OWNER_PASSWORD_HASH=...` line into `.env.local`. Quote the
value in shells, because bcrypt hashes contain `$`.

`.env.local` is git-ignored. Never commit real secrets.

### 3. Database setup and migrations

```bash
npm run db:migrate
```

This applies everything in `drizzle/` to the database in `DATABASE_URL`.

After changing `src/db/schema.ts`, generate a new migration and apply it:

```bash
npm run db:generate -- --name=describe_your_change
npm run db:migrate
```

Migrations are plain SQL files committed to the repository, and drizzle-kit
tracks which ones have run in a `__drizzle_migrations` table.

### 4. Develop

```bash
npm run dev          # http://localhost:3000
```

### 5. Tests

```bash
npm test             # one run
npm run test:watch   # watch mode
```

The suites cover dose consumption, first-expiring-batch selection, consumption
across multiple batches, attempting to take more than is available, expiration
categorisation, daily treatment consumption, days-remaining and run-out dates,
and treatment sufficiency against an end date.

### 6. Production build

```bash
npm run typecheck
npm run build
npm start
```

---

## Deployment

The repository is the source of truth. The workflow is:

```
local commit → push to GitHub (main) → Vercel build → production deployment
```

Vercel is connected to the GitHub repository, with `main` as the production
branch, so every push to `main` produces a new production deployment and
branches get preview deployments.

Production configuration lives in Vercel's environment variables:

- `DATABASE_URL` — injected by the Neon Marketplace integration
- `SESSION_SECRET`
- `OWNER_PASSWORD_HASH`

Production migrations are applied from a machine that has the production
connection string:

```bash
DATABASE_URL="<production connection string>" npm run db:migrate
```

### Changing the owner password

1. `npm run hash-password -- "new password"`
2. Replace `OWNER_PASSWORD_HASH` in the Vercel project settings (Production,
   Preview and Development).
3. Redeploy so the new value is picked up (an empty commit is enough).

Existing session cookies stay valid until they expire. To invalidate them
immediately, rotate `SESSION_SECRET` at the same time.

---

## Security notes

- The password never reaches the browser; only a bcrypt hash is stored, and only
  as a server-side environment variable — never in the database or in git.
- Sessions are HS256 JWTs in an HTTP-only, `SameSite=Lax`, `Secure` (in
  production) cookie.
- `src/middleware.ts` rejects unauthenticated requests to every page and API
  route except the login endpoints; in addition, each private route handler
  calls `requireApiSession()` and the authenticated layout calls
  `requirePageSession()`. Hiding UI is never the only protection.
- All writes are validated with Zod before touching the database.
- Login attempts are rate-limited per IP within a rolling window.
- Database credentials are only ever read on the server.

---

## Known limitations

- Single owner by design: no registration, no multiple users, no roles.
- The login rate limit is per serverless instance and resets on redeploy; it
  slows down guessing rather than providing a hard global limit.
- Dates are calendar dates without timezone handling, which suits a personal
  cabinet but means "today" follows the server's timezone (UTC on Vercel).
- No push notifications or reminders for expiring medicines.
