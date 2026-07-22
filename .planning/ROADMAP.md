# Roadmap: FamilyCoins

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Milestones

- ✅ **v1.0 Foundation** — Phases 1.1–1.4 (shipped 2026-03-08)
- ✅ **v2.0 Role-Based UI** — Phases 2.1–2.6 (shipped 2026-04-13)
- ✅ **v3.0 Communication** — Phases 3.1–3.3 (shipped 2026-04-26)
- 📋 **v4.0 PWA Polish** — Phases 4.1–4.5 (planned)
- 📋 **v5.0 Flexibility & Design** — Phases 5.1–5.11 (planned 2026-07-05)
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

---

## Planned Milestones

### v4.0 — PWA Polish

## Phases

- [x] **Phase 4.1: pwa** — Install prompt on iOS/Android, background Web Push via service worker, basic offline shell (completed 2026-04-26)
- [x] **Phase 4.2: ux-polish** — Skeleton loaders, Framer Motion page transitions, 44px touch targets throughout (completed 2026-05-16)
- [ ] **Phase 4.3: localization** — Russian + English, browser auto-detect, manual language switcher
- [x] **Phase 4.4: security-compliance** — Account deletion with data cascade, data export, COPPA/GDPR consent gate, parent audit log (completed 2026-05-17)
- [ ] **Phase 4.5: desktop** — Dedicated wide-screen layout (≥1024px): sidebar nav, multi-column Parent Center, wide-screen Kid Screen

---

## Phase Details

### Phase 4.1: pwa
**Goal**: Users can install the app on their phone and receive push notifications even when the app is closed
**Depends on**: Nothing (first v4.0 phase)
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. On iOS Safari and Android Chrome, "Add to Home Screen" prompt appears and the app installs as a standalone icon
  2. The installed app opens without browser chrome (standalone display mode)
  3. A Web Push notification arrives on a locked phone when a parent approves a purchase or awards a badge
  4. When the device has no internet, opening the app shows the cached shell instead of a browser error page
  5. When offline, data-dependent sections show a clear "you are offline" degradation state rather than a broken blank screen
**Plans**: 3 plans
Plans:
- [x] 04.1-01-PLAN.md — PWA manifest + Apple meta tags + install prompt (Android/iOS)
- [x] 04.1-02-PLAN.md — Offline caching in SW + OfflineBanner component
- [ ] 04.1-03-PLAN.md — notifyParent server action + wire into purchase request flow

### Phase 4.2: ux-polish
**Goal**: Every page feels instant and every tap target is easy to hit on a phone
**Depends on**: Phase 4.1
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Navigating between pages shows a Framer Motion transition — no hard flash or blank white frame
  2. While data is loading, skeleton placeholder shapes appear in place of content — no layout shift when data arrives
  3. Every button, link, and interactive element in the app measures at least 44×44px on a 375px-wide screen
  4. Tapping any element on a mobile device feels responsive — no missed taps due to undersized hit areas
**Plans**: 4 plans
Plans:
- [ ] 04.2-01-PLAN.md — Install framer-motion + PageTransition wrapper in root layout
- [ ] 04.2-02-PLAN.md — Touch targets: .btn/.pill min-height 44px, KidNav/ParentNav bumps, grade button ripple
- [ ] 04.2-03-PLAN.md — Pixel-accurate skeleton loaders: dark theme for ParentCenter, structured kid page skeletons
- [ ] 04.2-04-PLAN.md — Animation personality: count-up coin balances, stagger-in lists (achievements, transactions, activity feed)

### Phase 4.3: localization
**Goal**: Russian-speaking and English-speaking families each see the app in their language without any manual setup
**Depends on**: Phase 4.2
**Requirements**: LOC-01
**Success Criteria** (what must be TRUE):
  1. A browser set to English loads the app entirely in English — all labels, buttons, and error messages
  2. A browser set to Russian loads the app entirely in Russian — all labels, buttons, and error messages
  3. A user can switch language at any time via a visible language toggle and the UI updates immediately without page reload
  4. No hardcoded Russian or English strings remain in the codebase — all text passes through the i18n layer
