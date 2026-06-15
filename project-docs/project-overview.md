# Project Overview — KidsCoins (working title)

> **Mission:** Help every family raise responsible, active, motivated children — through a transparent earned-rewards system that works like the real world, not a casino.

## Philosophy

Children don't just receive rewards — they earn them. The app models adult life in a format children understand:
- You have responsibilities → you fulfill them → you earn coins → you spend them on what you want
- Laziness or dishonesty → penalties → fewer opportunities
- Effort and discipline → streaks, badges, more coins → real rewards

**This is not a game.** It's preparation for life, wrapped in an interface children want to open every day.

## Target Users

- **Parents** (25–45) — want to build discipline and responsibility without constant conflict
- **Children** (5–17) — want to earn freedom and prizes, see their progress
- Extended family — grandparents, coaches as secondary participants

## Core Features

| Feature | Description |
|---|---|
| Family & Accounts | Email/Google/Apple auth, multi-child, roles: parent/child/extended |
| Categories & Tasks | Flexible: Study, Home, Sport, Routine, Behavior, Custom |
| Daily Input | DailyModal: grades, room check, behavior, sport, sections |
| Coins Engine | Earn/penalty rules, configurable per family |
| Wallet & Shop | Child wallet, parent-created shop, P2P transfers (mutations server-side) |
| Expenses | Parent tracks money spent on each child by category (per-child + family-wide) |
| Streaks & Badges | Automatic achievement system |
| Analytics | Child dashboard + parent overview |
| Family Chat | Real-time (Supabase Realtime), reactions, stickers |

## Monetization

- **Free**: 1 family, 2 children, 5 shop items, 3 categories
- **Premium**: $4.99/month or $39.99/year — unlimited everything + advanced analytics + push + chat

## Scale Goals

- MVP beta: 5,000 families (existing community)
- Year 1: 50,000 families
- Year 3: 500,000+ families, international

## Current Status

Milestones 1–4 delivered (foundation, core loop, communication, PWA polish):
multi-tenant DB + Auth, onboarding, parent-center + kid screens, wallet/shop,
streaks/badges, family chat, PWA, i18n, COPPA consent. See `.planning/STATE.md`
for the authoritative phase status.

**2026-06-15 — security + expenses pass:**
- Closed pre-launch security blockers and a critical anonymous-access RLS hole
  (30 tables); all wallet/money mutations moved server-side (service-role) with
  money tables RLS-locked to SELECT for clients.
- Functional fixes: UTC-date bug (UTC+3 helper), cron no-op, withdrawal
  double-spend; ESLint configured.
- New: parent **Expenses** UI (per-child tab + global screen, CRUD + categories).
