# Product Requirements — Functional Requirements

> Format: REQ-[category]-[number] | P1=critical | P2=important | P3=nice-to-have
> Source: .planning/REQUIREMENTS.md (108 requirements total)

## AUTH — Authentication & Accounts

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-AUTH-001 | Registration via email + password | P1 | M1 |
| REQ-AUTH-002 | Login via Google OAuth | P1 | M1 |
| REQ-AUTH-003 | Login via Apple ID | P2 | M1 |
| REQ-AUTH-004 | Password recovery via email | P1 | M1 |
| REQ-AUTH-005 | Session persists between opens | P1 | M1 |
| REQ-AUTH-006 | Logout with session clear | P1 | M1 |
| REQ-AUTH-007 | Route protection — unauthenticated → /login | P1 | M1 |
| REQ-AUTH-008 | Middleware redirects to onboarding if no family | P1 | M1 |

## FAMILY — Family & Members

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-FAM-001 | Create family (name, avatar) | P1 | M1 |
| REQ-FAM-002 | Unique 6-digit invite code per family | P1 | M1 |
| REQ-FAM-003 | Join family by code | P1 | M1 |
| REQ-FAM-004 | Roles: parent / child / extended | P1 | M1 |
| REQ-FAM-005 | Unlimited children | P1 | M1 |
| REQ-FAM-006 | Unlimited parents | P2 | M1 |
| REQ-FAM-007 | Each family member — separate account | P1 | M1 |
| REQ-FAM-008 | Child joins via separate account | P1 | M1 |
| REQ-FAM-009 | Child profile: name, age, avatar (emoji or photo) | P1 | M1 |
| REQ-FAM-010 | Parent sees all children, child sees only themselves | P1 | M1 |
| REQ-FAM-011 | Remove family member (parent only) | P2 | M1 |
| REQ-FAM-013 | RLS — family A cannot see family B data | P1 | M1 |

## ONBOARD — Onboarding

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-ONB-001 | Welcome screen with philosophy description | P1 | M1 |
| REQ-ONB-002 | Progress bar per step (1 of 5) | P2 | M1 |
| REQ-ONB-003 | Step: create parent profile (name, role) | P1 | M1 |
| REQ-ONB-004 | Step: create family (name) | P1 | M1 |
| REQ-ONB-005 | Step: add first child | P1 | M1 |
| REQ-ONB-006 | Step: invite second parent (skip) | P2 | M1 |
| REQ-ONB-007 | Step: select categories (study, home, sport…) | P1 | M1 |
| REQ-ONB-008 | Final screen with confetti | P2 | M1 |
| REQ-ONB-009 | Separate child flow (enter code → select profile) | P1 | M1 |
| REQ-ONB-010 | Skip steps configurable later | P2 | M1 |

## CATEGORIES — Categories & Tasks

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-CAT-001 | Default categories: Study, Home, Sport, Routine | P1 | M1 |
| REQ-CAT-002 | Create custom category (name, icon, coins) | P1 | M1 |
| REQ-CAT-003 | Enable/disable category | P1 | M1 |
| REQ-CAT-005 | Tasks inside categories — create, edit, delete | P1 | M1 |
| REQ-CAT-006 | Task: title, coins, required/optional | P1 | M1 |

## SCHEDULE — Schedule & Reminders

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-SCH-001 | Weekly schedule per child | P1 | M1 |
| REQ-SCH-002 | School lessons by weekday | P1 | M1 |
| REQ-SCH-003 | Sections/clubs with time and address | P1 | M1 |
| REQ-SCH-004 | Push notification: task reminder | P1 | M1 |
| REQ-SCH-005 | Reminder time set per task | P2 | M1 |

