# Milestones

## v9.0 Kid Experience Redesign (Shipped: 2026-09-20)

**Phases completed:** 6 phases, 32 plans
**Timeline:** 3 days (2026-09-17 → 2026-09-20)
**Commits:** 209 | **Files changed:** 157 | **Code delta:** +28,619 / -388 lines

**Key accomplishments:**

1. Family Feed reframed as a motivational recognition stream — per-child story reel of today's
   biggest highlight up top, day-grouped event cards below with a color-coded rail per event
   type; reward-purchase cards show only the reward name, never a coin amount; penalties and
   negative behavior-tag events never appear (stay in the private Wallet/audit trail only)
2. Feed social layer — fixed 6-emoji reactions with live per-user toggle counts, a sibling
   "подколоть" (tease) tray of 17 locked playful phrases (no freeform text), and a kid→kid
   zero-coin medal send that posts as its own recognized feed event
3. Day-fill form gained 3 selectable per-child interaction styles — `sticky-summary` (persistent
   completion ring + live coin total, one-tap binary rows, default for new children),
   `tile-sheet` (2-column status grid + scoped bottom sheet), and `story-stepper` (one category
   at a time with dot-progress + auto-advance + skip) — all three sharing the same live floating
   coin feedback and the same save/award pipeline underneath
4. Weekly Boost gained a tappable detail view with 3 selectable per-child styles —
   `segmented-bar` (two independent grade-tier/consistency sub-bars), `quest-checklist` (each
   boost condition as its own row with its own reward + progress, one combined total), and
   `ring-badges` (single ring + tappable tier badges with an explainer popover) — all three
   reading real tier thresholds and coin amounts from `lib/kid/boost-rules.ts`, none of the
   sketch's illustrative placeholder numbers
5. `fill_style` and `boost_style` both landed as persisted, self-serve, changeable-anytime
   per-child preferences (`children` table columns, migrations applied and re-verified live in
   prod) with a real 3-way picker in `ProfileSheet`
6. Every phase closed with the same discipline established in v5.0's Phase 1.3 postmortem:
   automated gate sweep + live-schema re-check + full decision traceability matrix + operator
   browser sign-off, never trusting a ROADMAP "Complete" marker alone

**Known gaps at close:** none blocking. One non-blocking Warning from Phase 9.6 code review
(`QuestChecklistBody`'s total progress bar can hit `NaN%` if a family zeroes out every boost coin
setting) left open as low-priority tech debt. No milestone-level `/gsd:audit-milestone` was run
before this close — each phase already carried its own full close-verification, so the operator
chose to proceed without a separate milestone audit pass.

**Archive:** `.planning/milestones/v9.0-ROADMAP.md`, `.planning/milestones/v9.0-REQUIREMENTS.md`

---

## v5.0 Flexibility & Design Unification (Shipped: 2026-07-23)

**Phases completed:** 11 phases, 71 plans, 136 tasks
**Timeline:** 18 days (2026-07-05 → 2026-07-23)
**Commits:** 472 | **Files changed:** 392 | **Code delta:** +55,301 / -6,014 lines
**Code:** ~39,640 LOC TypeScript/TSX total

**Key accomplishments:**

1. De-hardcoded the core of the app — room checklist, streak thresholds/bonuses, school-year calendar (dates, quarters/trimesters, regional vacation presets, configurable weekend days), and a day-assembly engine (day type × schedule × block rules) all moved from code constants into per-family configurable data
2. Rule presets (Classic / No-penalties / Bonuses-only) with a mandatory diff-preview before write; `grade_scale` per family (5-point / 12-point / A–F); behavior is a configurable tag set with per-tag prices instead of one binary flag
3. Automation: scheduled allowance crediting, purchases under a per-child trust limit auto-approve, schedule-driven smart reminders (upcoming training, day not filled, streak at risk) — the daily routine now runs itself
4. Full kid + parent redesign on a unified design system — `lib/design/tokens.ts` (paper/ink themes, Bitter/Golos Text/JetBrains Mono), shared atoms (LedgerRow, Amount, StatusChip); kid nav consolidated 6→5
5. Legacy cleanup — old duplicate pages redirected/removed, `globals.css` purged, consistent FamilyCoins branding as the single remaining UI
6. Found and fixed a Phase 1.3 migration that had silently never reached prod (breaking every push-notification path app-wide) — a reminder that "ROADMAP complete" isn't proof a migration ran

