# Roadmap: FamilyCoins

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Milestones

- ✅ **v1.0 Foundation** — Phases 1.1–1.4 (shipped 2026-03-08)
- ✅ **v2.0 Role-Based UI** — Phases 2.1–2.6 (shipped 2026-04-13)
- ✅ **v3.0 Communication** — Phases 3.1–3.3 (shipped 2026-04-26)
- ✅ **v4.0 PWA Polish** — Phases 4.1–4.5 (shipped 2026-05-18, closed 2026-07-23)
- ✅ **v5.0 Flexibility & Design** — Phases 5.1–5.11 (shipped 2026-07-23)
- 🚧 **v9.0 Kid Experience Redesign** — Phases 9.1–9.6 (in progress — next up)
- 📋 **v6.0 Monetization** — Phases 6.1–6.3 (planned)
- 📋 **v7.0 Social** — Phases 7.1–7.3 (planned)
- 📋 **v8.0 Native Apps** — Phases 8.1–8.3 (planned)

---

## Completed Milestones

<details>
<summary>✅ v1.0 Foundation (Phases 1.1–1.4) — SHIPPED 2026-03-08</summary>

- [x] **Phase 1.1: db-schema** — Multi-tenant Supabase schema, RLS policies, Supabase Auth, adam/alim data migration (completed 2026-03-01)
- [x] **Phase 1.2: onboarding** — Registration, onboarding wizard, child join flow via invite code (completed 2026-03-01)
- [x] **Phase 1.3: categories-schedule** — Flexible categories, weekly schedule, push reminder notifications (completed 2026-03-07)
- [x] **Phase 1.4: dashboard-refactor** — Remove all hardcoded 'adam'/'alim', dynamic family context throughout (completed 2026-03-08)

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Role-Based UI (Phases 2.1–2.6) — SHIPPED 2026-04-13</summary>

