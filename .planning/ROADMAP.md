# ROADMAP.md

> Universal family motivation app. PWA-first → Native Apps → Scale.
> Strategy: Each milestone delivers a shippable product for real families.

---

## Current Milestone: M1 — Foundation

**Version:** 1.0.0
**Goal:** Rebuild architecture for universal multi-tenant use. Any family in the world can register and start using the app.

### Progress

- [x] **Phase 1.1: db-schema** — New DB with families, RLS, Auth, data migration (completed 2026-03-01)
- [x] **Phase 1.2: onboarding** — Registration, family creation, adding children (completed 2026-03-01)
- [ ] **Phase 1.3: categories-schedule** — Flexible categories, schedule, push notifications
- [ ] **Phase 1.4: dashboard-refactor** — Remove all hardcodes, adapt UI

---

## Phases — Milestone 1: Foundation

### Phase 1.1: db-schema

**Goal:** New multi-tenant Supabase schema with families table, Row Level Security, Supabase Auth, and migration of existing adam/alim data.

**Requirements:** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-004, REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-007, REQ-AUTH-008, REQ-FAM-001, REQ-FAM-002, REQ-FAM-003, REQ-FAM-004, REQ-FAM-005, REQ-FAM-007, REQ-FAM-013, REQ-SEC-001, REQ-SEC-005

**Plans:** 3/3 plans complete

Plans:
- [ ] 01.1-01-PLAN.md — SQL schema: new identity tables (families, family_members, user_profiles), RLS policies, and adam/alim data migration
- [ ] 01.1-02-PLAN.md — Supabase client refactor: install @supabase/ssr, create browser/server/middleware client factories
- [ ] 01.1-03-PLAN.md — Route guard: middleware.ts (auth + family check) and app/auth/callback/route.ts (OAuth handler)

**Success Criteria:**
1. New tables created: families, family_members, user_profiles
2. All existing tables have family_id column
3. RLS policies on every table — family A cannot see family B data
4. Supabase Auth enabled (email + Google)
5. Migration script preserves adam/alim data
6. middleware.ts redirects unauthenticated users to /login

---

### Phase 1.2: onboarding

**Goal:** New user can register, create a family, add children, and be ready to use the app within 3 minutes.

**Requirements:** REQ-ONB-001, REQ-ONB-002, REQ-ONB-003, REQ-ONB-004, REQ-ONB-005, REQ-ONB-006, REQ-ONB-007, REQ-ONB-008, REQ-ONB-009, REQ-ONB-010, REQ-FAM-008, REQ-FAM-009, REQ-FAM-010

**Plans:** 5/5 plans complete

Plans:
- [x] 01.2-01-PLAN.md — Schema patch (onboarding_step column, avatars Storage bucket) + lib/onboarding-api.ts type contracts
- [x] 01.2-02-PLAN.md — /login and /register pages with Google OAuth + email/password auth
- [x] 01.2-03-PLAN.md — Onboarding wizard steps 1-5 (welcome, profile, family, add child, invite parent)
- [x] 01.2-04-PLAN.md — Onboarding wizard steps 6-7 (categories, done + confetti) — full wizard end-to-end
- [ ] 01.2-05-PLAN.md — Child join flow at /onboarding/join + middleware redirect fix

**Success Criteria:**
1. /login and /register pages work
2. /onboarding flow: welcome → profile → family → add children → categories → done
3. Child can join family by entering 6-digit invite code
4. Progress bar visible on each step
5. Family data stored in DB and isolated by RLS

---

### Phase 1.3: categories-schedule

**Goal:** Parents can configure flexible activity categories and a weekly schedule with push reminder notifications for each child.

**Requirements:** REQ-CAT-001, REQ-CAT-002, REQ-CAT-003, REQ-CAT-004, REQ-CAT-005, REQ-CAT-006, REQ-CAT-007, REQ-SCH-001, REQ-SCH-002, REQ-SCH-003, REQ-SCH-004, REQ-SCH-005

**Success Criteria:**
1. Parent can create/edit/delete categories
2. Default categories load on family creation (Study, Home, Sport, Routine)
3. Weekly schedule editor works per child
4. Push reminder fires at configured time
5. Settings page shows categories + schedule management

---

### Phase 1.4: dashboard-refactor

**Goal:** Dashboard and all pages work dynamically — no hardcoded 'adam'/'alim', data loaded from authenticated family context.

