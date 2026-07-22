-- Phase 5.9 Plan 07: allow behavior-mark approve/reject decisions in the
-- parent audit log. Extends the parent_audit_events action_type CHECK with
-- 'behavior_approve' and 'behavior_reject' (used by
-- app/parent/behavior/actions.ts's approveBehaviorMark/rejectBehaviorMark
-- best-effort insertAuditEvent calls). Mirrors 05.4-04-withdraw-audit-actions.sql's
-- drop-and-recreate pattern. Idempotent: safe to re-run.

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
      'withdraw_reject',
      'behavior_approve',
      'behavior_reject'
    )
  );
