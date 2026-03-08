# Data Model Summary

## Identity (multi-tenant, Phase 1.1+)
```
auth.users → user_profiles (display_name, onboarding_step)
           → family_members (family_id, user_id, role: parent|child|extended)
           → families (name, invite_code, created_by)
```

## New Tables (family_id scoped, full RLS)
| Table | Key Fields |
|---|---|
| categories | family_id, name, icon, type, is_active |
| tasks | family_id, category_id, child_member_id, coins_reward |
| schedule_items | family_id, child_member_id, type, day_of_week[] |
| push_subscriptions | family_id, member_id, subscription JSONB |

## Legacy Tables (child_id TEXT, limited RLS)
| Table | Key Fields |
|---|---|
| children | id TEXT ('adam'/'alim'), name, xp, level |
| days | child_id, date, room_ok, good_behavior |
| subject_grades | child_id, date, subject, grade(1-5) |
| home_sports | child_id, date, running/exercises/etc |
| wallet | child_id PK, coins, money |
| wallet_transactions | child_id, transaction_type, coins_change |
| rewards | id, title, reward_type, price_coins |
| reward_purchases | reward_id, child_id, fulfilled |
| coin_exchanges | child_id, coins_amount, money_amount |
| streaks | child_id, streak_type, current_count, best_count |
| badges | child_id, badge_key, earned_at |
| goals | child_id, title, target, current |
| weeks | child_id, week_start, total, finalized |
| expenses | child_id, amount, category_id, date |
| sections | child_id, name, cost, trainer |
| subjects | child_id, name, active |
| schedule | child_id, day_of_week, lesson_number |
| settings | key, value (global config) |

## RLS Pattern
```sql
-- All new tables use this helper
SELECT family_id FROM family_members WHERE user_id = auth.uid()
-- Via: get_my_family_ids() SECURITY DEFINER function
```

## Critical IDs
- `family_id` — UUID, families.id
- `activeMemberId` — UUID, family_members.id (used in all new code)
- `childId` — TEXT 'adam'/'alim' (legacy, avoid in new code)
