---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: — Communication
status: unknown
last_updated: "2026-04-14T10:30:00Z"
progress:
  total_phases: 15
  completed_phases: 12
  total_plans: 54
  completed_plans: 54
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-14 — Plan 3.2-04 achievement-autoposts complete.

---

## Текущая позиция

```
Milestone v3.0 Communication — Phase 3.2 of 3 (family-chat)
Plan: 4 of 4 in current phase (3.2-04 complete — PHASE 3.2 DONE)
Status: Phase 3.2 complete
Last activity: 2026-04-14 — Plan 3.2-04 achievement-autoposts complete
```

Progress: [█████░░░░░] 52% (6/11 plans complete — estimated)

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Milestone v3.0 — Communication → event notifications, real-time family chat, photo sharing

---

## Accumulated Context

### Key technical facts for v3.0

- Web Push already set up (Phase 2.5): VAPID keys, service worker, subscription storage, Vercel Cron for schedule/streak/missed-task reminders
- Push send helper exists: `app/actions/push-streaks.ts` — reuse pattern for new event triggers
- Supabase Realtime is on free tier: 200 concurrent connections, 2M messages/month — sufficient for beta
- Supabase Storage is available — use for photos; compress on client before upload
- No voice messages in v3.0 — deferred to v4.0 (storage cost concern)

### Decisions from v1.0–v2.0

See full decision log above in original STATE.md — preserved in `.planning/milestones/v2.0-STATE.md` if needed.

Key decisions relevant to v3.0:
- Supabase Realtime chosen for chat (built into stack, free tier sufficient)
- /parent/* and /kid/* are separate route trees — chat must be accessible from both
- Zustand store holds familyId + activeMemberId — chat channel = family_id

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

---

## Session Continuity

Last session: 2026-04-14
Stopped at: Plan 3.2-04 complete — Phase 3.2 family-chat fully done
Resume file: None

---

## Decisions

- **[3.1-01]** Dynamic import used in wallet.repo.ts to call server action without circular dependency
- **[3.1-01]** notifyChild silently swallows all errors — push must never break business logic
- **[3.1-01]** child_id resolved via family_members.maybeSingle() — silent fail if child not linked to member
- **[3.1-02]** Push call in awardBadge placed after XP update — badge saved regardless of push outcome
- **[3.1-02]** Single hook in updateWalletCoins covers all coin operations — grades, room, behavior, sport, P2P, approvals
- [Phase 3.1-03]: family_id fetched from family_members on page load in parent dashboard (Child type lacks it)
- [Phase 3.1-03]: Medal UI rendered as separate div below ChildCard using per-child Record<string,T> state maps
- [Phase 3.1-03]: medalResult loaded in parallel with other data in loadData via dynamic import of supabase/client
- **[3.2-01]** sender_id is TEXT not UUID — matches family_members.id convention in this codebase
- **[3.2-01]** ALTER PUBLICATION wrapped in idempotent DO block — safe to run migration multiple times
- **[3.2-01]** subscribeToMessages returns () => void cleanup — callers must call it on unmount to prevent channel leaks
- **[3.2-02]** ChatThread accepts props not context — makes it reusable for sticker extension in plan 3.2-03
- **[3.2-02]** Duplicate guard in Realtime callback prevents double-render after optimistic insert
- **[3.2-02]** Kid chat page queries family_members by id (activeMemberId IS family_members.id from Zustand store)
- **[3.2-02]** Optimistic message replaced with real message from sendMessage response before Realtime fires
- **[3.2-03]** ReactionPickerBar always renders inline (no long-press required) — simpler UX for web
- **[3.2-03]** Sticker emoji stored in content column — direct render without lookup table needed
- **[3.2-03]** Separate Realtime channel for reactions vs messages avoids payload type confusion
- **[3.2-03]** StickerPicker closes on outside mousedown with 50ms delay to avoid same-click dismiss
- **[3.2-04]** postSystemMessage uses sender_role='parent' to satisfy check constraint — system messages are not child-authored
- **[3.2-04]** wallet.family_id used directly from already-fetched Wallet object — avoids extra DB query for familyId in wallet hook
- **[3.2-04]** awardBadge children query extended to include family_id and name — merged to avoid second round-trip
- **[3.2-04]** Streak milestone posts only fire on event='record' AND milestone count (7/14/30) — not every record
