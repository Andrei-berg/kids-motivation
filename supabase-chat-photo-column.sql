-- Phase 3.3: Photo messages — run in Supabase SQL Editor after supabase-storage-photos.sql
-- Phase 3.3: Add photo_url column to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS photo_url TEXT NULL;
