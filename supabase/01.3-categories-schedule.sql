-- Phase 1.3: categories + schedule migration. Run in Supabase SQL Editor.

-- ============================================================
-- TABLE 1: categories
-- Family-scoped activity categories (Учёба, Дом, Спорт, Распорядок, custom)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📋',
  color       TEXT,
  type        TEXT NOT NULL CHECK (type IN ('study','home','sport','routine','custom')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categories_family_id_idx ON public.categories(family_id);

-- ============================================================
-- TABLE 2: tasks
-- Tasks within a category; optionally assigned to one child (NULL = all children)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  child_member_id   UUID REFERENCES public.family_members(id) ON DELETE CASCADE,  -- NULL = all children
  title             TEXT NOT NULL,
  description       TEXT,
  coins_reward      INT NOT NULL DEFAULT 0,
  coins_penalty     INT NOT NULL DEFAULT 0,
  is_required       BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  reminder_time     TIME,                -- e.g. '07:30:00'; NULL = no reminder
  notification_text TEXT,               -- custom push notification text; NULL = use default template
  monthly_cap       INT,                 -- NULL = no cap; grades tasks always NULL
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_family_id_idx ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS tasks_category_id_idx ON public.tasks(category_id);

-- ============================================================
-- RLS: categories
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_family_isolation" ON public.categories
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- RLS: tasks
-- ============================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_family_isolation" ON public.tasks
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- TABLE 3: schedule_items
-- Unified weekly schedule per child: lessons, sections, routine slots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedule_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('lesson','section','routine')),
  title           TEXT NOT NULL,
  day_of_week     INT[] NOT NULL,   -- 1=Mon, 2=Tue, ..., 7=Sun
  start_time      TIME,
  end_time        TIME,
  location        TEXT,             -- address for sections
  reminder_offset INT NOT NULL DEFAULT 15,  -- minutes before start_time
  has_reminder    BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_items_family_id_idx ON public.schedule_items(family_id);
CREATE INDEX IF NOT EXISTS schedule_items_child_member_id_idx ON public.schedule_items(child_member_id);

-- ============================================================
-- TABLE 4: push_subscriptions
-- Browser PushSubscription JSON per family member, one row per device
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, (subscription->>'endpoint'))
);

CREATE INDEX IF NOT EXISTS push_subscriptions_member_id_idx ON public.push_subscriptions(member_id);

-- ============================================================
-- RLS: schedule_items
-- ============================================================

ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_items_family_isolation" ON public.schedule_items
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- RLS: push_subscriptions
-- ============================================================

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_member_isolation" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- FUNCTION: seed_default_categories(p_family_id UUID)
-- Inserts 4 default categories for a newly created family.
-- Called from onboarding-api.ts after createFamily().
-- Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.categories (family_id, name, icon, type, is_default, is_active, sort_order)
  VALUES
    (p_family_id, 'Учёба',      '📚', 'study',   true, true, 0),
    (p_family_id, 'Дом',        '🏠', 'home',    true, true, 1),
    (p_family_id, 'Спорт',      '⚽', 'sport',   true, true, 2),
    (p_family_id, 'Распорядок', '⏰', 'routine', true, true, 3)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_categories(UUID) TO authenticated;

-- ============================================================
-- HOW TO USE THIS MIGRATION:
-- 1. Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor)
-- 2. After createFamily() in onboarding-api.ts, call seed_default_categories(familyId)
-- 3. Old `schedule` table (from supabase-migration-flexible.sql) is kept untouched
--    for backward compatibility — do NOT drop it here.
-- ============================================================
