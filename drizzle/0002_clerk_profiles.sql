ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "clerk_user_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_clerk_user_id_unique" ON "profiles" ("clerk_user_id");
