-- Migration: Shop Approval Flow
-- Phase 2.4 — freeze-then-approve purchase lifecycle
-- Run in Supabase SQL Editor

-- Add status and frozen_coins to reward_purchases
ALTER TABLE reward_purchases
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS frozen_coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_by TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- Existing rows are treated as 'approved' (backward compat).
-- New requests start as 'pending' (set by application code).

-- Add auto_approve to rewards (already referenced in wallet.repo.ts but may not exist in DB yet)
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN NOT NULL DEFAULT false;
