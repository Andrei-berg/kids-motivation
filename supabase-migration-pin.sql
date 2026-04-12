-- Migration: Add child_pin_hash column to family_members
-- Run in Supabase SQL Editor

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS child_pin_hash TEXT;

-- Index for PIN lookup (family_id + child_id combination used in /kid/login)
CREATE INDEX IF NOT EXISTS idx_family_members_child_id ON family_members(family_id, child_id);
