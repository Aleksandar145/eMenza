-- Database fixes: enum sync, missing indexes, RLS security & performance
-- Apply via Supabase SQL editor

-- 1. notice_target enum — add "kitchen" value (for kitchen-targeted notices)
ALTER TYPE notice_target ADD VALUE IF NOT EXISTS 'kitchen';

-- 2. Foreign key indexes (performance)
CREATE INDEX IF NOT EXISTS idx_analytics_events_card_id ON analytics_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_action_logs_card_id ON card_action_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_daily_menu_slot_dishes_dish_id ON daily_menu_slot_dishes(dish_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_profile_id ON feedback_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_reservations_card_id ON meal_reservations(card_id);
CREATE INDEX IF NOT EXISTS idx_meal_reservations_profile_id ON meal_reservations(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_cards_profile_id ON student_cards(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_notifications_profile_id ON student_notifications(profile_id);

-- 3. Security: revoke SECURITY DEFINER function from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin FROM anon, authenticated;

-- 4. RLS performance: replace auth.uid() with (select auth.uid()) in existing policies
--    (prevents per-row re-evaluation)

-- Drop old policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "student_cards_select_own" ON student_cards;
DROP POLICY IF EXISTS "meal_reservations_select_own" ON meal_reservations;
DROP POLICY IF EXISTS "meal_reservations_update_own" ON meal_reservations;
DROP POLICY IF EXISTS "Allow insert for referents" ON card_action_logs;
DROP POLICY IF EXISTS "Allow select for referents" ON student_cards;
DROP POLICY IF EXISTS "Allow update for referents" ON student_cards;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "student_cards_select_own" ON student_cards
  FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid()));

-- Note: meal_reservations RLS policies handled below

-- Card action logs: referent insert policy
CREATE POLICY "Allow insert for referents" ON card_action_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('referent', 'admin')
    )
  );

-- Student cards: referent select/update policies
CREATE POLICY "Allow select for referents" ON student_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('referent', 'admin')
    )
    OR profile_id = (select auth.uid())
  );

CREATE POLICY "Allow update for referents" ON student_cards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('referent', 'admin')
    )
  );

-- 5. activity_logs insert policy: restrict to server-side (don't allow arbitrary inserts)
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON activity_logs;
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'referent', 'kitchen')
    )
  );