## DAILY — Daily Input

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-DAY-001 | DailyModal: sections by active family categories | P1 | M1/M2 |
| REQ-DAY-002 | Study: grade input per subject (1-5) | P1 | M2 |
| REQ-DAY-004 | Room: 5 checkboxes (bed, floor, desk, closet, trash) | P1 | M2 |
| REQ-DAY-005 | Behavior: good/bad flag | P1 | M2 |
| REQ-DAY-006 | Sport: exercise list with count | P1 | M2 |
| REQ-DAY-007 | Sections: attendance + coach rating | P1 | M2 |
| REQ-DAY-008 | Child self-marks task completion | P1 | M2 |
| REQ-DAY-009 | Parent confirms or rejects marks | P1 | M2 |
| REQ-DAY-011 | Coins awarded automatically on confirmation | P1 | M2 |
| REQ-DAY-013 | Batched save — all sections saved in one request | P1 | M2 |

## COINS — Coins & Reward Engine

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-COIN-001 | Coin rules configurable by parent (not hardcoded) | P1 | M2 |
| REQ-COIN-002 | Grade 5→+5, 4→+3, 3→-3, 2→-5, 1→-10 (default) | P1 | M2 |
| REQ-COIN-003 | Room (≥3/5 checkboxes): +3 coins/day | P1 | M2 |
| REQ-COIN-004 | Good behavior: +5 coins/day | P1 | M2 |
| REQ-COIN-005 | Coach rating 5→+10, 4→+5, 3→0, 2→-3, 1→-10 | P1 | M2 |
| REQ-COIN-007 | Streak bonus: 7 days room → +100 coins | P2 | M2 |
| REQ-COIN-008 | Streak bonus: 14 days grades → +100 coins | P2 | M2 |
| REQ-COIN-011 | History of all earn/spend operations | P1 | M2 |

## WALLET — Wallet

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-WAL-001 | Personal wallet per child (coins) | P1 | M2 |
| REQ-WAL-002 | Display coin balance | P1 | M2 |
| REQ-WAL-003 | Transaction history (type, amount, date, reason) | P1 | M2 |
| REQ-WAL-004 | P2P coin transfer between family children | P1 | M2 |
| REQ-WAL-005 | Coin-to-money exchange (rate set by parent) | P2 | M2 |

## SHOP — Shop

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-SHOP-001 | Parent creates shop items | P1 | M2 |
| REQ-SHOP-002 | Item types: virtual, physical, experience, cash | P1 | M2 |
| REQ-SHOP-003 | Child sees shop and picks what to buy | P1 | M2 |
| REQ-SHOP-004 | Purchase: request → parent approve/reject | P1 | M2 |
| REQ-SHOP-007 | Purchase history per child | P1 | M2 |

## STREAKS — Streaks

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-STR-001 | Room streak (consecutive days room_ok) | P1 | M2 |
| REQ-STR-002 | Study streak (consecutive days with grades) | P1 | M2 |
| REQ-STR-003 | Sport streak (consecutive days with sport) | P1 | M2 |
| REQ-STR-004 | Display current streak and record | P1 | M2 |

## BADGES — Badges & Achievements

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-BAD-001 | Minimum 10 badges | P1 | M2 |
| REQ-BAD-002 | Badge awarded automatically on condition met | P1 | M2 |
| REQ-BAD-004 | Badge showcase in child profile | P1 | M2 |

## ANALYTICS — Analytics

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-ANL-001 | Child dashboard: day, week, month | P1 | M2 |
| REQ-ANL-002 | Coins chart by week (8 weeks) | P1 | M2 |
| REQ-ANL-003 | Grade distribution chart | P1 | M2 |
| REQ-ANL-004 | KPIs: best week, average grade, total coins | P1 | M2 |
| REQ-ANL-005 | Parent dashboard: all children at a glance | P1 | M2 |

## SECURITY — Security

| ID | Requirement | Priority | Milestone |
|---|---|---|---|
| REQ-SEC-001 | RLS on all Supabase tables | P1 | M1 |
| REQ-SEC-003 | COPPA compliance (children under 13) | P1 | M4 |
| REQ-SEC-004 | GDPR compliance (data deletion) | P2 | M4 |
| REQ-SEC-005 | No public child profiles | P1 | M1 |

## Statistics

| Priority | Count |
|---|---|
| P1 (critical) | 58 |
| P2 (important) | 38 |
| P3 (nice-to-have) | 12 |
| **Total** | **108** |