**Plans**: 7 plans
Plans:
- [ ] 04.3-01-PLAN.md — i18n foundation: lib/i18n.tsx context + Zustand language slice + translation files (en/ru JSON) + LanguageToggle
- [ ] 04.3-02-PLAN.md — Apply t() to navigation (NavBar, KidNav, ParentNav), auth pages, InstallPrompt, OfflineBanner, chat components
- [ ] 04.3-03-PLAN.md — Apply t() to kid pages (achievements, wallet, shop, day, leaderboard) + KidDayFillForm
- [ ] 04.3-04-PLAN.md — Apply t() to modal components (DailyModal, CoachRatingModal, P2PTransfer, Goals, Shop, Exchange, Withdraw, Bulk) + WalletDashboard + AuditLogViewer
- [ ] 04.3-05a-PLAN.md — Apply t() to wallboard, parent shop, onboarding, remaining client pages + components
- [ ] 04.3-05b-PLAN.md — Apply t() to settings manager components (10) + server-side push files
- [ ] 04.3-06-PLAN.md — Gap closure: fix day-type labels, badge titles, AuditLogViewer today/yesterday, parent shop templates, layout.tsx metadata

### Phase 4.4: security-compliance
**Goal**: Families can trust their data is protected and parents have full visibility into account changes
**Depends on**: Phase 4.3
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. A parent can delete their account from Settings and all family data (children, coins, chat, photos) is removed from the database
  2. A parent can export all family data as a downloadable file from Settings
  3. When a child under 13 is registered, a parental consent screen appears and must be completed before the child account activates
  4. Every parent action — shop confirmation, coin adjustment, settings change — appears as a timestamped entry in an audit log visible to the parent
**Plans**: 5 plans
Plans:
- [ ] 04.4-01-PLAN.md — DB migration: parent_audit_events table + consent_given column; audit.repo.ts
- [ ] 04.4-02-PLAN.md — Audit instrumentation: wire insertAuditEvent into shop approve/reject and coin adjust actions
- [ ] 04.4-03-PLAN.md — Audit screen in ParentCenter: AuditScreen component + Route 'audit' + nav item + i18n
- [ ] 04.4-04-PLAN.md — Data export (ZIP download) + account deletion Danger Zone in Settings Account tab
- [ ] 04.4-05-PLAN.md — COPPA consent gate in FamilyManager: modal when child is under 13 + consent_given stored

### Phase 4.5: desktop
**Goal**: Families using the app on a laptop or desktop get a purpose-built wide-screen layout — not a stretched phone screen
**Depends on**: Phase 4.4
**Requirements**: DSK-01, DSK-02, DSK-03
**Success Criteria** (what must be TRUE):
  1. On a screen wider than 1024px, a persistent sidebar navigation replaces the mobile bottom bar
  2. Parent Center pages (dashboard, wallets, analytics, shop, settings) use multi-column content areas — no single-column mobile cards stretched wide
  3. Kid Screen pages (My Day, wallet, achievements, shop) display in a wide-screen layout designed for the space — content fills the screen purposefully
  4. The family chat panel occupies full available height on desktop without scroll gaps or dead whitespace
**Plans**: 3 plans
Plans:
- [ ] 04.5-01-PLAN.md — ParentCenter desktop shell: sidebar nav (220px) + persistent chat panel (320px)
- [ ] 04.5-02-PLAN.md — Parent Center screen layouts: 2-column grids for Dashboard, Analytics, Children, Shop, Settings
- [ ] 04.5-03-PLAN.md — Kid Screen desktop layouts: 2-column pages for Day, Wallet, Achievements, Shop

---

### v5.0 — Flexibility & Design Unification

> Principle: **nothing gets restyled while it is hardcoded.** Every phase removes a hardcode
> and replaces it with family-configurable data; design work follows flexibility.
> Design contract (13 mockups, palette, type, day-constructor):
> https://claude.ai/code/artifact/ab9621cc-2f84-42ff-a873-d07f8b841715

## Phases (v5.0)

