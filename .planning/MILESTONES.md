# Milestones

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