**Requirements:** REQ-FAM-010, REQ-FAM-011, REQ-UX-001, REQ-SEC-002

**Success Criteria:**
1. Zero occurrences of hardcoded 'adam' or 'alim' in TypeScript files
2. NavBar loads children list dynamically from DB
3. Zustand store uses UUID childId and familyId
4. All pages use auth guard (redirect if not logged in)
5. Dashboard shows correct data for authenticated user's family

---

## Phases — Milestone 2: Core Loop

### Phase 2.1: coins-engine

**Goal:** Flexible coin rules engine where parents configure rewards/penalties per category. Coins auto-calculated on task confirmation.

**Requirements:** REQ-DAY-001, REQ-DAY-008, REQ-DAY-009, REQ-DAY-010, REQ-DAY-011, REQ-DAY-013, REQ-COIN-001, REQ-COIN-002, REQ-COIN-003, REQ-COIN-004, REQ-COIN-005, REQ-COIN-006, REQ-COIN-007, REQ-COIN-008, REQ-COIN-009, REQ-COIN-010, REQ-COIN-011

**Success Criteria:**
1. Parent can configure coin amounts per category (not hardcoded)
2. Child marks task as done — parent confirms — coins added automatically
3. Streak bonuses fire at correct thresholds
4. Manual bonus/penalty from parent works
5. Full transaction history available

---

### Phase 2.2: wallet-shop

**Goal:** Every child has a personal wallet. Parents create shop items. Children buy items. P2P transfers between siblings work.

**Requirements:** REQ-DAY-002, REQ-DAY-003, REQ-DAY-004, REQ-DAY-005, REQ-DAY-006, REQ-DAY-007, REQ-WAL-001, REQ-WAL-002, REQ-WAL-003, REQ-WAL-004, REQ-WAL-005, REQ-WAL-006, REQ-SHOP-001, REQ-SHOP-002, REQ-SHOP-003, REQ-SHOP-004, REQ-SHOP-005, REQ-SHOP-006, REQ-SHOP-007, REQ-SHOP-008

**Success Criteria:**
1. Wallet balance visible, updates in real-time
2. Parent creates shop item → child sees it → buys → parent approves
3. P2P transfer between children in same family works
4. Coin-to-money exchange at parent-defined rate works
5. Transaction history shows all operations

---

### Phase 2.3: badges-achievements

**Goal:** Badges awarded automatically. XP and levels visible. Achievement showcase in child profile.

**Requirements:** REQ-STR-001, REQ-STR-002, REQ-STR-003, REQ-STR-004, REQ-BAD-001, REQ-BAD-002, REQ-BAD-003, REQ-BAD-004, REQ-BAD-005, REQ-BAD-006

**Success Criteria:**
1. Minimum 10 badges defined
2. Badge awarded automatically when condition met
3. Badge award animation shown to child
4. Streaks display current + best record
5. XP + level visible on child profile

---

### Phase 2.4: analytics

**Goal:** Child sees personal progress charts. Parent sees all children at a glance. 8 weeks of history available.

**Requirements:** REQ-ANL-001, REQ-ANL-002, REQ-ANL-003, REQ-ANL-004, REQ-ANL-005, REQ-ANL-006

**Success Criteria:**
1. 8-week coin progress chart works for any child
2. Grade distribution pie chart works
3. KPI cards: best week, average grade, total coins
4. Parent view shows all children in one screen
5. Analytics work without finalization (raw data)

---

## Phases — Milestone 3: Communication

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

## Phases — Milestone 4: PWA Polish

### Phase 4.1: pwa

**Goal:** App installs on iPhone and Android from browser. Web Push notifications work. Basic offline support.

**Requirements:** REQ-PWA-001, REQ-PWA-002, REQ-PWA-003, REQ-PWA-004, REQ-PWA-005, REQ-PWA-006

**Success Criteria:**
1. manifest.json and Service Worker configured
2. App installs on iPhone via Safari → Add to Home Screen
3. App installs on Android via Chrome
4. App icon and splash screen display correctly
5. Web Push notifications work when app is closed
6. Dashboard loads from cache when offline

---

### Phase 4.2: ux-animations

**Goal:** Smooth animations throughout. Skeleton loaders. Coin award animation. Mobile-optimized touch targets.

**Requirements:** REQ-UX-001, REQ-UX-002, REQ-UX-003, REQ-UX-004, REQ-UX-005

