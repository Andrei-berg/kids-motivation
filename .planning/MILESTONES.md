# Milestones

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
