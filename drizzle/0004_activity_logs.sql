CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "action_type" text NOT NULL,
  "description" text NOT NULL,
  "ip_address" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "activity_logs_type_created_idx"
  ON "activity_logs" ("action_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_logs_user_idx"
  ON "activity_logs" ("user_id");

ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON "activity_logs";
CREATE POLICY "activity_logs_insert_authenticated"
  ON "activity_logs"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "activity_logs_select_admin" ON "activity_logs";
CREATE POLICY "activity_logs_select_admin"
  ON "activity_logs"
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE EXECUTE ON FUNCTION public.is_admin FROM anon;