- [x] **Phase 5.1: launch-prep** — Key/DB-password rotation, Sentry + product analytics, money-API integration tests, FamilyCoins naming (completed 2026-07-06)
- [x] **Phase 5.2: room-tasks** — Configurable room checklist: `room_tasks`/`room_checks` tables, dual-write off the 5 hardcoded columns, settings editor (code-complete 2026-07-06; SC4 checkpoint:human-verify pending operator approval)
- [x] **Phase 5.3: design-tokens** — Unified `lib/design/tokens.ts` (paper/ink themes; Bitter/Golos Text/JetBrains Mono) re-exported through legacy `T` objects + shared atoms (LedgerRow, Amount, StatusChip, stamp animation) (completed 2026-07-07)
- [x] **Phase 5.4: streak-settings** — Streak thresholds/bonuses move from award-route constants into `wallet_settings` + rules UI (completed 2026-07-07)
- [x] **Phase 5.5: year-calendar** — School year (dates, quarters/trimesters), regional vacation presets with manual override, configurable weekend days, sick-day pauses streaks (completed 2026-07-13)
- [x] **Phase 5.6: day-blocks** — Day assembly engine: day type × schedule × block rules; per-child `day_blocks` config; block-list renderer replaces hardcoded form sections; award computes from blocks; per-family feature flag (5/5 plans executed 2026-07-14; verification: gaps_found 2/4 — see 05.6-VERIFICATION.md) (completed 2026-07-14)
- [x] **Phase 5.7: kid-redesign** — Kid screens on unified tokens, nav 6→5 (leaderboard becomes a tab inside awards), motion discipline (single signature gesture) (completed 2026-07-18)
- [x] **Phase 5.8: parent-redesign** — Parent Center on unified tokens + Day Constructor UI + Year Calendar screen + Weekly Summary card (completed 2026-07-21)
- [ ] **Phase 5.9: rules-presets** — Rule presets (Classic / No-penalties / Bonuses-only), `grade_scale` per family, configurable behavior tags
- [x] **Phase 5.10: automation** — Scheduled allowance, auto-approve under trust limit, schedule-driven smart reminders (completed 2026-07-22)
- [ ] **Phase 5.11: legacy-cleanup** — Redirect + delete legacy pages, purge globals.css, FamilyCoins app icon/splash/manifest

## Phase Details (v5.0)

### Phase 5.1: launch-prep
**Goal**: The project is safe to iterate on fast — leaked credentials rotated, errors observable, money logic covered by tests
**Depends on**: Nothing (first v5.0 phase)
**Success Criteria** (what must be TRUE):
  1. Supabase service-role key and DB password rotated; old credentials invalid; app works on prod with the new ones
  2. Sentry captures a deliberately thrown test error from prod; product analytics records a test event
  3. Integration tests cover `/api/wallet/award` (idempotency per source, all source types), purchase, exchange — green locally
  4. App name is FamilyCoins in manifest, metadata, and README
**Plans:** 6/6 plans complete
Plans:
- [x] 05.1-01-PLAN.md — Rotate leaked service-role key + DB password (manual dashboard steps) and verify prod on new credentials
- [x] 05.1-02-PLAN.md — FamilyCoins naming in layout metadata, manifest, README
- [x] 05.1-03-PLAN.md — Sentry (@sentry/nextjs) client/server/edge init, DSN-guarded no-op, ?boom=1 prod error trigger
- [x] 05.1-04-PLAN.md — PostHog EU analytics: wrapper + provider + pageviews + day_saved event in both day-fill flows
- [x] 05.1-05-PLAN.md — Money-test harness (vitest @/ alias, isolated test-family fixture) + award idempotency/all-source-types integration tests
- [x] 05.1-06-PLAN.md — Purchase request/approve/reject, exchange math, withdrawal double-spend integration tests

