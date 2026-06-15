# Design Decisions

## Architecture
- Two separate UIs: Parent Center (dark theme) + Kid Screen (bright theme)
- Like Duolingo Family + ClassDojo + GoHenry approach
- Backend stays (lib/, Supabase tables, Google Auth)
- New pages from scratch, old pages deleted after

## Users
- App is for any family with children of any age
- Each family member has Google account
- Parent role: full control, data entry
- Child role: read-only, sees only own data

## Parent Center (/parent)
- Dashboard with child cards, activity feed
- Daily input (DailyModal)
- Reward and Penalty buttons (penalty for lying)
- Wallets, Analytics, Expenses, Shop management, Settings

## Kid Screen (/kid)
- Child sees ONLY their own data, never siblings
- My Day: progress bar, today's results, streak
- Wallet: balance, goals, history (no withdraw)
- Achievements: badges, streaks, level, XP
- Shop: buy rewards → request sent to parent for approval
- Leaderboard: only place to see siblings

## Rules
- Parent enters all data, child is read-only
- Shop purchases require parent approval
- Real rewards + virtual rewards in shop

## Updates (post-MVP)
- Auth: parents use email/password; children use a family code + 4-digit PIN
  (synthetic Supabase Auth user), not personal Google accounts.
- Children now **fill their own day** (`KidDayFillForm`) — no longer strictly
  read-only. Behaviour coins remain a parent-only award.
- All coin/money mutations run **server-side** (service-role); the money tables
  are RLS SELECT-only for clients. Coin awards are recomputed from saved data and
  are idempotent. See `project-docs/security-model.md`.
- Expenses are a parent feature: per-child tab in ChildProfile + a global
  "Расходы" screen (CRUD + categories).
