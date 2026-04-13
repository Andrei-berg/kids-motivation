# Retrospective

---

## Milestone: v2.0 — Role-Based UI

**Shipped:** 2026-04-13
**Phases:** 7 | **Plans:** 32 | **Commits:** 142

### What Was Built

1. Role-based routing with middleware guards (parents→/parent, children→/kid)
2. Parent Center — dark-theme control panel with daily input, wallets, analytics, shop, PIN-protected settings
3. Kid Screen — bright gamified experience with My Day, wallet, achievements (10+ badges, streaks, XP), shop, leaderboard
4. Shop approval flow — freeze-then-approve purchase requests with parent dashboard panel
5. Kid Screen v2 — weekly calendar strip, kid day-fill form (room/mood/activities with live coin counter), expenses tab
6. Notifications & animations — cron-based reminders + missed-task alerts, coin fly-up, confetti badge celebrations
7. Complete registration — 5-step onboarding wizard + child PIN login (family code → name → PIN → /kid/day)

### What Worked

- **Incremental role split**: Building /parent/* and /kid/* as parallel tracks (never touching old pages until ready) meant zero regressions mid-milestone
- **GSD phase planning**: Having each phase's success criteria written before execution caught scope creep early (2.4.1 was inserted mid-milestone to address kid UX gaps)
- **Supabase RLS as the single security boundary**: All security enforced at DB level — middleware is a UX redirect, not a security gate. This pattern eliminated whole classes of bugs
- **Live coin counter in day-fill form**: Implemented incrementally in the form component — immediate feedback made the feature feel polished without extra effort

### What Was Inefficient

- **ROADMAP checkbox drift**: Plan checkboxes in ROADMAP.md fell out of sync with actual disk state — gsd-tools had to use disk presence of SUMMARY.md files as the source of truth
- **Phase 2.4 plan count mismatch**: ROADMAP progress table showed 3/4 but disk had 4/4 — STATE.md updates lagged behind execution
- **Child PIN complexity**: Went through 3 plan revisions (iterations 1–3) before finalizing the synthetic email approach — earlier spike on Supabase constraints would have saved two revision cycles

### Patterns Established

- Synthetic email pattern for passwordless child auth: `child_{childId}@internal.familycoins.app` + PIN as password
- KidLayout reads `family_members.child_id` directly (not via store) for O(1) auth→child resolution
- Parent settings uses SHA-256 PIN hash in localStorage (not DB) — fast, zero latency, no RLS complexity
- `kid_fill_mode` integer enum on `children` table controls parent/kid fill permissions per child

### Key Lessons

- **Plan the auth edge cases first**: The child PIN approach was discovered late. For v3.0, any new auth flow (e.g., family invite links) should be spiked in the planning phase, not mid-execution
- **Mark ROADMAP checkboxes at commit time**: Discipline around updating `[ ]` → `[x]` in the same commit as the feat() commit keeps state consistent
- **Insert decimal phases early**: 2.4.1 was inserted after 2.4 was already planned. Better to identify kid-screen gaps during 2.3 verification and plan 2.4.1 at that point

### Cost Observations

- Model mix: primarily sonnet for execution, opus for planning phases
- Sessions: ~15 sessions across 10 days
- Notable: Phase 2.2 (parent-center) had 8 plans vs. the originally planned 6 — real implementation surface was larger than estimated for complex CRUD UI

---

## Cross-Milestone Trends

| Milestone | Duration | Phases | Plans | Commits | Key Risk |
|-----------|----------|--------|-------|---------|----------|
| v1.0 Foundation | ~7 days | 4 | 15 | ~60 | Schema migration |
| v2.0 Role-Based UI | 10 days | 7 | 32 | 142 | Auth edge cases |
| v3.0 Communication | TBD | 3 | TBD | TBD | Realtime complexity |

**Trend:** Plan count per phase is growing (~4.5 avg in v2.0 vs. ~3.75 in v1.0) — richer features require more granular breakdown. This is expected and healthy.
