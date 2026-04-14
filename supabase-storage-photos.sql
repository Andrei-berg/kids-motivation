-- Phase 3.3: Photo sharing — run in Supabase SQL Editor

-- Create the family-photos storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'family-photos',
  'family-photos',
  false,
  5242880,  -- 5 MB max (compressed photos will be well under this)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated family members can upload photos to their family prefix
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'family members can upload photos'
  ) THEN
    CREATE POLICY "family members can upload photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'family-photos'
      AND storage.foldername(name)[1] = (
        SELECT family_id::text FROM family_members
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    );
  END IF;
END $$;

-- Policy: authenticated family members can read photos from their family prefix
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'family members can read photos'
  ) THEN
    CREATE POLICY "family members can read photos"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'family-photos'
      AND storage.foldername(name)[1] = (
        SELECT family_id::text FROM family_members
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    );
  END IF;
END $$;
