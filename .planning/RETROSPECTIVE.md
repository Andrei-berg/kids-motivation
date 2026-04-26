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

## Milestone: v3.0 — Communication

**Shipped:** 2026-04-26
**Phases:** 3 | **Plans:** 10 | **Timeline:** 13 days (2026-04-13 → 2026-04-26)

### What Was Built

1. `notifyChild` server action — reusable push dispatch wired to purchase approval, badge award, and wallet credit/debit
2. "Medal of the Day" — parent composes personal message + bonus coins; child receives push with deep link
3. Real-time family group chat — ChatThread + SendBox on `/parent/chat` and `/kid/chat` with Supabase Realtime
4. Message reactions + sticker pack — real-time reaction counts (chat_reactions table); StickerPicker with 12 emoji stickers
5. Achievement auto-posts — badge awards, streak milestones (7/14/30), wallet credits post system messages to family chat
6. Photo messages in chat — client-side canvas compression, private Supabase Storage bucket, signed URL delivery, lightbox
7. Task photo proof — camera/gallery capture in kid day-fill; proof thumbnail + lightbox in parent confirmation view

### What Worked

- **Smallest possible Realtime footprint**: Using Supabase Realtime (already in stack, free tier) vs. adding Socket.io meant zero new infra and the chat was live within one plan
- **notifyChild error isolation**: Making push a fire-and-forget pattern (silent swallow) meant push could be added to every business flow without risk of breaking approval/badge/wallet logic
- **Reusing PhotoLightbox across features**: The lightbox component built in plan 3.3-02 (chat photos) was immediately reused in 3.3-03 (task proof) — zero duplication, half the effort
- **Optimistic UI for photos**: Showing local blob URL immediately then replacing with signed URL after upload made the photo send feel instant without extra complexity

### What Was Inefficient

- **ROADMAP checkbox drift continued**: Plan checkboxes for 3.2-04, 3.3-01/02/03 were left unchecked in ROADMAP.md even after completion — same pattern as v2.0
- **Phase 3.1 directory naming inconsistency**: Directory is `3.1-event-notifications` but other v3 phases use `03.2-*` prefix — tools couldn't auto-detect phase 3.1 in roadmap analyze
- **No audit before complete-milestone**: Skipped `/gsd:audit-milestone` — potential integration gaps unknown; acceptable for MVP velocity but should be standard for v4.0+

### Patterns Established

- `notifyChild(childId, title, body, url)` is the canonical push dispatch pattern — all future event notifications reuse it
- Optimistic message insert: local state → replace with server response before Realtime fires (prevents double-render)
- `sender_role='parent'` for system messages satisfies check constraint without needing a new role type
- photo_url stored as signed URL in DB row — simple; revisit when URLs need longer TTL

### Key Lessons

- **Realtime cleanup on unmount is critical**: `subscribeToMessages` returns a cleanup function — callers must call it on unmount or channels leak across navigations. Add to code review checklist
- **Mark ROADMAP checkboxes at commit time**: Still not happening consistently. Consider a git hook or post-plan step that flags unchecked plans
- **Budget an audit phase**: v3.0 shipped without cross-phase integration verification. For v4.0, plan an explicit audit/verify pass before complete-milestone

### Cost Observations

- Model mix: primarily sonnet for execution, sonnet for planning (v3.0 was mostly straightforward execution)
- Sessions: ~8 sessions across 13 days (less dense than v2.0 — smaller milestone)
- Notable: 3 phases with 3–4 plans each is a comfortable cadence; v4.0 has 4 phases of similar density

---

## Cross-Milestone Trends

| Milestone | Duration | Phases | Plans | Key Risk |
|-----------|----------|--------|-------|---------|
| v1.0 Foundation | ~7 days | 4 | 15 | Schema migration |
| v2.0 Role-Based UI | 10 days | 7 | 32 | Auth edge cases |
| v3.0 Communication | 13 days | 3 | 10 | Realtime complexity |

**Trend:** Milestone scope is shrinking (fewer phases/plans per milestone) while feature density per plan is increasing — deeper integrations with existing systems. Plans per phase: v1.0 ~3.75, v2.0 ~4.5, v3.0 ~3.3 (simpler Realtime patterns than complex UI).

**Recurring issue:** ROADMAP.md checkbox drift — plans complete on disk but unchecked in roadmap. Needs a process fix in v4.0.
