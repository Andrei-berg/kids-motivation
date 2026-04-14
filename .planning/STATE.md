---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: — Communication
status: unknown
last_updated: "2026-04-14T09:21:55.586Z"
progress:
  total_phases: 15
  completed_phases: 12
  total_plans: 54
  completed_plans: 52
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-14 — Plan 3.2-01 db-schema завершён.

---

## Текущая позиция

```
Milestone v3.0 Communication — Phase 3.2 of 3 (family-chat)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-04-14 — Plan 3.2-01 complete (chat_messages DB schema, types, repo)
```

Progress: [████░░░░░░] 40% (4/10 plans complete)

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
Stopped at: Plan 3.2-01 complete. Next: execute plan 3.2-02 (chat UI)
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
- [Phase 3.2-02]: ChatThread accepts props not context — makes it reusable for sticker extension in plan 3.2-03
- [Phase 3.2-02]: Duplicate guard in Realtime callback prevents double-render after optimistic insert