**Known gaps at close:** 2 phases with partial human-UAT (05.8: 2 pending scenarios; 05.10: 1 pending — real-device VAPID push receipt) and 8 old verification reports still flagged human_needed/gaps_found going back to phase 01.3, acknowledged and deferred (see STATE.md Deferred Items).

---

## v4.0 PWA Polish (Shipped: 2026-05-18, closed 2026-07-23)

**Phases completed:** 5 phases, 22 plans

**Key accomplishments:**

1. PWA install (Add to Home Screen, iOS/Android), background Web Push via service worker, offline shell caching with graceful degradation
2. Framer Motion page transitions, pixel-accurate skeleton loaders, 44px touch targets throughout
3. Full Russian + English localization, browser auto-detect with manual switcher, zero hardcoded strings
4. Account deletion with full data cascade, data export (ZIP), COPPA/GDPR consent gate for children under 13, parent audit log
5. Dedicated desktop layout (≥1024px): sidebar navigation, multi-column Parent Center + Kid Screen, full-height chat panel

**Note:** This milestone was code-complete since 2026-05-18 but its formal close never ran — work moved straight into v5.0 planning. Closed retroactively on 2026-07-23 alongside v5.0.

---

## v3.0 Communication (Shipped: 2026-04-26)

**Phases completed:** 3 phases, 10 plans
**Timeline:** 2026-04-13 → 2026-04-26 (13 days)
**Code:** ~26,930 LOC TypeScript/TSX total

**Key accomplishments:**

1. Push notifications for all child events — reusable `notifyChild` action wires purchase approval, badge award, wallet credit/debit to Web Push
2. "Medal of the Day" — parent composes personal message + bonus coins; child receives push with deep link to `/kid/day`
3. Real-time family group chat — ChatThread + SendBox components on `/parent/chat` and `/kid/chat` with Supabase Realtime subscription
4. Message reactions + sticker pack — chat_reactions table with real-time updates; 12 emoji stickers via StickerPicker
5. Achievement auto-posts — badge awards, streak milestones (7/14/30 days), and wallet coin credits auto-post system messages to family chat
6. Photo messages in chat — client-side compression (canvas API), Supabase Storage with signed URLs, inline lightbox display
7. Task photo proof — camera/gallery capture in kid day-fill form; proof thumbnail + lightbox in parent confirmation view

**Archive:** `.planning/milestones/v3.0-ROADMAP.md`, `.planning/milestones/v3.0-REQUIREMENTS.md`

---

## v2.0 Role-Based UI (Shipped: 2026-04-13)

**Phases completed:** 7 phases (2.1–2.6 incl. 2.4.1), 32 plans
**Timeline:** 2026-04-03 → 2026-04-13 (10 days)
**Commits:** 142 | **Files changed:** 149 | **Code delta:** +23,962 / -4,941 lines

**Key accomplishments:**

1. Role-based routing — parents land on `/parent`, children on `/kid`; middleware blocks cross-role access
2. Parent Center (`/parent/*`) — dark-theme control panel: dashboard, daily input, wallets, analytics, shop management, PIN-protected settings
3. Kid Screen (`/kid/*`) — bright gamified UI: My Day, wallet, achievements (badges/streaks/XP/levels), shop browse, leaderboard
4. Shop approval flow — child requests item → coins frozen → parent approves/rejects on dashboard → coins settle; parent previews kid view
5. Kid Screen v2 — weekly calendar strip, kid day-fill form (room/mood/activities with live coin counter), family expenses tab, configurable fill-mode per child
6. Notifications & animations — coin fly-up, confetti badge celebrations, streak push alerts, schedule reminder cron, missed-task parent cron
7. Full registration — 5-step onboarding wizard writes all data to DB; child PIN login (family code → pick name → 4-digit PIN → `/kid/day`)

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`

---
