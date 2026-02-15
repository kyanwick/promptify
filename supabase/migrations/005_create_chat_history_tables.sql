-- Create chat history tables with cost-effective retention policies
-- Migration: 005_create_chat_history_tables

-- =====================================================
-- CHAT SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  model TEXT NOT NULL,
  message_count INTEGER DEFAULT 0 CHECK (message_count >= 0 AND message_count <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (length(content) <= 10000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(session_id, created_at ASC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages (based on session ownership)
CREATE POLICY "Users can view messages from their own sessions"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their own sessions"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their own sessions"
  ON chat_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to set user_id automatically on chat_sessions insert
CREATE TRIGGER set_chat_sessions_user_id
  BEFORE INSERT ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Trigger to update updated_at automatically on chat_sessions update
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to increment message count on message insert
CREATE OR REPLACE FUNCTION increment_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment message count
CREATE TRIGGER increment_message_count
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_session_message_count();

-- Function to decrement message count on message delete
CREATE OR REPLACE FUNCTION decrement_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET message_count = GREATEST(0, message_count - 1),
      updated_at = NOW()
  WHERE id = OLD.session_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement message count
CREATE TRIGGER decrement_message_count
  AFTER DELETE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION decrement_session_message_count();

-- =====================================================
-- CLEANUP FUNCTIONS (Cost Management)
-- =====================================================

-- Function to delete chat sessions older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_chat_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_sessions
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce 50 session limit per user
CREATE OR REPLACE FUNCTION enforce_session_limit_for_user(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_sessions
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY updated_at DESC
      ) as row_num
      FROM chat_sessions
      WHERE user_id = target_user_id
    ) t
    WHERE row_num > 50
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce session limit for all users
CREATE OR REPLACE FUNCTION enforce_session_limit_all_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_sessions
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY updated_at DESC
      ) as row_num
      FROM chat_sessions
    ) t
    WHERE row_num > 50
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Combined cleanup function (runs both cleanup operations)
CREATE OR REPLACE FUNCTION cleanup_chat_history()
RETURNS TABLE(old_sessions_deleted INTEGER, excess_sessions_deleted INTEGER) AS $$
DECLARE
  old_deleted INTEGER;
  excess_deleted INTEGER;
BEGIN
  -- Delete old sessions
  SELECT cleanup_old_chat_sessions() INTO old_deleted;

  -- Enforce session limits
  SELECT enforce_session_limit_all_users() INTO excess_deleted;

  RETURN QUERY SELECT old_deleted, excess_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get session count for a user
CREATE OR REPLACE FUNCTION get_user_session_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM chat_sessions
  WHERE user_id = target_user_id;

  RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a session title from first user message
CREATE OR REPLACE FUNCTION generate_session_title(first_message TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Take first 97 chars and add ellipsis if longer
  IF length(first_message) > 97 THEN
    RETURN substring(first_message, 1, 97) || '...';
  ELSE
    RETURN first_message;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE chat_sessions IS 'Stores chat sessions with 30-day retention and 50 session limit per user';
COMMENT ON TABLE chat_messages IS 'Stores chat messages with 200 message limit per session and 10k char limit per message';
COMMENT ON COLUMN chat_sessions.message_count IS 'Cached count of messages in session, automatically maintained by triggers';
COMMENT ON FUNCTION cleanup_old_chat_sessions() IS 'Deletes chat sessions older than 30 days';
COMMENT ON FUNCTION enforce_session_limit_for_user(UUID) IS 'Enforces 50 session limit for a specific user';
COMMENT ON FUNCTION enforce_session_limit_all_users() IS 'Enforces 50 session limit for all users';
COMMENT ON FUNCTION cleanup_chat_history() IS 'Runs both cleanup operations: old sessions and excess sessions';
