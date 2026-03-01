-- =============================================================================
-- onboarding-patch.sql
-- =============================================================================
-- Run this file in the Supabase SQL Editor AFTER schema-v3.sql has been applied.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT to remain idempotent.
-- =============================================================================


-- =============================================================================
-- SECTION 1: Add onboarding_step column to user_profiles
-- =============================================================================
-- Tracks how far the user has progressed through the onboarding wizard.
-- Step meanings:
--   0 = not started
--   1 = profile saved (display name entered)
--   2 = family created (family row inserted, parent added as member)
--   3 = child added (at least one child member inserted)
--   4 = invite sent or skipped
--   5 = categories configured
--   6 = complete

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0;


-- =============================================================================
-- SECTION 2: Create the "avatars" Storage bucket
-- =============================================================================
-- Public bucket so avatar images are readable without authentication.
-- Uploads are restricted to authenticated users via RLS policy below.
-- Max file size: 5 MB. Accepted types: JPEG, PNG, WebP, GIF.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 3: Storage RLS policies for the avatars bucket
-- =============================================================================
-- Policy 1: Authenticated users can upload avatars
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Avatar upload: auth users only',
  'avatars',
  'INSERT',
  '(auth.uid() IS NOT NULL)'
)
ON CONFLICT DO NOTHING;

-- Policy 2: Anyone (public) can read avatars
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Avatar read: public',
  'avatars',
  'SELECT',
  'true'
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- HOW TO USE UPLOADED AVATAR URLs
-- =============================================================================
-- After uploading a file to the "avatars" bucket, the public URL is:
--
--   {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/{path}
--
-- Example:
--   https://abcxyz.supabase.co/storage/v1/object/public/avatars/user-abc123/avatar.jpg
--
-- In TypeScript (using the browser client):
--   const { data } = supabase.storage
--     .from('avatars')
--     .getPublicUrl('user-abc123/avatar.jpg')
--   // data.publicUrl contains the full public URL
-- =============================================================================
