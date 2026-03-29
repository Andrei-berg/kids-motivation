-- ============================================================================
-- Migration: Flexible sections (dates) + Extra Activities catalog
-- Run in Supabase SQL Editor
-- ============================================================================

-- ─── 1. Alter sections table ─────────────────────────────────────────────────
-- Add start/end date range and optional schedule days

ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS schedule_days TEXT[] DEFAULT '{}';

-- ─── 2. Extra Activities catalog ─────────────────────────────────────────────
-- Parent-configured list of activities available to each child on vacation/weekend

CREATE TABLE IF NOT EXISTS extra_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id TEXT NOT NULL,
  family_id TEXT,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📖',
  -- Which day types this activity appears on: 'vacation', 'weekend' (or both)
  day_types TEXT[] NOT NULL DEFAULT '{"vacation","weekend"}',
  coins INT NOT NULL DEFAULT 3,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extra_activities_child ON extra_activities(child_id);
CREATE INDEX IF NOT EXISTS idx_extra_activities_child_active ON extra_activities(child_id, is_active);

-- ─── 3. Activity logs ─────────────────────────────────────────────────────────
-- Daily tracking of which activities were completed

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id TEXT NOT NULL,
  date DATE NOT NULL,
  activity_id UUID NOT NULL REFERENCES extra_activities(id) ON DELETE CASCADE,
  done BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(child_id, date, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_child_date ON activity_logs(child_id, date);