### Phase 5.2: room-tasks
**Goal**: A family can rename, add, remove and reorder room checklist items — nothing about the checklist lives in code or fixed columns
**Depends on**: Phase 5.1
**Success Criteria** (what must be TRUE):
  1. `room_tasks` (per-family: name, icon, order, active) and `room_checks` (per child+date) exist; existing and new families get the default 5 tasks seeded
  2. Kid day form renders the checklist from `room_tasks`; checks write to `room_checks` AND legacy columns (dual-write)
  3. `/api/wallet/award` computes room coins from `room_checks` with fallback to legacy columns; verify scripts pass
  4. Parent edits the task list in Settings; a renamed task appears on the kid screen immediately
**Plans**: 6 plans
Plans:
- [x] 05.2-01-PLAN.md — Migration: room_tasks/room_checks tables + RLS + seed_default_room_tasks() + existing-family backfill + legacy-delete guard [BLOCKING]
- [x] 05.2-02-PLAN.md — room.repo.ts (reads + parent CRUD) + types + new-family seed wiring in createFamily
- [x] 05.2-03-PLAN.md — Award from room_checks with legacy room_ok fallback + parity/threshold/fallback integration tests
- [x] 05.2-04-PLAN.md — KidDayFillForm: render checklist from room_tasks + dual-write room_checks/legacy columns
- [x] 05.2-05-PLAN.md — DailyModal: render checklist from room_tasks + dual-write (sick-day grace preserved)
- [x] 05.2-06-PLAN.md — RoomTasksManager settings editor (add/rename/toggle/reorder/delete; legacy locked) + Settings wiring

### Phase 5.3: design-tokens
**Goal**: One source of design truth — both existing UIs recolor by token substitution without touching component structure
**Depends on**: Nothing (parallel-safe with 5.2)
**Success Criteria** (what must be TRUE):
  1. `lib/design/tokens.ts` exports base palette + `paper` (kid) and `ink` (parent) themes; old `kid/design/tokens.ts` and `parent-center/tokens.ts` re-export from it with unchanged keys
  2. Bitter, Golos Text, JetBrains Mono load via `next/font` (Cyrillic subsets included)
  3. Shared atoms exist and are adopted on at least kid wallet + parent dashboard: LedgerRow (dot leaders), Amount (mono+gold), StatusChip, stamp/count-up animation
  4. Screens not yet migrated (incl. legacy pages) render without visual breakage
**Plans**: 3 plans
Plans:
- [x] 05.3-01-PLAN.md — Unified lib/design/tokens.ts (base + paper/ink) + key-preserving T re-exports + next/font (Bitter/Golos Text/JetBrains Mono, Cyrillic)
- [x] 05.3-02-PLAN.md — Shared atoms: LedgerRow, Amount, StatusChip, useCountUp + Stamp (theme-aware, reduced-motion safe)
- [x] 05.3-03-PLAN.md — Pilot LedgerRow on kid wallet history + parent dashboard activity; full build + consolidated visual checkpoint

### Phase 5.4: streak-settings
**Goal**: Streak thresholds and bonuses are family settings, not code constants
**Depends on**: Phase 5.1
**Success Criteria** (what must be TRUE):
  1. `wallet_settings` gains streak fields (days + bonus per streak type) with defaults equal to current constants
  2. `/api/wallet/award` reads them from settings; behavior unchanged for families that never touched them
  3. Parent edits streak rules in Settings → the next award uses the new values
**Plans**: 3 plans
Plans:
- [x] 05.4-01-PLAN.md — Migration: wallet_settings streak columns (days+bonus per type) + type/defaults + [BLOCKING] live-DB apply
- [x] 05.4-02-PLAN.md — Award route reads streak settings (drop legacy `settings` table) + clamp + integration tests
- [x] 05.4-03-PLAN.md — Streaks card in Parent Center Settings + en/ru i18n + end-to-end human-verify

### Phase 5.5: year-calendar
**Goal**: Day types come from a configurable calendar: school year dates, regional vacation presets, custom periods, family weekend days
**Depends on**: Phase 5.4
**Success Criteria** (what must be TRUE):
  1. Parent sets school-year start/end and quarters/trimesters mode
  2. Choosing a region fills vacations from a bundled JSON directory; every period is manually editable and the manual value wins
  3. Weekend days are configurable per family (default sat+sun); a sick day pauses school blocks without burning streaks
  4. `getDayType` resolves entirely from this data; the kid day screen reflects vacation/weekend automatically

