# eMenza — Upravljanje studentskom menzom

> Web platforma za upravljanje celokupnim radom studentske menze: naručivanje obroka, izdavanje kartica, bazen kuhinje, magacin i administracija — sve na jednom mestu.

**eMenza** je full-stack aplikacija izgrađena sa **Next.js (App Router) + TypeScript**, koja pokriva nekoliko uloga: studente, referente, kuhinju i administratore.

---

## Funkcionalnosti

### 👨‍🎓 Studentski portal
- Naručivanje obroka (doručak / ručak / večera) po danima i obrocima
- Rezervacije sa QR preuzimanjem
- Personalna kartica i dopune
- Lična podešavanja (jezik SR/EN, post, religija, ishrana)
- Obaveštenja i knjiga utisaka

### 🪪 Referent
- Izdavanje, produžavanje i poništavanje studentskih kartica
- Istorija kartica, aktivacije i zahtevi
- Praćenje stanja naloga

### 👨‍🍳 Kuhinja
- Jelovnik po danima i obrocima, katalog jela
- Pregled narudžbina i priprema
- Nabavka i magacin (recepti, stanje zalihe, povraćaj zetona)

### 🛡️ Admin panel
- Upravljanje korisnicima, zaposlenima i ulogama
- Finansije i izveštaji
- Monitoring sistema, aktivnosti i analitika jela
- Institucije/fakulteti, podešavanja, obaveštenja

### 🔐 Auth & sigurnost
- **Studenti:** prijava preko **Clerk** (Google OAuth)
- **Staff** (referent / admin / kuhinja): prijava preko **Supabase Auth** (email + lozinka)
- Row Level Security (Supabase RLS) + server-side validacija (Zod)
- Opsecene server rute u `src/app/api`, sign-in/session cookie postavke

---

## Tehnologije

| Sloj | Tehnologija |
|---|---|
| Frontend/Fullstack | **Next.js 16 (App Router)**, React 19, TypeScript |
| Styling | **Tailwind CSS 4**, lucide-react ikonice |
| Baza podataka | **Supabase (PostgreSQL)** + **Drizzle ORM** + migrations |
| Auth | **Clerk** (studenti, OAuth) · **Supabase Auth** (staff) |
| Validacija | **Zod** |
| QR kodovi | react-qr-code / @yudiel/react-qr-scanner |
| Grafikoni | Recharts |
| UI editor | Tiptap |

---

## Arhitektura

```
src/
├── app/                # App Router rute + API route handlers
│   ├── api/            # REST API (auth, cards, dishes, menus, admin…)
│   ├── admin/          # Admin panel (zaposleni, finansije, monitoring…)
│   ├── referent/       # Referentski panel
│   ├── kuhinja/        # Kuhinjski panel
│   ├── register/       # Studentska registracija
│   └── ...
├── components/         # UI + poslovne komponente po domenima
├── contexts/           # React contexti (session, kartica, rezervacije…)
├── lib/                # Bussiness logika, API klijenti, utilities
│   ├── backend/        # Tipizovani API pozivi (REST to api/)
│   ├── stores/         # Lokalni keš i stanje
│   └── ...
├── i18n/               # Dvojezičnost (SR/EN)
└── middleware.ts       # Auth guard za zaštićene rute
```

- **API:** client → `apiFetch` (tipizovani klijent) → `src/app/api` → Supabase. Server proverava sesiju i uloge, pa onda čita/pisuje bazu.
- **Auth:** zaštićene rute se proveravaju u `middleware.ts` + na server strani svakog route handler-a.
- **DB:** Drizzle schema + SQL migracije u `drizzle/` i `supabase/migrations/`.

---

## Kako da pokreneš

### 1. Kloniraj i instaliraj

```bash
git clone <repo-url> eMenza
cd eMenza
npm install
```

### 2. Postavi env varijable

```bash
cp .env.example .env.local
```

Popuni u `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — iz Supabase projekta (Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, **nikad se ne komituje**
- `DATABASE_URL` — Supabase connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — iz Clerk dashboarda

### 3. Pripremi bazu

```bash
npm run db:push       # ili pokreni drizzle/0000_initial.sql u SQL Editor-u
npm run db:seed       # demo podaci + staff nalozi
```

### 4. Pokreni dev server

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000).

### Demo nalozi (posle `db:seed`)

| Uloga | URL | Email | Lozinka |
|---|---|---|---|
| Admin | `/admin/login` | `admin@emenza.rs` | `admin123` |
| Referent | `/referent/login` | `referent@emenza.rs` | `referent123` |
| Kuhinja | `/kuhinja/login` | `kuhinja@emenza.rs` | `kuhinja123` |

Studenti se registruju kroz `/register` (Google OAuth / demo nalog), a referent ih kasnije aktivira.

---

## Script-ovi

| Komanda | Opis |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Produkcijski build |
| `npm run lint` | ESLint |
| `npm run test` | Unit testovi (booking window / reservation status) |
| `npm run db:generate` | Drizzle migracije |
| `npm run db:push` | Push šeme u bazu |
| `npm run db:seed` | Demo podaci |

---

## Deploy

1. Push repo na GitHub.
2. Import u **Vercel** — dodaj iste env varijable.
3. Supabase ostaje managed Postgres + Auth (bez dodatne infrastrukture).

---

## Licenca

© eMenza. Za privatnu/edukativnu upotrebu — kontaktiraj autora za detalje.