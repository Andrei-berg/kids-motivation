---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: PWA Polish
status: planning
last_updated: "2026-04-26T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-26 — v3.0 Communication milestone complete.

---

## Текущая позиция

```
Milestone v4.0 PWA Polish — Planning
Status: Starting new milestone
Last activity: 2026-04-26 — v3.0 archived, ready for /gsd:new-milestone
```

Progress: [░░░░░░░░░░] 0% — new milestone

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Milestone v4.0 — PWA Polish → installable, offline-capable, localized, COPPA/GDPR compliant

---

## Accumulated Context

### Carry-forward from v3.0

- `notifyChild(childId, title, body, url)` is the canonical push dispatch — reuse for any new event notifications in v4.0
- Supabase Realtime channels must return cleanup function; callers must call on unmount (channel leak risk)
- photo_url signed URLs expire in 1h — revisit if v4.0 adds photo galleries or longer-lived views
- family-photos Storage bucket is private; all access via signed URLs

### Key architecture facts for v4.0

- Service worker already exists (for Web Push in v2.5) — extend it for offline caching and background push
- PWA manifest needs `display: standalone`, proper icons (192px, 512px), theme_color
- Next.js 14 App Router: static shell caching requires careful `cache: 'force-cache'` + ISR strategy
- i18n: Next.js has built-in i18n routing; evaluate `next-intl` vs. simple JSON translation files
- COPPA requires parental consent gate for children under 13; data deletion must cascade across all tables

### Pending Todos

None.

### Blockers/Concerns

None.

---

## Session Continuity

Last session: 2026-04-26
Stopped at: v3.0 milestone archived — ready to start v4.0 planning
Resume file: None

---

## Decisions

(Decisions will accumulate here as v4.0 executes)