**Plans:** 7/7 plans complete
Plans:
- [x] 05.5-01-PLAN.md — Calendar schema (family_calendar, vacation_periods.preset_id, streaks RLS lock) + calendar types/repo + data-driven getDayType
- [x] 05.5-02-PLAN.md — CR-01 fix (EARLY): server-side updateStreaks + day-type transparency + server-validated bonus date + drop browser streak writes
- [x] 05.5-03-PLAN.md — Bundled RU/KZ/BY vacation preset directory + applyPreset (replace/add-missing) + vacation_periods.preset_id field
- [x] 05.5-04-PLAN.md — Parent Center calendar settings card (school year, term mode, weekend days, region) + i18n
- [x] 05.5-05-PLAN.md — PeriodsManager preset picker + replace/add-missing dialog + preset-row badge
- [x] 05.5-06-PLAN.md — Kid day screen + both day forms load family_calendar into getDayType (SC4)
- [x] 05.5-07-PLAN.md — [BLOCKING] apply 3 migrations to live DB + verify streaks SELECT-only lock

### Phase 5.6: day-blocks
**Goal**: The child's day is assembled from data — day type × schedule × block rules — not from hardcoded form sections
**Depends on**: Phases 5.2, 5.5
**Success Criteria** (what must be TRUE):
  1. `day_blocks` config per child: type, enabled, day types, who fills, coin price, multipliers, schedule link, order
  2. Kid day form renders the assembled block list; on a vacation day school blocks disappear and schedule-driven blocks (section training, extra lesson) appear only on their scheduled days
  3. `/api/wallet/award` computes coins from the assembled blocks, keeping idempotency per `(child_id, source_type, source_id)`; verify scripts pass
  4. Rollout behind a per-family feature flag: own family → beta families → all

**Plans:** 8/8 plans complete
Plans:
- [x] 05.6-01-PLAN.md — day_blocks + day_block_entries schema, families feature flag, parent-only RLS, seed/backfill, types + repo, [BLOCKING] prod apply
- [x] 05.6-02-PLAN.md — shared assembleDayBlocks visibility/price/multiplier utility (tested) + server loadFeatureFlag
- [x] 05.6-03-PLAN.md — /api/wallet/award feature-flag branch: block-driven built-in pricing/multipliers + custom_block source type; flag-off byte-parity; verify scripts
- [x] 05.6-04-PLAN.md — both day-fill forms render the assembled block list (kid page + KidDayFillForm + DailyModal), D-06 parity, D-08 visibility
- [x] 05.6-05-PLAN.md — minimal DayBlocksManager parent settings surface (toggle/price/multiplier/custom create-delete)
- [x] 05.6-06-PLAN.md — [gap CR-01] restore the Room checklist FillSection to KidDayFillForm flag-off branch (D-07 parity)
- [x] 05.6-07-PLAN.md — [gap CR-02 code + WR-01] deterministic custom_block sourceId (`${date}:${block_id}`) + family-scoped entries read in award route
- [x] 05.6-08-PLAN.md — [gap CR-02 DB + WR-01/WR-07] entry-RLS hardening (drop child DELETE, tie child_id<->family_id), seed membership guard, source_id backfill, [BLOCKING] prod apply, exploit-path verify probe

### Phase 5.7: kid-redesign
**Goal**: Kid UI fully on the unified system — warm paper theme, ledger rows, consolidated navigation
**Depends on**: Phases 5.3, 5.6
**Success Criteria** (what must be TRUE):
  1. All kid screens use unified tokens/atoms; no Nunito/coral remnants
  2. Navigation has 5 items; leaderboard lives as a tab inside Awards
  3. Coin credit uses the signature stamp+count-up gesture; confetti fires only for streak bonuses and level-ups

