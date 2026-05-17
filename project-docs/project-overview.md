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
| Wallet & Shop | Child wallet, parent-created shop, P2P transfers |
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

## Current Status (2026-03-08)

Milestone 1 (Foundation) complete. 4 phases done:
- Phase 1.1: Multi-tenant DB schema with families, RLS, Supabase Auth
- Phase 1.2: Onboarding flow (registration → family → children)
- Phase 1.3: Flexible categories + schedule + push notifications
- Phase 1.4: Dashboard refactor — all hardcoded adam/alim removed, activeMemberId (UUID) everywhere

**Next: Phase 2.1 — Coin Engine** (flexible, configurable reward system)
