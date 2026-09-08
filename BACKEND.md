# eMenza — Backend setup (Faza 2)

## 1. Supabase projekat

1. Kreiraj projekat na [supabase.com](https://supabase.com)
2. U **Project Settings → API** kopiraj:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (nikad u git!)
3. U **Project Settings → Database** kopiruj **Connection string (URI)** → `DATABASE_URL`  
   (koristi *Transaction* pooler za Drizzle migracije)

## 2. Lokalni env

Kopiraj `.env.example` u `.env.local` i popuni vrednosti:

```bash
cp .env.example .env.local
```

## 3. Šema baze

Opcija A — Drizzle push:

```bash
npm run db:push
```

Opcija B — SQL u Supabase SQL Editor:

Pokreni sadržaj fajla `drizzle/0000_initial.sql`.

## 4. Seed demo podataka

```bash
npm run db:seed
```

Kreira staff naloge (admin / referent / kuhinja), katalog jela, jelovnik i demo studente.

## 5. Pokretanje

```bash
npm run dev
```

Kad su env varijable postavljene, aplikacija automatski koristi backend umesto localStorage mock-a.

## Demo nalozi (posle seed-a)

| Uloga | Email | Lozinka |
|-------|-------|---------|
| Admin | admin@emenza.rs | admin123 |
| Referent | referent@emenza.rs | referent123 |
| Kuhinja | kuhinja@emenza.rs | kuhinja123 |

Studenti: registruj se kroz `/register`, pa referent aktivira karticu.

## Deploy (Vercel + Supabase)

1. Push repo na GitHub
2. Import u Vercel — dodaj iste env varijable
3. Supabase ostaje managed Postgres + Auth

## API pregled

| Endpoint | Opis |
|----------|------|
| `POST /api/auth/register` | Registracija studenta |
| `POST /api/auth/session` | Student login |
| `DELETE /api/auth/session` | Logout |
| `POST /api/auth/staff/login` | Staff login |
| `GET /api/cards` | Referent: sve kartice |
| `POST /api/cards/[id]` | Referent akcije |
| `GET /api/dishes` | Katalog jela |
| `GET/POST /api/menus` | Jelovnik |
| `GET/POST /api/reservations` | Rezervacije + pickup QR |
| `GET/PATCH /api/admin` | Admin podešavanja |
