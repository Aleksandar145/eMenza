# eMenza — Student Canteen Management System

> A web platform for managing the full operation of a student canteen: meal ordering, card management, kitchen planning, warehouse, and administration — all in one place.

**eMenza** is a full-stack application built with **Next.js (App Router) + TypeScript** that covers several roles: students, referents, kitchen staff, and administrators.

---

## Features

### 🎓 Student Portal
- Meal ordering (breakfast / lunch / dinner) by day and meal type
- Reservations with QR-code pickup
- Personal smart card with balance and top-ups
- Personal settings (SR/EN language, fasting, religion, diet)
- Notifications and feedback book

### 🪪 Referent
- Issuing, renewing, and cancelling student cards
- Card history, activations, and requests
- Tracking account status

### 👨‍🍳 Kitchen
- Menu planning by day and meal, dish catalog
- Order overview and preparation quantities
- Supplies and warehouse (recipes, stock levels, token return)

### 🛡️ Admin Panel
- Managing users, employees, and roles
- Finances and reports
- System monitoring, activity, and dish analytics
- Institutions/faculties, settings, announcements

### 🔐 Auth & Security
- **Students:** sign-in via **Clerk** (Google OAuth)
- **Staff** (referent / admin / kitchen): sign-in via **Supabase Auth** (email + password)
- Row Level Security (Supabase RLS) + server-side validation (Zod)
- Protected server routes in `src/app/api`, sign-in/session cookie settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend/Full-stack | **Next.js 16 (App Router)**, React 19, TypeScript |
| Styling | **Tailwind CSS 4**, lucide-react icons |
| Database | **Supabase (PostgreSQL)** + **Drizzle ORM** + migrations |
| Auth | **Clerk** (students, OAuth) · **Supabase Auth** (staff) |
| Validation | **Zod** |
| QR codes | react-qr-code / @yudiel/react-qr-scanner |
| Charts | Recharts |
| Rich text | Tiptap |

---

## Architecture

```
src/
├── app/                # App Router routes + API route handlers
│   ├── api/            # REST API (auth, cards, dishes, menus, admin…)
│   ├── admin/          # Admin panel (employees, finances, monitoring…)
│   ├── referent/       # Referent panel
│   ├── kuhinja/        # Kitchen panel
│   ├── register/       # Student registration
│   └── ...
├── components/         # UI + domain components
├── contexts/           # React contexts (session, card, reservations…)
├── lib/                # Business logic, API clients, utilities
│   ├── backend/        # Typed API calls (REST to api/)
│   ├── stores/         # Local cache and state
│   └── ...
├── i18n/               # Bilingual support (SR/EN)
└── middleware.ts       # Auth guard for protected routes
```

- **API:** client → `apiFetch` (typed client) → `src/app/api` → Supabase. The server checks the session and roles before reading/writing the database.
- **Auth:** protected routes are checked in `middleware.ts` and server-side in every route handler.
- **DB:** Drizzle schema + SQL migrations in `drizzle/` and `supabase/migrations/`.

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Aleksandar145/eMenza.git
cd eMenza
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project (Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, **never commit it**
- `DATABASE_URL` — Supabase connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from the Clerk dashboard

### 3. Prepare the database

```bash
npm run db:push       # or run drizzle/0000_initial.sql in the SQL Editor
npm run db:seed       # demo data + staff accounts
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (after `db:seed`)

| Role | URL | Email | Password |
|---|---|---|---|
| Admin | `/admin/login` | `admin@emenza.rs` | `admin123` |
| Referent | `/referent/login` | `referent@emenza.rs` | `referent123` |
| Kitchen | `/kuhinja/login` | `kuhinja@emenza.rs` | `kuhinja123` |

Students register through `/register` (Google OAuth / demo account), and the referent activates their card later.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (booking window / reservation status) |
| `npm run db:generate` | Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Demo data |

---

## Deploy

1. Push the repo to GitHub.
2. Import it in **Vercel** — add the same environment variables.
3. Supabase stays as managed Postgres + Auth (no extra infrastructure).

---

## License

© eMenza. For private/educational use — contact the author for details.