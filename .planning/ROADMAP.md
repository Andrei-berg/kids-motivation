# Roadmap: FamilyCoins

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Milestones

- ✅ **v1.0 Foundation** — Phases 1.1–1.4 (shipped 2026-03-08)
- ✅ **v2.0 Role-Based UI** — Phases 2.1–2.6 (shipped 2026-04-13)
- ✅ **v3.0 Communication** — Phases 3.1–3.3 (shipped 2026-04-26)
- 📋 **v4.0 PWA Polish** — Phases 4.1–4.5 (planned)
- 📋 **v5.0 Monetization** — Phases 5.1–5.3 (planned)
- 📋 **v6.0 Social** — Phases 6.1–6.3 (planned)
- 📋 **v7.0 Native Apps** — Phases 7.1–7.3 (planned)

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
**Plans**: TBD

---

### v5.0 — Monetization

- [ ] **Phase 5.1: freemium-limits** — Free plan limits (2 children, 3 categories, 5 shop items), paywall
- [ ] **Phase 5.2: stripe-subscription** — Stripe Checkout, 30-day trial, webhook activation, cancel flow
- [ ] **Phase 5.3: referral-program** — Unique referral link, +1 month premium per successful referral

### v6.0 — Social

- [ ] **Phase 6.1: family-friendship** — Friend families via invite code, parent approval, privacy guard
- [ ] **Phase 6.2: challenges** — Joint 7-day challenges with friend families, daily leaderboard
- [ ] **Phase 6.3: templates-library** — Share/import shop items and category templates

### v7.0 — Native Apps

- [ ] **Phase 7.1: expo-react-native** — Expo monorepo, shared packages/core, iOS simulator
- [ ] **Phase 7.2: app-store** — TestFlight, App Store listing, Apple review, live
- [ ] **Phase 7.3: google-play** — Internal → closed testing, Play Store listing, live

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
| 4.5 desktop | v4.0 | 0/? | Not started | - |
| 5.1–5.3 | v5.0 | 0/? | Planned | - |
| 6.1–6.3 | v6.0 | 0/? | Planned | - |
| 7.1–7.3 | v7.0 | 0/? | Planned | - |

---

*Created: 2026-03-01. Updated: 2026-05-17 — Phase 4.4 planned: 5 plans covering DB foundation, audit instrumentation, audit screen, data export + account deletion, and COPPA consent gate.*
