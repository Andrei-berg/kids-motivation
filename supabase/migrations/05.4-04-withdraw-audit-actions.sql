-- 05.4-04: allow withdrawal decisions in the parent audit log.
-- Extends the parent_audit_events action_type CHECK with 'withdraw_approve'
-- and 'withdraw_reject' (used by /api/wallet/withdraw/approve). Idempotent:
-- drop-and-recreate of a named constraint.

ALTER TABLE public.parent_audit_events
  DROP CONSTRAINT IF EXISTS parent_audit_events_action_type_check;

ALTER TABLE public.parent_audit_events
  ADD CONSTRAINT parent_audit_events_action_type_check CHECK (
    action_type IN (
      'shop_approve',
      'shop_reject',
      'coin_adjust',
      'badge_award',
      'settings_change',
      'data_export',
      'account_delete_request',
      'withdraw_approve',
      'withdraw_reject'
    )
  );
