# OAuth setup (Google i Apple)

eMenza koristi Supabase Auth za Google i Apple prijavu. Kod je spreman u aplikaciji; potrebno je podesiti provajdere u Supabase i eksternim konzolama.

## 1. Supabase

1. Otvorite [Supabase Dashboard](https://supabase.com/dashboard) → projekat → **Authentication** → **URL Configuration**.
2. Dodajte **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<vas-domen>/auth/callback`
3. U **Authentication** → **Providers** uključite Google i/ili Apple.

## 2. Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Kreirajte **OAuth client ID** (Web application).
3. Authorized redirect URI: kopirajte iz Supabase (Google provider → Callback URL).
4. Client ID i Client Secret unesite u Supabase → Google provider.

## 3. Apple

1. [Apple Developer](https://developer.apple.com/) → Identifiers → Services ID.
2. Konfigurišite Sign in with Apple i return URL iz Supabase.
3. Kreirajte key (.p8), unesite Team ID, Key ID, Services ID i secret u Supabase.

Apple setup je složeniji; za odbranu dovoljna je email + lozinka + verifikacija.

## 4. Tok u aplikaciji

- **Prijava / registracija:** `signInWithStudentOAuth()` → `/auth/callback`
- Novi OAuth korisnik bez profila → `/register?korak=2` (podaci kartice)
- Postojeći student → dashboard

## 5. Provera

1. Klik na Google/Apple na `/login` ili `/register`.
2. Nakon povratka proverite da li postoji red u `profiles` i `student_cards`.