- [x] **Phase 2.1: role-routing** — Role detection after login, middleware guards /parent/* and /kid/* (completed 2026-04-03)
- [x] **Phase 2.2: parent-center** — Full parent UI: dark dashboard, daily input, wallets, analytics, shop, PIN-protected settings (completed 2026-04-04)
- [x] **Phase 2.3: kid-screen** — Full kid UI: bright theme, my day, wallet, achievements, shop browse, leaderboard (completed 2026-04-05)
- [x] **Phase 2.4: shop-approval** — Purchase request flow: freeze → approve/reject; parent preview mode (completed 2026-04-08)
- [x] **Phase 2.4.1: kid-screen-v2** — Weekly calendar, kid day-fill form, expenses tab, fill-mode settings (completed 2026-04-10)
- [x] **Phase 2.5: notifications-animations** — Coin fly-up, confetti, streak push alerts, schedule + missed-task crons (completed 2026-04-10)
- [x] **Phase 2.6: registration** — Onboarding wizard with real DB writes, child PIN login flow (completed 2026-04-13)

See: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Communication (Phases 3.1–3.3) — SHIPPED 2026-04-26</summary>

- [x] **Phase 3.1: event-notifications** — Push notifications for purchase approval, badge award, wallet events, Medal of the Day (completed 2026-04-13)
- [x] **Phase 3.2: family-chat** — Real-time group chat with text, reactions (❤️ 👍 🔥 🏆), sticker pack, achievement auto-posts (completed 2026-04-14)
- [x] **Phase 3.3: photos** — Photo messages in chat (client compression + signed URLs) and task photo proof in kid day-fill (completed 2026-04-14)

See: `.planning/milestones/v3.0-ROADMAP.md`

</details>

<details>
<summary>✅ v4.0 PWA Polish (Phases 4.1–4.5) — SHIPPED 2026-05-18</summary>

- [x] **Phase 4.1: pwa** — Install prompt on iOS/Android, background Web Push via service worker, basic offline shell (completed 2026-04-26)
- [x] **Phase 4.2: ux-polish** — Skeleton loaders, Framer Motion page transitions, 44px touch targets throughout (completed 2026-05-16)
- [x] **Phase 4.3: localization** — Russian + English, browser auto-detect, manual language switcher (completed 2026-05-17)
- [x] **Phase 4.4: security-compliance** — Account deletion with data cascade, data export, COPPA/GDPR consent gate, parent audit log (completed 2026-05-17)
- [x] **Phase 4.5: desktop** — Dedicated wide-screen layout (≥1024px): sidebar nav, multi-column Parent Center, wide-screen Kid Screen (completed 2026-05-18)

Milestone close (all phase details, success criteria, plan lists) formally run 2026-07-23 alongside v5.0 — was code-complete since 2026-05-18 but never previously archived.

See: `.planning/milestones/v4.0-ROADMAP.md`

</details>

<details>
<summary>✅ v5.0 Flexibility & Design Unification (Phases 5.1–5.11) — SHIPPED 2026-07-23</summary>

> Principle: **nothing gets restyled while it is hardcoded.** Every phase removes a hardcode
> and replaces it with family-configurable data; design work follows flexibility.

- [x] **Phase 5.1: launch-prep** — Key/DB-password rotation, Sentry + product analytics, money-API integration tests, FamilyCoins naming (completed 2026-07-06)
- [x] **Phase 5.2: room-tasks** — Configurable room checklist: `room_tasks`/`room_checks` tables, dual-write off the 5 hardcoded columns, settings editor (completed 2026-07-07)
- [x] **Phase 5.3: design-tokens** — Unified `lib/design/tokens.ts` (paper/ink themes; Bitter/Golos Text/JetBrains Mono) re-exported through legacy `T` objects + shared atoms (LedgerRow, Amount, StatusChip, stamp animation) (completed 2026-07-07)
- [x] **Phase 5.4: streak-settings** — Streak thresholds/bonuses move from award-route constants into `wallet_settings` + rules UI (completed 2026-07-07)
- [x] **Phase 5.5: year-calendar** — School year (dates, quarters/trimesters), regional vacation presets with manual override, configurable weekend days, sick-day pauses streaks (completed 2026-07-13)
- [x] **Phase 5.6: day-blocks** — Day assembly engine: day type × schedule × block rules; per-child `day_blocks` config; block-list renderer replaces hardcoded form sections; award computes from blocks; per-family feature flag (completed 2026-07-14)
- [x] **Phase 5.7: kid-redesign** — Kid screens on unified tokens, nav 6→5 (leaderboard becomes a tab inside awards), motion discipline (single signature gesture) (completed 2026-07-18)
- [x] **Phase 5.8: parent-redesign** — Parent Center on unified tokens + Day Constructor UI + Year Calendar screen + Weekly Summary card (completed 2026-07-21)
- [x] **Phase 5.9: rules-presets** — Rule presets (Classic / No-penalties / Bonuses-only), `grade_scale` per family, configurable behavior tags (completed 2026-07-23)
- [x] **Phase 5.10: automation** — Scheduled allowance, auto-approve under trust limit, schedule-driven smart reminders (completed 2026-07-22)
- [x] **Phase 5.11: legacy-cleanup** — Redirect + delete legacy pages, purge globals.css, FamilyCoins app icon/splash/manifest (completed 2026-07-23)

Design contract (13 mockups, palette, type, day-constructor): https://claude.ai/code/artifact/ab9621cc-2f84-42ff-a873-d07f8b841715

Known deferred at close: 2 phases with partial human-UAT (05.8: 2 pending scenarios; 05.10: 1 pending scenario — real-device VAPID push receipt) and 8 old verification reports still flagged human_needed/gaps_found going back to phase 01.3 — see STATE.md Deferred Items.

See: `.planning/milestones/v5.0-ROADMAP.md`

</details>

---

## Planned Milestones

### v9.0 — Kid Experience Redesign

> Grounded in `.claude/skills/sketch-findings-kids-motivation/` (2026-09-17 sketch session,
> sketches 001-003). Numbered v9.0 (not v6.0) and phases start at 9.1 specifically to avoid
> colliding with the already-reserved-but-unbuilt v6.0/v7.0/v8.0 phase numbers (6.1–8.3).

## Phases

- [x] **Phase 9.1: feed-recognition** — Family Feed becomes a motivational recognition stream: story reel + day-grouped event cards with color rail, no money, no penalties (completed 2026-09-17)
- [x] **Phase 9.2: feed-social** — Emoji reactions, sibling "подколоть" tease replies, kid→kid medals as their own feed event (completed 2026-09-19)
- [x] **Phase 9.3: dayform-default** — Per-child `fill_style` preference + sticky-summary (default) day-fill style with live coin feedback (completed 2026-09-19)
- [x] **Phase 9.4: dayform-styles** — Tile-sheet (grid + bottom sheet) and story-stepper (one category at a time) day-fill styles (completed 2026-09-19)
- [ ] **Phase 9.5: boost-default** — Per-child `boost_style` preference + segmented-bar weekly-boost detail view, reading real tier/coin rules
- [ ] **Phase 9.6: boost-styles** — Quest-checklist and ring-badges weekly-boost detail styles

---

## Phase Details

### Phase 9.1: feed-recognition
**Goal**: Kid and parent see the Family Feed reframed as a motivational recognition stream — today's highlights up top, day-grouped event cards below — with no money or penalty content ever shown
**Depends on**: Nothing (first v9.0 phase)
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04
**Success Criteria** (what must be TRUE):
  1. Opening the Feed shows a story-reel bubble per child with today's single biggest highlight; tapping a bubble opens a full celebratory moment view
  2. Below the story reel, events are grouped by day into cards, each with a color-coded left rail matching its event type (day completed, streak, boost, badge, medal, reading, purchase, parent note) reusing the real `CollapsibleRow` rail pattern
  3. A reward purchase card in the feed shows only the reward's name, never a coin amount or price
  4. No card in the feed ever shows a penalty, correction, or negative behavior-tag event — those stay visible only in the private Wallet/audit trail
**Plans**: 4 plans

Plans:
- [x] 09.1-01-PLAN.md — Pure highlight-ranking module (`pickHighlight`, `RANK_ORDER`, `RAIL_COLOR_MAP`) + vitest suite + story-seen localStorage helpers
- [x] 09.1-02-PLAN.md — `EventRow` restyled as a color-railed card; coin-amount rendering removed for every kind; FEED-04 emitter audit + regression guard
- [x] 09.1-03-PLAN.md — Story reel (per-child today-highlight bubbles, seen/unseen ring) + full-bleed celebratory modal with mark-seen wiring
- [x] 09.1-04-PLAN.md — Full gate sweep (tsc/lint/test/build + structural content gates) and operator browser verification checkpoint

**UI hint**: yes

### Phase 9.2: feed-social
**Goal**: Family members can recognize and playfully needle each other directly on feed events, and a kid-sent medal shows up as its own celebrated moment
**Depends on**: Phase 9.1
**Requirements**: FEED-05, FEED-06, FEED-07
**Success Criteria** (what must be TRUE):
  1. Any family member can tap a fixed emoji reaction on a feed card; it toggles on/off per user and shows a live count
  2. A child can open the "подколоть" tray, pick a pre-written playful phrase (no freeform text field exists), and see it post as a reply bubble under the sibling's card
  3. A medal sent kid→kid appears in the feed as its own recognized event type, not folded into a generic note
**Plans**: 7 plans

Plans:
- [x] 09.2-01-PLAN.md — Tease foundations: locked 17-phrase module by event kind + tagged-comment storage/read helpers in `feed.repo.ts`
- [x] 09.2-02-PLAN.md — Medal backend: sender-aware `medals` migration (applied to prod) + locked 8-phrase set + `sendKidMedal` coins-0 server action
- [x] 09.2-03-PLAN.md — Reactions: picker expanded to all 6 allowed emoji + chip pop animation (with reduced-motion guard) in `globals.css`
- [x] 09.2-04-PLAN.md — Live-DB integration suite for `sendKidMedal`: guards, cross-family block, zero-coin proof, both daily caps
- [x] 09.2-05-PLAN.md — Tease UI: `TeaseButton`/`TeaseTray`/`TeaseReply` in `FamilyFeed.tsx` with self-tease block and one-per-card state
- [x] 09.2-06-PLAN.md — `MedalComposer` bottom sheet (sibling picker + 8 berry phrase buttons) and the kid-only feed launcher
- [x] 09.2-07-PLAN.md — Gate sweep + D-01..D-12 decision matrix, project-docs update, operator browser verification checkpoint

**UI hint**: yes

### Phase 9.3: dayform-default
**Goal**: Every child has a persisted, changeable day-fill style preference, and filling the day in the default sticky-summary style gives constant transparency plus live coin feedback
**Depends on**: Nothing (independent of the Feed work in 9.1/9.2)
**Requirements**: DAYFORM-01, DAYFORM-04, DAYFORM-05, DAYFORM-06
**Success Criteria** (what must be TRUE):
  1. A child's profile/settings shows a `fill_style` control (tile-sheet / story-stepper / sticky-summary) that can be changed at any time
  2. A child with no explicit preference set fills their day in `sticky-summary` style by default
  3. In `sticky-summary` style, a persistent completion ring + live coin total stay on screen; binary categories (room, behavior) toggle with one tap directly on the row with no sheet or accordion; multi-value categories expand a small inline panel in place
  4. Filling any category shows a floating "+N coins" that rises and fades, and the running coin total ticks upward immediately
**Plans**: 6 plans
Plans:
- [x] 09.3-01-PLAN.md — children.fill_style migration (file + applied to prod), Child type, updateChildFillStyle server action, ProfileSheet pill, i18n keys
- [x] 09.3-02-PLAN.md — CoinAnimation loss variant + row-anchored flyups + globals.css keyframes (loss drift, mood pop, reduced-motion static)
- [x] 09.3-03-PLAN.md — lib/kid/day-fill-progress.ts (+ unit tests) and the StickySummaryBar / QuickRow / InlinePanelRow primitives
- [x] 09.3-04-PLAN.md — KidDayFillForm: fillStyle prop + day-page wiring, sticky ring/total bar, D-09 applicability map, per-fill coin feedback
- [x] 09.3-05-PLAN.md — Row-tree swap: one-tap binary rows (room/activities/custom blocks), in-place panels, always-expanded mood pop, accordion removed
- [x] 09.3-06-PLAN.md — Gate sweep + live-schema re-check + D-01..D-13 traceability matrix, project-docs update, operator browser verification
**UI hint**: yes

### Phase 9.4: dayform-styles
**Goal**: A child who prefers a different rhythm can switch to tile-sheet or story-stepper and get the full day-fill experience, not a partial one
**Depends on**: Phase 9.3
**Requirements**: DAYFORM-02, DAYFORM-03
**Success Criteria** (what must be TRUE):
  1. With `tile-sheet` selected, the day renders as a 2-column grid of per-category status tiles; tapping a tile opens a bottom sheet scoped to just that category, and closing it updates the tile in place with no page reflow
  2. With `story-stepper` selected, one category fills the screen at a time behind a dot-progress track; completing a category auto-advances to the next incomplete one, and an explicit skip control lets the child jump ahead
  3. Both styles show the same live floating coin feedback on every category filled as the sticky-summary default does
**Plans**: 5 plans
Plans:
- [x] 09.4-01-PLAN.md — BottomSheet / TileCard / DotTrack / StepCoinHeader primitives, reduced-motion CSS guard, 17 i18n keys
- [x] 09.4-02-PLAN.md — tile-sheet: TileGrid + per-item tile descriptors + render branch in KidDayFillForm
- [x] 09.4-03-PLAN.md — story-stepper: StoryStepper (dot track, auto-advance, skip, summary) + step descriptors + render branch
- [x] 09.4-04-PLAN.md — fill-style server-action guard removal + whitelist hardening (with test) and the ProfileSheet 3-way picker
- [x] 09.4-05-PLAN.md — Gate sweep + D-01..D-18 traceability matrix, project-docs correction, operator browser verification
**UI hint**: yes

### Phase 9.5: boost-default
**Goal**: Every child has a persisted, changeable weekly-boost detail style preference, and tapping the inline boost meter opens a real, rule-accurate breakdown in the segmented-bar style
**Depends on**: Nothing (independent of the Feed and Day-fill work)
**Requirements**: BOOST-01, BOOST-02, BOOST-03, BOOST-06
**Success Criteria** (what must be TRUE):
  1. A child's profile/settings shows a `boost_style` control (segmented-bar / quest-checklist / ring-badges) that can be changed at any time
  2. Tapping the existing inline `BoostMeter` on the Day hero opens a detail view rendered in the child's chosen style; the inline meter itself stays visually unchanged
  3. With `segmented-bar` selected, the detail view shows the grade-tier progress and the consistency-bonus progress as two independent sub-bars, each with its own hint text
  4. Every tier threshold and coin amount shown is read live from `lib/kid/boost-rules.ts` — none of the sketch's illustrative placeholder numbers appear
**Plans**: 5 plans
Plans:
- [x] 09.5-01-PLAN.md — boost_style migration (file + live DB) + Child type + updateChildBoostStyle server action
- [x] 09.5-02-PLAN.md — boost data layer: gradesNext, BoostProgress.weekDetail, pure buildBoostDetail + tests
- [x] 09.5-03-PLAN.md — BoostDetailSheet segmented-bar detail view + i18n keys + reduced-motion CSS
- [x] 09.5-04-PLAN.md — wire all 3 BoostMeter entry points + ProfileSheet boost_style picker
- [x] 09.5-05-PLAN.md — phase close: gate sweep, live-schema re-check, traceability matrix, operator sign-off
**UI hint**: yes

### Phase 9.6: boost-styles
**Goal**: A child who prefers a different breakdown can switch to quest-checklist or ring-badges and see the same rule-accurate boost data presented differently
**Depends on**: Phase 9.5
**Requirements**: BOOST-04, BOOST-05
**Success Criteria** (what must be TRUE):
  1. With `quest-checklist` selected, every boost condition (grade-tier thresholds, full-week completion, streak threshold) appears as its own row with its own reward amount and progress, plus one combined total at the bottom
  2. With `ring-badges` selected, one ring shows the current total and tappable tier badges (reached / next) open a popover explaining what's needed for the next tier
  3. Both styles read the same real thresholds/amounts from `lib/kid/boost-rules.ts` as the segmented-bar default, with no hardcoded sketch numbers
**Plans**: TBD
**UI hint**: yes

---

### v6.0 — Monetization

- [ ] **Phase 6.1: freemium-limits** — Free plan limits (2 children, 3 categories, 5 shop items), paywall
- [ ] **Phase 6.2: stripe-subscription** — Stripe Checkout, 30-day trial, webhook activation, cancel flow
- [ ] **Phase 6.3: referral-program** — Unique referral link, +1 month premium per successful referral

### v7.0 — Social

- [ ] **Phase 7.1: family-friendship** — Friend families via invite code, parent approval, privacy guard
- [ ] **Phase 7.2: challenges** — Joint 7-day challenges with friend families, daily leaderboard
- [ ] **Phase 7.3: templates-library** — Share/import shop items and category templates

### v8.0 — Native Apps

- [ ] **Phase 8.1: expo-react-native** — Expo monorepo, shared packages/core, iOS simulator
- [ ] **Phase 8.2: app-store** — TestFlight, App Store listing, Apple review, live
- [ ] **Phase 8.3: google-play** — Internal → closed testing, Play Store listing, live

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1.1 db-schema | v1.0 | 3/3 | Complete | 2026-03-01 |
| 1.2 onboarding | v1.0 | 5/5 | Complete | 2026-03-01 |
| 1.3 categories-schedule | v1.0 | 4/4 | Complete | 2026-03-07 |
| 1.4 dashboard-refactor | v1.0 | 3/3 | Complete | 2026-03-08 |
| 2.1 role-routing | v2.0 | 2/2 | Complete | 2026-04-03 |
| 2.2 parent-center | v2.0 | 8/8 | Complete | 2026-04-04 |
| 2.3 kid-screen | v2.0 | 6/6 | Complete | 2026-04-05 |
| 2.4 shop-approval | v2.0 | 4/4 | Complete | 2026-04-08 |
| 2.4.1 kid-screen-v2 | v2.0 | 4/4 | Complete | 2026-04-10 |
| 2.5 notifications-animations | v2.0 | 4/4 | Complete | 2026-04-10 |
| 2.6 registration | v2.0 | 4/4 | Complete | 2026-04-13 |
| 3.1 event-notifications | v3.0 | 3/3 | Complete | 2026-04-13 |
| 3.2 family-chat | v3.0 | 4/4 | Complete | 2026-04-14 |
| 3.3 photos | v3.0 | 3/3 | Complete | 2026-04-14 |
| 4.1 pwa | v4.0 | 3/3 | Complete | 2026-04-26 |
| 4.2 ux-polish | v4.0 | 4/4 | Complete | 2026-05-16 |
| 4.3 localization | v4.0 | 7/7 | Complete | 2026-05-17 |
| 4.4 security-compliance | v4.0 | 5/5 | Complete | 2026-05-17 |
| 4.5 desktop | v4.0 | 3/3 | Complete | 2026-05-18 |
| 5.1 launch-prep | v5.0 | 6/6 | Complete | 2026-07-06 |
| 5.2 room-tasks | v5.0 | 6/6 | Complete | 2026-07-07 |
| 5.3 design-tokens | v5.0 | 3/3 | Complete | 2026-07-07 |
| 5.4 streak-settings | v5.0 | 3/3 | Complete | 2026-07-07 |
| 5.5 year-calendar | v5.0 | 7/7 | Complete | 2026-07-13 |
| 5.6 day-blocks | v5.0 | 8/8 | Complete | 2026-07-14 |
| 5.7 kid-redesign | v5.0 | 12/12 | Complete | 2026-07-18 |
| 5.8 parent-redesign | v5.0 | 9/9 | Complete | 2026-07-21 |
| 5.9 rules-presets | v5.0 | 10/10 | Complete | 2026-07-23 |
| 5.10 automation | v5.0 | 4/4 | Complete | 2026-07-22 |
| 5.11 legacy-cleanup | v5.0 | 3/3 | Complete | 2026-07-23 |
| 9.1 feed-recognition | v9.0 | 4/4 | Complete   | 2026-09-17 |
| 9.2 feed-social | v9.0 | 7/7 | Complete   | 2026-09-19 |
| 9.3 dayform-default | v9.0 | 6/6 | Complete   | 2026-09-19 |
| 9.4 dayform-styles | v9.0 | 5/5 | Complete   | 2026-09-19 |
| 9.5 boost-default | v9.0 | 4/5 | In Progress|  |
| 9.6 boost-styles | v9.0 | 0/? | Not started | - |
| 6.1–6.3 | v6.0 Monetization | 0/? | Planned | - |
| 7.1–7.3 | v7.0 Social | 0/? | Planned | - |
| 8.1–8.3 | v8.0 Native Apps | 0/? | Planned | - |

---

*Created: 2026-03-01. Updated: 2026-09-17 — Milestone v9.0 Kid Experience Redesign roadmapped: 6 phases (9.1–9.6) derived from FEED-01..07/DAYFORM-01..06/BOOST-01..06, grounded in `.claude/skills/sketch-findings-kids-motivation/`; numbered v9.0 and phases start at 9.1 specifically to avoid colliding with the already-reserved v6.0/v7.0/v8.0 phase numbers (6.1–8.3). Previous update 2026-07-23 — v5.0 Flexibility & Design Unification shipped (11 phases, 71 plans); v4.0 PWA Polish formally closed at the same time.*

## Backlog

### Phase 999.1: parent-center-signout (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Notes: Parent Center (`components/parent-center/`) — the primary mobile-first hub per
CLAUDE.md — has no sign-out control anywhere in its UI. The legacy `/parent/dashboard`
nav (`components/parent/ParentNav.tsx`) has a `signOut` call; Parent Center never got
one. Found during `/gsd:verify-work` for phase 09.1 while trying to switch from a
parent session to a kid session for testing.

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: kid-preview-entry-point (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Notes: CLAUDE.md documents "a parent may inspect `/kid/*` with `?preview=true`", and
`middleware.ts` does honor that query param at the route-guard layer — but the actual
kid route-group layout (`app/kid/(app)/layout.tsx`) requires a `kid_preview` cookie
naming a specific child id, and nothing in the current UI sets that cookie. Only
`components/kid/ParentPreviewBanner.tsx`'s "exit preview" button clears it — there is
no "enter preview" control anywhere. The documented preview mechanism is effectively
dead. Found during `/gsd:verify-work` for phase 09.1 while trying to switch from a
parent session to a kid session for testing.

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