**Plans**: 12 plans (4 waves)
- [x] 05.7-01-PLAN.md — Shared atoms (Tabs/Tick) + useDesktop hook + all phase i18n keys
- [x] 05.7-02-PLAN.md — Pure fns (level/rating-rank/awardResult) + tests + award appliedSources field
- [x] 05.7-03-PLAN.md — ScreenHeader + chat unread-marker data layer (migration + repo)
- [x] 05.7-04-PLAN.md — Day form decompose + reskin + micro-tick toggles (D-09/D-18)
- [x] 05.7-05-PLAN.md — Wallet hero сберкнижка + goals as вклады + goal Stamp (D-16/D-20)
- [x] 05.7-06-PLAN.md — Awards 3-tab + Rating podium/solo + delete leaderboard route (D-05..D-08)
- [x] 05.7-07-PLAN.md — Shop cards on Amount/StatusChip/Tabs + approved Stamp (D-14/D-20)
- [x] 05.7-08-PLAN.md — 5-tab ledger nav + unread badge + FAB/logout removal + layout/login reskin (D-01..D-04/D-10)
- [x] 05.7-09-PLAN.md — Theme-aware ChatThread (retire Nunito) + kid chat mark-read (D-11/D-04)
- [x] 05.7-10-PLAN.md — Overlays reskin + badge Stamp + retire goal confetti (D-12/D-20)
- [x] 05.7-11-PLAN.md — Day-save stamp+count-up + streak/level-up confetti (D-17/D-19)
- [x] 05.7-12-PLAN.md — Green gate + i18n parity + operator SC1/SC2/SC3 verify + dead-code decision

### Phase 5.8: parent-redesign
**Goal**: Parent Center fully on the unified system, including the new configuration screens
**Depends on**: Phases 5.3, 5.6
**Success Criteria** (what must be TRUE):
  1. Parent Center screens use the unified ink theme; no Sora/cyan/neon-green remnants
  2. Day Constructor screen manages `day_blocks` per child (toggle, who fills, price, day types)
  3. Year Calendar screen manages 5.5 data; Analytics shows the Weekly Summary card (static text for now)
**Plans:** 9/9 plans complete
Plans:
- [x] 05.8-01-PLAN.md — Foundation logic (scheduleDowToBlockDow, getDaysInRange, weekly-summary helpers) + all i18n keys + Wave-0 tests
- [x] 05.8-02-PLAN.md — Recolor CalendarSettingsManager + PeriodsManager (D-07; amber→indigo)
- [x] 05.8-03-PLAN.md — Recolor Activities/Sections/Subjects/RoomTasks managers (D-09)
- [x] 05.8-04-PLAN.md — Recolor ChatPanel DARK_ACT map + ui.tsx cyan Btn variant (D-09)
- [x] 05.8-05-PLAN.md — DayBlocksManager recolor (D-04) + schedule-link picker (D-02)
- [x] 05.8-06-PLAN.md — Year Calendar visual month grid + sick-day overlay (D-05/D-06); no new nav (D-01)
- [x] 05.8-07-PLAN.md — Analytics Weekly Summary card (D-08)
- [x] 05.8-08-PLAN.md — DayBlocksManager per-child override, both candidates behind a toggle (D-03)
- [x] 05.8-09-PLAN.md — Consolidated human-verify checkpoint (recolor bar + D-03 decision + grid + card)


### Phase 5.9: rules-presets
**Goal**: Families pick a rule philosophy in one tap and international grading is possible
**Depends on**: Phase 5.6
**Success Criteria** (what must be TRUE):
  1. Presets Classic / No-penalties / Bonuses-only apply predefined `wallet_settings` values; offered during onboarding and in Settings
  2. `grade_scale` per family (5-point / 12-point / A–F) drives grade input and award mapping
  3. Behavior is a configurable tag set with per-tag prices instead of a single binary flag
