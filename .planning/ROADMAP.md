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
| 6.1–6.3 | v6.0 Monetization | 0/? | Planned | - |
| 7.1–7.3 | v7.0 Social | 0/? | Planned | - |
| 8.1–8.3 | v8.0 Native Apps | 0/? | Planned | - |

---

*Created: 2026-03-01. Updated: 2026-07-23 — v5.0 Flexibility & Design Unification shipped (11 phases, 71 plans); v4.0 PWA Polish formally closed at the same time. Both collapsed to Completed Milestones; full phase details archived to `.planning/milestones/`. No milestone currently in progress — next up is v6.0/v7.0/v8.0 via `/gsd:new-milestone`.*
