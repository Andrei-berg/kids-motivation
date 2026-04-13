# Roadmap: FamilyCoins

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Milestones

- ✅ **v1.0 Foundation** — Phases 1.1–1.4 (shipped 2026-03-08)
- ✅ **v2.0 Role-Based UI** — Phases 2.1–2.6 (shipped 2026-04-13)
- 📋 **v3.0 Communication** — Phases 3.1–3.3 (planned)
- 📋 **v4.0 PWA Polish** — Phases 4.1–4.4 (planned)
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

---

## Current Milestone: v3.0 — Communication

**Goal:** Make the family experience alive with real-time chat, push notifications for key events, and media sharing.

### Phase 3.1: notifications

**Goal:** Family members receive push notifications for achievements, task confirmations, and wallet events.

**Requirements:** REQ-SCH-004, REQ-SCH-005, REQ-SCH-006

**Success Criteria:**
1. Push notification sent when parent confirms task
2. Push notification sent when badge earned
3. Push notification sent when wallet credited
4. "Medal of the day" message from parent with coins
5. Notification opens correct screen in app

---

### Phase 3.2: family-chat

**Goal:** Real-time family group chat with reactions and stickers. Achievement events auto-post to chat.

**Requirements:** REQ-CHT-001, REQ-CHT-002, REQ-CHT-003, REQ-CHT-004, REQ-CHT-005, REQ-CHT-006

**Success Criteria:**
1. Family group chat works in real-time (Supabase Realtime)
2. Message reactions (❤️ 👍 🔥 🏆) work
3. Basic sticker pack included
4. Badge earned → auto-message in family chat
5. Parent can send "Medal of the Day" with bonus coins

---

### Phase 3.3: media-voice

**Goal:** Photos and voice messages in family chat. Photo proof of task completion.

**Requirements:** REQ-CHT-007, REQ-CHT-008, REQ-DAY-012

**Success Criteria:**
1. Photo can be sent in chat (Supabase Storage)
2. Voice message can be recorded and played
3. Child can attach photo as task completion proof
4. Parent sees photo when reviewing task

---

## Planned Milestones

### v4.0 — PWA Polish

- [ ] **Phase 4.1: pwa** — Install on iPhone/Android, Web Push when closed, basic offline
- [ ] **Phase 4.2: ux-animations** — Skeleton loaders, Framer Motion transitions, 44px touch targets
- [ ] **Phase 4.3: localization** — Russian + English, auto-detect, i18n files
- [ ] **Phase 4.4: security-compliance** — COPPA/GDPR, account deletion, parent PIN, audit log

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

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1.1 db-schema | v1.0 | 3/3 | ✅ Complete | 2026-03-01 |
| 1.2 onboarding | v1.0 | 5/5 | ✅ Complete | 2026-03-01 |
| 1.3 categories-schedule | v1.0 | 4/4 | ✅ Complete | 2026-03-07 |
| 1.4 dashboard-refactor | v1.0 | 3/3 | ✅ Complete | 2026-03-08 |
| 2.1 role-routing | v2.0 | 2/2 | ✅ Complete | 2026-04-03 |
| 2.2 parent-center | v2.0 | 8/8 | ✅ Complete | 2026-04-04 |
| 2.3 kid-screen | v2.0 | 6/6 | ✅ Complete | 2026-04-05 |
| 2.4 shop-approval | v2.0 | 4/4 | ✅ Complete | 2026-04-08 |
| 2.4.1 kid-screen-v2 | v2.0 | 4/4 | ✅ Complete | 2026-04-10 |
| 2.5 notifications-animations | v2.0 | 4/4 | ✅ Complete | 2026-04-10 |
| 2.6 registration | v2.0 | 4/4 | ✅ Complete | 2026-04-13 |
| 3.1 notifications | v3.0 | 0/? | — Not started | - |
| 3.2 family-chat | v3.0 | 0/? | — Not started | - |
| 3.3 media-voice | v3.0 | 0/? | — Not started | - |
| 4.1–4.4 | v4.0 | 0/? | — Planned | - |
| 5.1–5.3 | v5.0 | 0/? | — Planned | - |
| 6.1–6.3 | v6.0 | 0/? | — Planned | - |
| 7.1–7.3 | v7.0 | 0/? | — Planned | - |

---

*Created: 2026-03-01. Updated: 2026-04-13 — v2.0 Role-Based UI shipped, v3.0 Communication is next.*
