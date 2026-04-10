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
