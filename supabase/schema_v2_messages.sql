-- Run this in Supabase SQL Editor to add conversation threading support

CREATE TABLE IF NOT EXISTS messages (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_question ON messages (question_id, created_at);

-- RLS: only owner of the parent question can see messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_owner_only"
  ON messages FOR ALL
  USING (
    question_id IN (
      SELECT id FROM questions
      WHERE user_id IN (
        SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
      )
    )
  );
