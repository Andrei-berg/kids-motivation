# Roadmap: FamilyCoins

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Milestones

- ✅ **v1.0 Foundation** — Phases 1.1–1.4 (shipped 2026-03-08)
- ✅ **v2.0 Role-Based UI** — Phases 2.1–2.6 (shipped 2026-04-13)
- 🚧 **v3.0 Communication** — Phases 3.1–3.3 (in progress)
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

**Goal:** Make the family experience alive with real-time communication. Parents confirm tasks with personal messages; achievements auto-post to family chat; photos provide task proof.

### Phases

- [x] **Phase 3.1: event-notifications** — Push notifications for task confirmations, badge earnings, wallet events, and Medal of the Day
- [x] **Phase 3.2: family-chat** — Real-time group chat with text messages, emoji reactions, sticker pack, and achievement auto-posts (completed 2026-04-14)
- [ ] **Phase 3.3: photos** — Photo attachments in chat and photo proof on task completion

## Phase Details

### Phase 3.1: event-notifications
**Goal**: Children and parents receive timely push notifications for every meaningful event — task confirmed, badge earned, wallet credited, Medal of the Day sent
**Depends on**: Phase 2.5 (existing Web Push + cron infrastructure)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04
**Success Criteria** (what must be TRUE):
  1. Child receives a push notification when parent confirms a task in the parent dashboard
  2. Child receives a push notification when a badge is awarded after day save
  3. Child receives a push notification when coins are credited or deducted from wallet
  4. Parent can compose and send a Medal of the Day — a personal message with bonus coins — and child receives a push notification with the message text and coin amount
  5. Tapping any notification opens the correct app screen (task confirmation → /kid/day, badge → /kid/achievements, wallet → /kid/wallet, medal → /kid/day)
**Plans**: 3 plans

Plans:
- [x] 3.1-01: Push trigger for purchase approval (NOTIF-01) — notifyChild helper + approvePurchase hook (completed 2026-04-13)
- [x] 3.1-02: Push triggers for badge + wallet events (NOTIF-02, NOTIF-03) — hook into badge award and wallet credit/debit flows (completed 2026-04-13)
- [x] 3.1-03: Medal of the Day feature (NOTIF-04) — parent UI to compose medal, DB storage, push delivery, kid view (completed 2026-04-13)

### Phase 3.2: family-chat
**Goal**: Every family member can send and read messages in a shared real-time group chat; achievements auto-announce themselves; reactions and stickers make the chat feel alive
**Depends on**: Phase 3.1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. Any family member (parent or child) can send a text message and all other family members see it appear in under 2 seconds without refreshing
  2. Any family member can tap a reaction (❤️ 👍 🔥 🏆) on any message and the reaction count updates in real time for everyone
  3. Any family member can open a sticker picker and send a sticker from the predefined pack; it renders as an image in the chat thread
  4. When a child earns a badge, hits a streak milestone, or receives wallet coins, an auto-post appears in family chat describing the event
**Plans**: 4 plans

Plans:
- [x] 3.2-01-db-schema-PLAN.md — chat_messages table, RLS, Realtime publication, TypeScript types and repo (completed 2026-04-14)
- [x] 3.2-02-chat-ui-PLAN.md — ChatThread + SendBox components, /parent/chat and /kid/chat pages, nav entries (completed 2026-04-14)
- [x] 3.2-03-reactions-stickers-PLAN.md — chat_reactions table, MessageReactions component, StickerPicker with 12 emoji stickers (completed 2026-04-14)
- [ ] 3.2-04-achievement-autoposts-PLAN.md — postSystemMessage hook in badge award, wallet coin credit, and streak milestone events

### Phase 3.3: photos
**Goal**: Family members can share photos in chat and children can attach photo proof when completing tasks
**Depends on**: Phase 3.2
**Requirements**: PHOTO-01, PHOTO-02
**Success Criteria** (what must be TRUE):
  1. Any family member can attach a photo to a chat message; the photo is compressed on the client before upload and renders inline in the chat thread
  2. Child can take or select a photo when marking a task complete in the day-fill form; the photo is stored as task proof
  3. Parent sees the task proof photo in the task confirmation view before approving or rejecting the task
**Plans**: 3 plans

Plans:
- [ ] 3.3-01: Photo upload to Supabase Storage — client-side compression, storage bucket policy, signed URL delivery
- [ ] 3.3-02: Photo messages in chat (PHOTO-01) — attach button in chat send box, image render in thread
- [ ] 3.3-03: Task photo proof (PHOTO-02) — photo attach in kid day-fill form, proof display in parent confirmation view

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
| 3.2 family-chat | 4/4 | Complete    | 2026-04-14 | - |
| 3.3 photos | v3.0 | 0/3 | Not started | - |
| 4.1–4.4 | v4.0 | 0/? | Planned | - |
| 5.1–5.3 | v5.0 | 0/? | Planned | - |
| 6.1–6.3 | v6.0 | 0/? | Planned | - |
| 7.1–7.3 | v7.0 | 0/? | Planned | - |

---

*Created: 2026-03-01. Updated: 2026-04-14 — Phase 3.2 plans 3.2-01, 3.2-02, 3.2-03 complete. Reactions + sticker pack verified end-to-end.*
