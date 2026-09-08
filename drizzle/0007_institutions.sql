-- Institutions table for admin-managed faculties and schools
-- Apply via Supabase SQL editor

CREATE TABLE IF NOT EXISTS "institutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "type" text NOT NULL CHECK ("type" IN ('fakultet', 'skola')),
  "city" text NOT NULL DEFAULT '',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "institutions_select_all" ON "institutions"
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "institutions_insert_admin" ON "institutions"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "institutions_delete_admin" ON "institutions"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
