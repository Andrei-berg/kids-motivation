---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: PWA Polish
status: in_progress
last_updated: "2026-04-26T18:02:00Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
phases:
  - id: "4.1"
    name: pwa
    status: in_progress
    plans_total: 3
    plans_complete: 1
  - id: "4.2"
    name: ux-polish
    status: not_started
  - id: "4.3"
    name: localization
    status: not_started
  - id: "4.4"
    name: security-compliance
    status: not_started
  - id: "4.5"
    name: desktop
    status: not_started
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-26 — v4.0 roadmap created.

---

## Текущая позиция

```
Milestone v4.0 PWA Polish — In Progress
Phase 4.1 (pwa): Plan 1/3 complete
Last activity: 2026-04-26 — executed 04.1-01 (PWA installability: meta tags + InstallPrompt)
```

Progress: [█░░░░░░░░░] 7% (0/5 phases complete, 1/3 plans in phase 4.1)

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Milestone v4.0 — PWA Polish → installable, offline-capable, localized, COPPA/GDPR compliant, desktop-ready

---

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 4.1 | pwa | PWA-01, PWA-02, PWA-03 | Not started |
| 4.2 | ux-polish | UX-01, UX-02 | Not started |
| 4.3 | localization | LOC-01 | Not started |
| 4.4 | security-compliance | SEC-01, SEC-02 | Not started |
| 4.5 | desktop | DSK-01, DSK-02, DSK-03 | Not started |

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

Last session: 2026-04-26T18:02:00Z
Stopped at: Completed 04.1-01-PLAN.md — ready to execute 04.1-02
Resume file: None

---

## Decisions

### Phase 4.1 — Plan 01 (2026-04-26)
- Used Next.js Metadata API `appleWebApp` field for Apple meta tags (not manual `<head>` tags) — idiomatic with App Router
- InstallPrompt uses inline styles for reliability — renders before Tailwind CSS hydration
- iOS install detection: `/iPad|iPhone|iPod/.test(navigator.userAgent)` + non-standalone check — covers all iOS Safari variants
