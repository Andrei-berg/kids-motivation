-- Phase 4.4: parent_audit_events table + consent_given column on family_members

-- ============================================================================
-- TABLE: parent_audit_events
-- Records significant parent actions for audit trail and COPPA compliance.
-- family_id links to families table; child_id is nullable for family-wide actions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.parent_audit_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id       TEXT        REFERENCES public.children(id) ON DELETE SET NULL,
  action_type    TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  coins_delta    INT,
  actor_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT parent_audit_events_action_type_check CHECK (
    action_type IN (
      'shop_approve',
      'shop_reject',
      'coin_adjust',
      'badge_award',
      'settings_change',
      'data_export',
      'account_delete_request'
    )
  )
);

-- Index for efficient family + time queries (most common read pattern)
CREATE INDEX IF NOT EXISTS idx_parent_audit_family_created
  ON public.parent_audit_events (family_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.parent_audit_events ENABLE ROW LEVEL SECURITY;

-- Parents can read their own family's audit log
CREATE POLICY "Parents can read own family audit"
  ON public.parent_audit_events
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Parents can insert audit events for their own family
CREATE POLICY "Parents can insert audit events"
  ON public.parent_audit_events
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CONSENT COLUMN: family_members
-- NULL = not asked yet, TRUE = consent given, FALSE = consent denied/withdrawn
-- Required for COPPA compliance (children under 13 need parental consent).
-- ============================================================================

ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT NULL;
