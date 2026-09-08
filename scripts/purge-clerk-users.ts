/**
 * Briše sve profile sa clerk_user_id iz baze + odgovarajuće Clerk naloge.
 * Pokretanje: npx tsx scripts/purge-clerk-users.ts
 */
import "./load-env";
import { createClerkClient } from "@clerk/backend";
import { isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profiles } from "../src/server/db/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const clerkSecret = process.env.CLERK_SECRET_KEY;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }
  if (!clerkSecret) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  const clerk = createClerkClient({ secretKey: clerkSecret });

  const rows = await db
    .select({
      id: profiles.id,
      clerkUserId: profiles.clerkUserId,
    })
    .from(profiles)
    .where(isNotNull(profiles.clerkUserId));

  if (rows.length === 0) {
    console.log("Nema Clerk profila u bazi.");
    await client.end();
    return;
  }

  console.log(`Brisanje ${rows.length} Clerk profila...`);

  let clerkDeleted = 0;
  let clerkFailed = 0;

  for (const row of rows) {
    const clerkId = row.clerkUserId;
    if (!clerkId) {
      continue;
    }

    try {
      await clerk.users.deleteUser(clerkId);
      clerkDeleted += 1;
    } catch (error) {
      clerkFailed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Clerk delete preskočen (${clerkId.slice(0, 8)}…): ${message}`);
    }
  }

  const profileIds = rows.map((row) => row.id);
  await db.delete(profiles).where(isNotNull(profiles.clerkUserId));

  console.log(`Baza: obrisano ${profileIds.length} profila (cascade kartice, podešavanja, rezervacije).`);
  console.log(`Clerk: obrisano ${clerkDeleted}, preskočeno ${clerkFailed}.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
