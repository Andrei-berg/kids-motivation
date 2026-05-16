---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: — PWA Polish
status: unknown
last_updated: "2026-05-16T06:38:38.652Z"
progress:
  total_phases: 34
  completed_phases: 16
  total_plans: 70
  completed_plans: 65
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-05-16 — executed 04.3-01 (i18n foundation: LanguageProvider, useT hook, en/ru translation files, LanguageToggle, store language slice).

---

## Текущая позиция

```
Milestone v4.0 PWA Polish — In Progress
Phase 4.3 (localization): Plan 1/6 COMPLETE
Last activity: 2026-05-16 — executed 04.3-01 (custom i18n context + Zustand language slice, 37-namespace translation files for en/ru, LanguageToggle, wired LanguageProvider in app/layout.tsx)
```

Progress: [████░░░░░░] 20% (1/5 phases complete)

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
- i18n: Chose custom React context + Zustand over next-intl — zero deps, dotted-key lookup, {{var}} interpolation, browser-detect default. See 04.3-01-SUMMARY.md.
- COPPA requires parental consent gate for children under 13; data deletion must cascade across all tables

### Pending Todos

None.

### Blockers/Concerns

None.

---

## Session Continuity

Last session: 2026-05-16T06:37:33Z
Stopped at: Completed 04.3-01-PLAN.md — i18n foundation done, Wave 2 plans (04.3-02 through 04.3-05b) can now use useT()
Resume file: None

---

## Decisions

### Phase 4.1 — Plan 01 (2026-04-26)
- Used Next.js Metadata API `appleWebApp` field for Apple meta tags (not manual `<head>` tags) — idiomatic with App Router
- InstallPrompt uses inline styles for reliability — renders before Tailwind CSS hydration
- iOS install detection: `/iPad|iPhone|iPod/.test(navigator.userAgent)` + non-standalone check — covers all iOS Safari variants
- [Phase 04.2-03]: Parent skeleton uses T.card (#1A1A28) and T.cardHi (#20202E) tokens for dark-theme shimmer — matches existing dark palette without introducing new colors
- [Phase 04.2-03]: ParentCenterSkeleton renders semantic sections (header tabs + 2 child cards + activity rows) mirroring Dashboard layout structure
- [Phase 04.3-01]: Custom React context + Zustand for i18n — no next-intl or external packages; dotted-key lookup with {{var}} interpolation; browser language auto-detect with SSR guard; html lang is static, runtime language via LanguageProvider

### Phase 4.1 — Plan 02 (2026-04-26)
- Three-strategy fetch handler: passthrough for /api/ and supabase.co, cache-first for /_next/static/, network-first for pages
- addAll in install handler wrapped in catch() — pre-caching failures don't abort SW install
- OfflineBanner uses inline styles (consistent with InstallPrompt) — renders before Tailwind hydration
- Never cache API routes or Supabase requests in service worker

### Phase 4.1 — Plan 03 (2026-04-26)
- notifyParent only fires for pending-status purchases — auto-approved purchases skip push to avoid noise
- Push failure in requestPurchase is non-blocking — caught in try/catch, purchase flow always succeeds
- pushsubscriptionchange logs warning only — full auto-resubscription requires VAPID key unavailable in SW context
- requestPurchase must be a 'use server' file so notifyParent runs server-side (not in browser context)

### Phase 04.2 — Plan 04 (2026-05-16)
- useCountUp hook uses rAF with cubic ease-out (same pattern as AnimatedNum in kid/design/atoms.tsx) — no framer-motion for count-up, simpler and no extra dependency
- ease: 'easeOut' as const required to satisfy Framer Motion's Easing type in strict TypeScript — plain string literal rejected
- Activity feed capped at 8 items, badge grid at 12, wallet transactions at 10 — all animations complete under 500ms total
