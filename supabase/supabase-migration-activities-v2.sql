-- ============================================================================
-- Migration: extra_activities + activity_logs — tracking fields
-- Run in Supabase SQL Editor
-- ============================================================================

ALTER TABLE extra_activities
  ADD COLUMN IF NOT EXISTS category      TEXT    NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS tracking_type TEXT    NOT NULL DEFAULT 'checkbox',
  ADD COLUMN IF NOT EXISTS days_of_week  INT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quantity_goal INT,
  ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS quantity_done    INT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS rating           INT,
  ADD COLUMN IF NOT EXISTS bookmark_page    INT;