**Success Criteria:**
1. All data-loading states show skeleton loaders
2. Coin award shows animation (number flies up)
3. Badge award shows full-screen celebration
4. All buttons/taps have minimum 44px touch target
5. Page transitions are smooth (Framer Motion)

---

### Phase 4.3: localization

**Goal:** App fully available in Russian and English. Language auto-detected, manually switchable.

**Requirements:** REQ-UX-007

**Success Criteria:**
1. All UI strings in i18n files (ru/en)
2. Language auto-detected from browser/device
3. Language switcher in settings
4. Dates, numbers formatted per locale

---

### Phase 4.4: security-compliance

**Goal:** COPPA compliant. GDPR compliant. Account deletion works. Parent PIN for settings.

**Requirements:** REQ-SEC-002, REQ-SEC-003, REQ-SEC-004, REQ-SEC-005, REQ-SEC-006

**Success Criteria:**
1. Account + all data deletion flow works
2. Privacy policy page exists
3. Parent PIN protects settings/wallet sections
4. No child data in public URLs or logs
5. Audit log tracks important parent actions

---

## Phases — Milestone 5: Monetization

### Phase 5.1: freemium-limits

**Goal:** Free plan enforces limits. Paywall shown clearly when limit reached. Premium badge visible.

**Requirements:** REQ-MON-001, REQ-MON-006

**Success Criteria:**
1. Free plan: max 2 children, 3 categories, 5 shop items
2. Paywall shows when limit hit
3. Paywall is clear and non-aggressive
4. Premium users have no limits

---

### Phase 5.2: stripe-subscription

**Goal:** Stripe Checkout accepts payment. Premium activates automatically. Subscription manageable in-app.

**Requirements:** REQ-MON-002, REQ-MON-003, REQ-MON-004, REQ-MON-005

**Success Criteria:**
1. Stripe Checkout opens from paywall
2. 30-day trial starts for new families
3. Payment succeeds → Premium activates via webhook
4. User can cancel subscription in settings
5. Expired subscription gracefully downgrades to free

---

### Phase 5.3: referral-program

**Goal:** Every family has a unique referral link. Successful referrals earn 1 free premium month.

**Requirements:** REQ-MON-007

**Success Criteria:**
1. Referral link generated per family
2. Referred family registers → referrer gets 1 month premium
3. Referral stats visible in settings
4. Share buttons: WhatsApp, copy link

---

## Phases — Milestone 6: Social

### Phase 6.1: family-friendship

**Goal:** Families can add each other as friends. Parent approves all friendship requests.

**Requirements:** REQ-SOC-001, REQ-SOC-005

**Success Criteria:**
1. Family search by invite code works
2. Friend request sent → receiving parent approves
3. Friends list visible in settings
4. No child data exposed to non-friend families

---

### Phase 6.2: challenges

**Goal:** Friend families can create joint 7-day challenges and see a leaderboard.

**Requirements:** REQ-SOC-002, REQ-SOC-003

**Success Criteria:**
1. Parent creates challenge with friend family
2. Leaderboard updates daily
3. Leaderboard anonymizable (show family name only)
4. Winner notified at challenge end

---

### Phase 6.3: templates-library

**Goal:** Families can share shop item templates and category configurations publicly.

**Requirements:** REQ-SOC-004

**Success Criteria:**
1. Family can publish shop item as community template
2. Browse and import templates in shop settings
3. Category templates shareable same way
4. Imported templates editable

---

## Phases — Milestone 7: Native Apps

### Phase 7.1: expo-react-native

**Goal:** Expo monorepo with shared business logic between Next.js web and React Native mobile.

**Success Criteria:**
1. Monorepo structure: apps/web + apps/mobile + packages/core
2. Business logic (coins, streaks, badges) in packages/core
3. Mobile app builds and runs on iOS simulator
4. Supabase auth works in mobile app

---

### Phase 7.2: app-store

**Goal:** App published on Apple App Store. Passes review. Available for download.

**Success Criteria:**
1. TestFlight beta with 10+ testers
2. App Store listing with screenshots and description
3. Passes App Review (especially children's content guidelines)
4. Live on App Store

---

### Phase 7.3: google-play

**Goal:** App published on Google Play Store. Passes review. Available for download.

**Success Criteria:**
1. Internal → Closed testing completed
2. Play Store listing complete
3. Passes content rating review
4. Live on Google Play

---

*Document created: 2026-03-01. Version 1.0.*
