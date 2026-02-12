-- Migration: Add emoji and is_public fields to existing prompts table
-- Run this ONLY if you already have the prompts table from a previous migration

-- Add new columns
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📝',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for public prompts
CREATE INDEX IF NOT EXISTS prompts_is_public_idx ON prompts(is_public) WHERE is_public = TRUE;

-- Add policy for public prompt viewing (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'prompts' 
    AND policyname = 'Anyone can view public prompts'
  ) THEN
    CREATE POLICY "Anyone can view public prompts"
      ON prompts
      FOR SELECT
      USING (is_public = TRUE);
  END IF;
END $$;
