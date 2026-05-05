-- Phase 3.3: Task proof — add room_proof_url to days table
-- Run in Supabase SQL Editor after supabase-storage-photos.sql

ALTER TABLE days
  ADD COLUMN IF NOT EXISTS room_proof_url TEXT NULL;
