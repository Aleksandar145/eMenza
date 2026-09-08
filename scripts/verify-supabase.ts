import "./load-env";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

const checks: { name: string; ok: boolean; detail: string }[] = [];

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

add("NEXT_PUBLIC_SUPABASE_URL", Boolean(url?.startsWith("https://")), url ? "Postavljen" : "Nedostaje");
add("NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(anon && anon.startsWith("eyJ")), anon ? "Postavljen" : "Nedostaje");
add("SUPABASE_SERVICE_ROLE_KEY", Boolean(service && service.startsWith("eyJ")), service ? "Postavljen" : "Nedostaje");
add("DATABASE_URL", Boolean(databaseUrl?.startsWith("postgresql://")), databaseUrl ? "Postavljen" : "NEDOSTAJE — obavezan za bazu");

if (url && anon) {
  const refFromUrl = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  try {
    const payload = JSON.parse(Buffer.from(anon.split(".")[1]!, "base64url").toString());
    const refFromJwt = payload.ref as string | undefined;
    add(
      "URL ↔ anon key ref",
      refFromUrl === refFromJwt,
      refFromUrl === refFromJwt
        ? `Ref se poklapa (${refFromUrl})`
        : `URL ref=${refFromUrl}, JWT ref=${refFromJwt}`,
    );
  } catch {
    add("URL ↔ anon key ref", false, "Ne mogu da parsiram JWT");
  }
}

async function main() {
  if (url && service) {
    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    add(
      "Supabase Auth (service role)",
      !error,
      error ? error.message : "Konekcija OK",
    );
  }

  if (databaseUrl) {
    try {
      const sql = postgres(databaseUrl, { prepare: false, max: 1, connect_timeout: 10 });
      const rows = await sql`select current_database() as db, version() as version`;
      await sql.end();
      add("Postgres (DATABASE_URL)", true, `Baza: ${rows[0]?.db}`);
    } catch (error) {
      add(
        "Postgres (DATABASE_URL)",
        false,
        error instanceof Error ? error.message : "Konekcija nije uspela",
      );
    }
  }

  console.log("\neMenza — Supabase provera\n");
  for (const check of checks) {
    console.log(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(failed.length === 0 ? "\nSve provere prošle.\n" : `\n${failed.length} problem(a) — vidi iznad.\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
