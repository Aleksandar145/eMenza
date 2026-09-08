CREATE TABLE IF NOT EXISTS notice_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notice_id, profile_id)
);

ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own read markers
CREATE POLICY "Users can mark notices as read" ON notice_reads
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Users can read their own entries; admin can read all
CREATE POLICY "Users can read own notice reads" ON notice_reads
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can read all notice reads" ON notice_reads
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
