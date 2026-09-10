-- Kid-chosen avatar: an emoji (+ background swatch) or a built character config.
-- `avatar_url` (onboarding photo) already exists and still takes precedence when
-- set — see lib/kid/avatar.ts resolveAvatar(). Kids change this from the profile
-- sheet via the app/kid/actions/avatar.ts server action (service-role: `children`
-- is not child-writable through RLS).

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS avatar_kind TEXT NOT NULL DEFAULT 'emoji';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_avatar_kind_check'
  ) THEN
    ALTER TABLE public.children
      ADD CONSTRAINT children_avatar_kind_check
      CHECK (avatar_kind IN ('emoji', 'character'));
  END IF;
END $$;

-- {emoji, bg} for kind='emoji'; {skin, hair, hairColor, shirt, accessory} for
-- kind='character'. Null = fall back to the legacy single `emoji` column.
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS avatar_config JSONB;