**Plans**: 10 plans
Plans:
- [x] 05.9-01-PLAN.md — Migrations: grade_scale/grade_coin_map cols, subject_grades TEXT widen, behavior_tags/behavior_marks (authoring only)
- [x] 05.9-02-PLAN.md — Foundation: lib/presets.ts + WalletSettings/behavior types + all i18n keys + presets unit test
- [x] 05.9-03-PLAN.md — [BLOCKING] apply the 3 migrations to the live DB in order + schema readback
- [x] 05.9-04-PLAN.md — grade_coin_map read-time fallback (server+client) + clampGradeCoinMap PATCH validator
- [x] 05.9-05-PLAN.md — behavior.repo.ts (CRUD + propose) + BehaviorTagsManager settings editor
- [x] 05.9-06-PLAN.md — Award route: grade_coin_map lookup + behavior approved-mark sum (both flag paths) + badges/streaks type-fix + tests
- [x] 05.9-07-PLAN.md — Behavior approve/reject server actions + approval queue + DailyModal behavior section + approval test
- [x] 05.9-08-PLAN.md — Kid day-fill: data-driven grade input (string) + propose-a-tag picker; BulkModal type-only fix
- [ ] 05.9-09-PLAN.md — Settings CoinsRulesTab: preset cards + diff-preview + grade-scale editor + mount managers/queue
- [x] 05.9-10-PLAN.md — Onboarding preset picker (replaces StepCoinRules) + server-side completeOnboarding (RLS fix)

### Phase 5.10: automation
**Goal**: The routine runs itself — allowance, small approvals and reminders need no parent action
**Depends on**: Phase 5.5
**Success Criteria** (what must be TRUE):
  1. Scheduled allowance credits coins per family schedule via cron (idempotent per period)
  2. Purchases under a per-child trust limit auto-approve; the parent sees them in the journal
  3. Reminders derive from the schedule (upcoming section training, day not filled by evening, streak about to expire)

**Plans:** 4/4 plans complete
Plans:
- [x] 05.10-01-PLAN.md — Migration (trust_limit + allowance columns) [BLOCKING] + trust-limit auto-approve engine & journal label (SC2)
- [x] 05.10-02-PLAN.md — Smart reminders daily cron route (3 types, child-targeted) + forward-looking streak-at-risk helper (SC3)
- [x] 05.10-03-PLAN.md — Allowance crediting folded into daily cron (idempotent per period) + isoWeekKey + vercel.json schedule (SC1)
- [x] 05.10-04-PLAN.md — Per-child trust-limit + allowance settings cards + clamped parent server actions + en/ru i18n (SC1/SC2)

### Phase 5.11: legacy-cleanup
**Goal**: One UI remains; the brand is consistent everywhere
**Depends on**: Phases 5.7, 5.8
**Success Criteria** (what must be TRUE):
  1. Legacy routes (`/dashboard`, `/wallet`, `/analytics`, `/wallboard`, `/expenses`, `/settings`, `/streaks`, `/records`, `/audit`, `/coach-rating`) redirect to kid/parent-center equivalents; their page code is deleted
  2. `globals.css` shrinks to reset + genuinely shared utilities (no legacy page classes)
  3. App icon, splash and manifest carry FamilyCoins branding

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
| 4.3 localization | 4/6 | In Progress|  | - |
| 4.4 security-compliance | 5/5 | Complete   | 2026-05-17 | - |
| 4.5 desktop | 2/4 | In Progress|  | - |
| 5.1 launch-prep | v5.0 | 6/6 | Complete | 2026-07-06 |
| 5.2 room-tasks | v5.0 | 6/6 | Complete | 2026-07-07 |
| 5.3 design-tokens | v5.0 | 3/3 | Complete | 2026-07-07 |
| 5.4 streak-settings | v5.0 | 3/3 | Complete | 2026-07-07 |
| 5.5 year-calendar | v5.0 | 7/7 | Complete | 2026-07-13 |
| 5.6–5.11 | v5.0 Flexibility & Design | 0/? | Planned | - |
| 6.1–6.3 | v6.0 Monetization | 0/? | Planned | - |
| 7.1–7.3 | v7.0 Social | 0/? | Planned | - |
| 8.1–8.3 | v8.0 Native Apps | 0/? | Planned | - |

---

*Created: 2026-03-01. Updated: 2026-07-05 — Inserted milestone v5.0 Flexibility & Design Unification (11 phases, de-hardcoding first, design contract artifact); Monetization/Social/Native shifted to v6.0/v7.0/v8.0.*
