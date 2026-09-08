-- Run this in Supabase SQL Editor or via supabase CLI
CREATE TABLE IF NOT EXISTS "profile_change_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "student_name" text NOT NULL,
  "card_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz,
  "referent_name" text
);

ALTER TABLE "profile_change_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_change_requests_insert_own" ON "profile_change_requests"
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "profile_change_requests_select_referent" ON "profile_change_requests"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid() AND role IN ('referent', 'admin')
    )
  );

CREATE POLICY "profile_change_requests_update_referent" ON "profile_change_requests"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid() AND role IN ('referent', 'admin')
    )
  );
