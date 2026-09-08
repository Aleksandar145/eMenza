# Clerk setup (Google OAuth za studente)

eMenza koristi **Clerk** za studentsku Google prijavu (bez Google Cloud kartice u development modu). **Staff** (referent, admin, kuhinja) i dalje koristi **Supabase Auth**.

## 1. Clerk Dashboard

1. Otvori [dashboard.clerk.com](https://dashboard.clerk.com) i kreiraj aplikaciju (npr. `eMenza`).
2. **Configure → SSO connections → Google → Add connection**.
3. **Ne uključuj** „Use custom credentials“ — u dev instanci Clerk koristi shared Google OAuth (**nema Google Cloud Console**).
4. **API keys** → kopiraj ključeve u `.env.local`.

## 2. Env varijable

Dodaj u `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/register?korak=2
```

Supabase env **ostaje** (baza + staff auth):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restartuj `npm run dev` posle izmene.

## 3. Migracija baze

Pokreni SQL iz `drizzle/0002_clerk_profiles.sql` u Supabase SQL Editor:

```sql
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "clerk_user_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_clerk_user_id_unique" ON "profiles" ("clerk_user_id");
```

## 4. Test tok

1. `/login` → klik **Google**
2. Prvi put → `/register?korak=2` (podaci kartice)
3. Posle registracije → dashboard
4. Staff prijava i dalje preko `/referent/login`, `/admin/login`, `/kuhinja/login`

## 5. Clerk CLI (opciono)

Ako CLI radi na tvom sistemu:

```bash
npm install -g clerk
clerk auth login
clerk init
clerk doctor
```

Na Windows-u CLI ponekad ne instalira binary — ručni setup iznad je dovoljan.

## Napomene

- Sa Clerk ključevima, email+lozinka prijava na `/login` je isključena (koristi Google ili Demo Marija).
- Za produkciju Clerk instance moraš podesiti sopstvene Google OAuth credentials u Clerk dashboardu.
