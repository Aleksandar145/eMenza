import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, isBackendEnabled } from "@/server/env";
import * as schema from "@/server/db/schema";

type DbBundle = {
  client: ReturnType<typeof postgres>;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDb = globalThis as unknown as {
  emenzaDb?: DbBundle | null;
};

export function getDb() {
  if (!isBackendEnabled()) {
    throw new Error("Backend is not configured. Set Supabase env variables.");
  }

  if (!globalForDb.emenzaDb) {
    const maxConnections = process.env.NODE_ENV === "production" ? 10 : 10;
    const client = postgres(getDatabaseUrl(), {
      prepare: false,
      max: maxConnections,
      idle_timeout: 20,
      max_lifetime: 60 * 5,
      connect_timeout: 10,
    });
    globalForDb.emenzaDb = {
      client,
      db: drizzle(client, { schema }),
    };
  }

  return globalForDb.emenzaDb.db;
}

export async function closeDb() {
  if (globalForDb.emenzaDb) {
    await globalForDb.emenzaDb.client.end();
    globalForDb.emenzaDb = null;
  }
}

export type Db = ReturnType<typeof getDb>;
