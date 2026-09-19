---
gsd_state_version: 1.0
milestone: v9.0
milestone_name: — Kid Experience Redesign
status: ready_to_plan
stopped_at: Phase 09.3 complete (6/6) — ready to discuss Phase 9.4
last_updated: 2026-09-19T15:12:25.547Z
last_activity: 2026-09-19
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 17
  completed_plans: 17
  percent: 50
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-09-17 — ROADMAP v9.0 создан (6 фаз, 9.1–9.6).

---

## Out-of-band work — 2026-06-13…15 (pre-launch hardening, on `main`)

Не GSD-фаза; прямые правки в `main`. Все изменения задеплоены/применены к проду.

- **Security-блокеры закрыты:** `set-child-pin` auth; `/parent/*` middleware-guard
  (+ закрыта `?preview=true` лазейка); `CRON_SECRET` fail-closed; убран мёртвый
  SHA-256 PIN-хэш; **денежные мутации → server-side (service-role)**, money-таблицы
  RLS SELECT-only (миграция `04.4-03`).

- **Критическая дыра:** удалены `*_anon_all` / `public USING true` RLS-политики с
  **30 таблиц** (миграции `04.4-04`, `04.4-05`) — публичный anon-ключ давал
  read/write данных всех семей. Закрыто и проверено.

- **Функц-фиксы:** UTC-дата → `localDateString()` (UTC+3); cron на service-role;
  withdrawal double-spend guard; reminders-cron отключён в vercel.json.

- **Инфра:** ESLint сконфигурирован (`npm run lint` зелёный).
- **Фича:** parent **Expenses** UI (вкладка у ребёнка + экран в parent-center,
  CRUD + категории). Стоимость секций (`sections.cost`) материализуется в expenses
  по месяцам (миграция `04.4-06`, idempotent, read-only ♻️).

- Verify-скрипты: `scripts/verify-wallet-rls.mjs`, `verify-award-idempotency.mjs`,
  `verify-award-reads.mjs`.

---

## Текущая позиция

```
Milestone v9.0 Kid Experience Redesign — ROADMAP CREATED 2026-09-17, no phases started.
6 phases derived from FEED-01..07 / DAYFORM-01..06 / BOOST-01..06 (19 requirements, 100% mapped):
  9.1 feed-recognition   — FEED-01, FEED-02, FEED-03, FEED-04
  9.2 feed-social        — FEED-05, FEED-06, FEED-07
  9.3 dayform-default    — DAYFORM-01, DAYFORM-04, DAYFORM-05, DAYFORM-06
  9.4 dayform-styles     — DAYFORM-02, DAYFORM-03
  9.5 boost-default      — BOOST-01, BOOST-02, BOOST-03, BOOST-06
  9.6 boost-styles       — BOOST-04, BOOST-05
Grounded in .claude/skills/sketch-findings-kids-motivation/ (2026-09-17 sketch session).
Numbered v9.0 (not v6.0) and phases start at 9.1 specifically to avoid colliding with the
already-reserved-but-unbuilt v6.0/v7.0/v8.0 phase numbers (6.1-8.3) — see ROADMAP.md.
Next step: /gsd:plan-phase 9.1

---

Milestone v5.0 Flexibility & Design Unification — COMPLETE (all 11 phases, 5.1-5.11)
Phase 05.9 (rules-presets): COMPLETE 2026-07-23 — last plan 05.9-09 (Settings CoinsRulesTab: preset cards + diff-preview, 3-way grade-scale editor with data-driven rows, BehaviorTagsManager + BehaviorApprovalQueue mounted) code-complete since 2026-07-22; its checkpoint:human-verify (5 interactions: preset apply/diff/confirm, grade-scale switch, behavior tag CRUD, approval queue render) approved by operator 2026-07-23. All 10/10 plans done. Closes v5.0 — no open phases remain in the milestone.
Phase 4.5 (desktop): COMPLETE — all 4 plans executed. 04.5-02 (Parent Center screen layouts) executed 2026-07-23: Dashboard, Analytics, ChildrenTasksShop (Children + Shop), and Settings all gained a `useDesktop` (>=1024px) 2-column/grid layout — Dashboard splits children (left) / pending+activity (right); Analytics splits bar+line charts with KPI cards widened to 4-col; Children and Shop screens grid their card/list content 2-up; Settings swaps the horizontal pill tabs for a 200px vertical nav + content column on desktop. Mobile JSX left byte-for-byte unchanged in every file (verified via isDesktop-gated branches only). tsc/build/lint all green. Commits 1a6420d, 9016b58. Closes DSK-02.
Phase 05.1 (launch-prep): COMPLETE — full SC3 money suite (award + purchase + exchange + withdraw, 18 tests) green against live DB
Phase 05.2 (room-tasks): 05.2-06 COMPLETE (code) — RoomTasksManager settings editor (add/rename/toggle/reorder/delete, legacy tasks locked from deletion) mounted as Parent Center → Settings → Schedule → Room; settings.tabs.room + roomTasksManager.* i18n added to en/ru. All 6 plans (01-06) code-complete; SC1-SC3 verified in earlier plans; SC4 (rename visible on kid screen) queued as a checkpoint:human-verify for the operator at phase end — phase 05.2 not yet marked closed pending that approval.
Phase 05.4 (streak-settings): COMPLETE 2026-07-07 — verification passed 3/3.
Phase 05.5 (year-calendar): COMPLETE 2026-07-13 — 7/7 plans executed (waves 1-4, worktree orchestrator); code review found 3 Critical + 8 Warning, ALL 11 fixed same day (commits 0dd4e91..1679b84, 05.5-REVIEW-FIX.md); migrations 05.5-01..05 applied to prod (incl. WR-01 parent-only calendar writes + WR-03 child_filter backfill); verification PASSED 4/4 (05.5-VERIFICATION.md, 3 non-blocking visual checks listed for operator). Key deliveries: family_calendar table, RU/KZ/BY vacation presets → vacation_periods materialization, data-driven getDayType, server-side updateStreaks + streaks RLS SELECT-only (closes 05.4 CR-01), anchored-run streak calculators (current_count = full run length; transparent today freezes, not breaks).
Phase 05.6 (day-blocks): discussion in progress (2026-07-14).
Phase 05.3 (design-tokens): 05.3-03 CODE-COMPLETE — app/kid/wallet/page.tsx TxnRow and components/parent-center/screens/Dashboard.tsx ActivityRow both adopted the shared LedgerRow/Amount atoms (paper + ink themes respectively); credits/earn_coins/bonus render gold, debits/penalty render neutral/danger. Full build green (tsc/lint/test/next build, 55/55 pages). Surgical diffs confirmed via git diff per file. Consolidated checkpoint:human-verify (recolor + fonts + both pilots + unmigrated/legacy screens + gold-only-on-money rule) is queued for operator sign-off — phase 05.3 not yet marked closed pending that approval. 05.3-01 (tokens+fonts) and 05.3-02 (atoms module) done earlier.
Phase 05.10 (automation): 4/4 plans executed 2026-07-22/23 (wave 1: 05.10-01 trust-limit engine + schema migration, 05.10-02 smart reminders cron; wave 2: 05.10-03 allowance cron, 05.10-04 parent settings UI). First verification pass found SC3 (reminders) non-functional in prod — supabase/migrations/01.3-categories-schedule.sql (categories/tasks/schedule_items/push_subscriptions) had never actually been applied to the live DB despite Phase 1.3 being marked "Complete", silently breaking every push-notification path app-wide, not just this phase. Applied the migration to prod (idempotent); this surfaced a second independent bug (day_of_week `cs` array filter used JSON syntax instead of Postgres array-literal syntax, silently swallowed since only `data` was destructured) — fixed in both app/api/cron/daily/route.ts and app/api/cron/missed-tasks/route.ts, plus added per-child try/catch isolation around getStreaksAtRisk/creditAwards. Re-verification: 12/14 truths, 0 gaps, 0 regressions — commit 2071ca6. Plan 04's Task 3 human-verify checkpoint had been explicitly bypassed (user decision) without real browser testing; wrote tests/integration/automation-settings-persistence.test.ts exercising the REAL setTrustLimitAction/setAllowanceAction server actions (not raw DB writes, unlike the pre-existing tests) to close 4/5 05.10-HUMAN-UAT.md items via automated-equivalent live-DB proof — commit 6b968d8. Item 5 (real device push receipt via VAPID) remains genuinely pending, needs the operator with a real device. Phase not yet marked complete in ROADMAP pending that final item.
Last activity: 2026-09-19
Prior GSD activity: 2026-07-22 — executed phase 05.10 (automation) waves 1-2
```

Progress: [█████░░░░░] 50% (v9.0 — 3/6 phases; 17/17 plans in currently-planned phases 9.1-9.3, phases 9.4-9.6 not yet planned)

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-17)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Phase 9.4 — dayform styles

---

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 9.1 | feed-recognition | FEED-01, FEED-02, FEED-03, FEED-04 | Not started |
| 9.2 | feed-social | FEED-05, FEED-06, FEED-07 | Not started |
| 9.3 | dayform-default | DAYFORM-01, DAYFORM-04, DAYFORM-05, DAYFORM-06 | Plans complete (6/6), pending phase-close |
| 9.4 | dayform-styles | DAYFORM-02, DAYFORM-03 | Not started |
| 9.5 | boost-default | BOOST-01, BOOST-02, BOOST-03, BOOST-06 | Not started |
| 9.6 | boost-styles | BOOST-04, BOOST-05 | Not started |

---

## Accumulated Context

### Carry-forward from v3.0

- `notifyChild(childId, title, body, url)` is the canonical push dispatch — reuse for any new event notifications in v4.0
- Supabase Realtime channels must return cleanup function; callers must call on unmount (channel leak risk)
- photo_url signed URLs expire in 1h — revisit if v4.0 adds photo galleries or longer-lived views
- family-photos Storage bucket is private; all access via signed URLs

### Key architecture facts for v4.0

- Service worker already exists (for Web Push in v2.5) — extend it for offline caching and background push
- PWA manifest needs `display: standalone`, proper icons (192px, 512px), theme_color
- Next.js 14 App Router: static shell caching requires careful `cache: 'force-cache'` + ISR strategy
- i18n: Chose custom React context + Zustand over next-intl — zero deps, dotted-key lookup, {{var}} interpolation, browser-detect default. See 04.3-01-SUMMARY.md.
- COPPA requires parental consent gate for children under 13; data deletion must cascade across all tables

### Key architecture facts for v9.0

- Design source of truth for all three phases pairs: `.claude/skills/sketch-findings-kids-motivation/` (SKILL.md + references/feed-and-recognition.md, day-fill-interaction.md, progress-and-boost.md) plus interactive HTML mockups under `.planning/sketches/.../sources/`. `/gsd:plan-phase` and `/gsd:execute-phase` should treat this skill as primary design input for v9.0 phases.
- Reuse real components, don't reinvent: `components/kid/design/atoms.tsx` (`CollapsibleRow`, `KMButton`, `BoostMeter`, `XPBar`, `CoinPill`, `StreakFlame`, `ProgressRing`, `Confetti`) and palette `components/kid/design/kidTheme.ts` (`K`).
- `fill_style` (tile-sheet / story-stepper / sticky-summary) and `boost_style` (segmented-bar / quest-checklist / ring-badges) are new per-child preference fields — most naturally alongside `backfill_mode` on `children`, or a small new per-child settings row. Default for `fill_style` is `sticky-summary` (DAYFORM-06); no mandated default for `boost_style`.
- Weekly boost detail views must read real tier thresholds/coin amounts from `lib/kid/boost-rules.ts` — the sketch HTML has illustrative placeholder numbers (150/300/500, 3/5/7 grades) that must NOT be hardcoded into real components (BOOST-06).
- Family Feed content rules (all three phases 9.1/9.2 must respect): no money amounts/coin costs ever, no penalties/corrections/negative behavior-tag events ever — those stay in the private Wallet/audit trail only.
- Existing `components/feed/FamilyFeed.tsx` and `family_events`/reactions/comments schema (from the 2026-09-10 Family Feed work, see MEMORY.md `parent-center-light-and-family-feed`) is the starting point to extend, not replace from scratch — confirm exact current schema/component shape during 9.1 planning.

### Roadmap Evolution

- 2026-07-05: Milestone **v5.0 Flexibility & Design Unification** inserted (11 phases 5.1–5.11);
  Monetization/Social/Native shifted to v6.0/v7.0/v8.0. Principle: de-hardcoding first, design second
  («ничего не перекрашиваем, пока оно зашито»). Design contract:
  https://claude.ai/code/artifact/ab9621cc-2f84-42ff-a873-d07f8b841715
  Next up: `/gsd:plan-phase 5.1` (launch-prep).

- Note: v4.0 phases 4.3 (localization, 4/6) and 4.5 (desktop, 2/4) remain open; they do not block v5.0.

- 2026-09-17: Milestone **v9.0 Kid Experience Redesign** roadmapped — 6 phases (9.1–9.6),
  numbered to start at phase 9 specifically to avoid colliding with the already-reserved-but-
  unbuilt v6.0/v7.0/v8.0 phase numbers (6.1–8.3). 19/19 requirements (FEED-01..07,
  DAYFORM-01..06, BOOST-01..06) mapped, no orphans. Next up: `/gsd:plan-phase 9.1`.

### Pending Todos

None.

### Blockers/Concerns

- ~~Leaked prod key rotation~~ — done in Phase 5.1 (rotation verified on prod 2026-07-05).
- ~~Withdrawal approval unimplemented~~ — **RESOLVED 2026-07-07** (out-of-band on `main`):
  `/api/wallet/withdraw/approve` implemented (parent-guarded, service-role, atomic
  `wallet_apply` debit with 0-floor, conditional pending→terminal flip as the
  double-processing guard, compensating reopen on failed debit); the request route now
  reserves pending funds (new request must fit `money − sum(pending)`); dead client-side
  `requestWithdrawal`/`approveWithdrawal`/`rejectWithdrawal` removed from
  `wallet.repo.ts`/`wallet-api.ts`; `WithdrawModal` switched to `/api/wallet/withdraw`;
  10/10 integration tests green (`exchange-withdraw.test.ts` incl. reserve, approve,
  409-double-approve, reject, compensation).

- ~~**DEFECT (code review 05.4, CR-01, pre-existing): streak bonus mintable via arbitrary
  client dates.**~~ **RESOLVED.** Closed across three changes:
  (1) Phase 5.5 moved `updateStreaks` server-side (admin client only, no client callers)
  and locked `streaks` to RLS SELECT-only (migration `05.5-03-streaks-rls-readonly.sql`)
  — `current_count` is no longer client-writable money input.
  (2) Phase 5.5/5.6 gated the streak bonus to the server's `localDateString()` ±1 day
  (timezone tolerance) — arbitrary past/future date replay no longer pays, and the
  `(child_id,'streak',date)` idempotency key caps each in-window date to one credit.
  (3) 2026-09-05 (on `main`): the award route now rejects non-calendar dates
  (`2026-02-30`, `9999-99-99`) via `isValidCalendarDate()` before any DB/streak work,
  instead of the `/^\d{4}-\d{2}-\d{2}$/` regex that let them roll silently or 500.
  Tests: `tests/helpers.test.ts` (isValidCalendarDate), `tests/integration/award.test.ts`
  (non-skipped date-validation block).

- **Phase 9.2 decision-coverage gate override (2026-09-19):** `check.decision-coverage-plan`
  reported D-02/D-03/D-05/D-06/D-07/D-09/D-10 as uncovered when planning Phase 9.2
  (feed-social). Manual grep of the 7 PLAN.md files confirmed all 7 IDs are explicitly
  cited (e.g. D-02/D-03 in `09.2-03-PLAN.md`, D-09/D-10 in `09.2-02-PLAN.md`/`09.2-04-PLAN.md`),
  and the independent gsd-plan-checker pass separately confirmed "CONTEXT.md decisions
  D-01..D-12: all traced to implementing tasks." Same known parser bug as the Phase 9.1
  override below (corrupted/merged `text` extraction on CONTEXT.md's multi-line/nested
  decision bullets), not a real coverage gap. Proceeded without re-planning.

- **Phase 9.1 decision-coverage gate override (2026-09-17):** `check.decision-coverage-plan`
  reported D-01/D-02/D-04/D-05/D-07/D-08 as uncovered when planning Phase 9.1
  (feed-recognition). Manual grep of the 4 PLAN.md files and an independent
  gsd-plan-checker pass both confirmed all of D-01 through D-08 are explicitly cited
  and implemented across the plans (e.g. D-01/D-02 in `09.1-02-PLAN.md:41,120,126`,
  D-08 in `09.1-01-PLAN.md:123,164`, D-04/D-05/D-07 throughout `09.1-03-PLAN.md`).
  The tool's returned decision `text` fields were visibly corrupted/merged across
  bullets, indicating a parser bug on CONTEXT.md's multi-line/nested decision bullets,
  not a real coverage gap. Operator chose "Proceed anyway" — planning continued
  without re-running the planner. If `/gsd:verify-work` for 9.1 re-surfaces this,
  treat it as the same known tool false-positive, not a new gap, unless a fresh grep
  shows an actual missing D-NN citation.

- **Discovered 2026-07-07: `parent_audit_events` was never created in prod** — every
  `insertAuditEvent` (shop_approve/reject etc.) has been silently failing since 04.4.
  Fixed same day: applied `04.4-01-audit-consent.sql` + `05.4-04-withdraw-audit-actions.sql`
  (adds withdraw_approve/withdraw_reject action types). ~~Note: `insertAuditEvent` still
  writes via the anon browser client — works only where an authenticated parent session
  exists; server-role audit writes are a follow-up.~~ **RESOLVED 2026-09-05:**
  `insertAuditEvent(params, client?)` now takes an optional client; the 6 server-side
  call sites (shop approve/reject, behavior approve/reject, withdraw approve/reject) pass
  the service-role `admin` client so their rows are no longer silently RLS-denied. Client
  components keep the browser-singleton default. Regression guard:
  `tests/audit-repo.test.ts`. (Still unemitted anywhere: the `coin_adjust`, `badge_award`,
  `data_export`, `account_delete_request` action types — separate pre-existing gap.)

---

## Session Continuity

Last session: 2026-09-19T14:55:02.061Z
Stopped at: Completed 09.3-06-PLAN.md (phase 09.3 all 6 plans executed; operator approved; phase-close left to orchestrator)
Resume file: None

---

## Deferred Items

Items acknowledged and deferred at v5.0 milestone close on 2026-07-23:

| Category | Item | Status (2026-09-05 sweep) |
|----------|------|--------|
| uat_gaps | 05.10-HUMAN-UAT.md | **passed** — operator confirms push worked previously; infra verified on current stack; 1 re-subscribe needed (push_subscriptions empty in prod) |
| uat_gaps | 05.8-HUMAN-UAT.md | **passed** — operator confirms both scenarios correct in daily use |
| verification_gaps | 01.3-VERIFICATION.md | **verified** — push (operator + infra), PWA install (operator), ScheduleEditor linked-children (dead code, deleted) |
| verification_gaps | 02.2-VERIFICATION.md | **verified** — coin awards = v5.0 server-side award route + tests; dark theme superseded |
| verification_gaps | 3.2-VERIFICATION.md | **verified** — kid chat sends family_members.id; system-message path present; chat in daily use |
| verification_gaps | 04.4-VERIFICATION.md | **partial** — audit-screen item unblocked (f760ef3); data-export ZIP / Danger-Zone / COPPA modal still unverified (browser, low urgency) |
| verification_gaps | 05.1-VERIFICATION.md | **verified** — operator confirms Sentry + PostHog provisioned in Vercel and in use |
| verification_gaps | 05.10-VERIFICATION.md | **verified** — see 05.10-HUMAN-UAT above |
| verification_gaps | 05.8-VERIFICATION.md | **verified** — code-level + operator daily use |
| verification_gaps | 3.1-VERIFICATION.md | **verified** — push (operator + infra), medals table confirmed in prod |

> **2026-09-05: all 10 rows swept.** 9 closed (verified/passed), 1 partial
> (04.4 — 3 COPPA/export browser flows left, low urgency). Operator confirmed
> PWA install, Sentry/PostHog, 05.8 visual, and prior real-device push through
> live family use. Only genuine open item: one fresh push re-subscribe on the
> post-2026-07-23 stack (`push_subscriptions` is empty in prod). Full detail:
> `.planning/POST-MILESTONE-VERIFICATION.md`.

### Post-milestone cleanup pass (2026-09-05, on `main`)

Working through the deferred backlog. Per-item, each committed + pushed separately.

| Item | Status |
|------|--------|
| CR-01 (streak bonus / arbitrary client dates) | **RESOLVED** — `isValidCalendarDate()` gate in `/api/wallet/award` (commit `cf9fac1`). Client-writable `streaks` + replay were already closed by Phase 5.5; see Blockers/Concerns entry above. |
| Early-migration "never applied to prod" audit (the Phase 1.3 pattern) | **RESOLVED — no gaps.** New `scripts/verify-migrations-applied.mjs` parses every table/column/function/index/policy declared across `supabase/migrations/*.sql` and checks each against prod via `SUPABASE_DB_URL`. Result: 22 tables / 39 added columns / 19 functions / 30 indexes / 94 policies — **all present**. 15 declared policies are absent by design (anon-policy purge `04.4-04/05`, money-table SELECT-only lockdown `04.4-03`/`05.5-03`, and `family_members_self_update` → `mark_chat_read()` RPC `05.7-02`) and are allow-listed in the script. Money tables confirmed RLS-on with exactly one SELECT-only policy each. |
| `insertAuditEvent` server-role writes | **RESOLVED** — optional `client` param; 6 server call sites pass the `admin` client, no longer silently RLS-denied. See Blockers/Concerns entry above. |
| Deferred `human_needed` / `gaps_found` verification reports (8) + 2 HUMAN-UAT | **SWEPT — see `.planning/POST-MILESTONE-VERIFICATION.md`.** 9 of 10 reports now verified/passed; 04.4 partial (3 COPPA/export browser flows left, low urgency). Closed by code/DB/test: 01.3-3, 02.2-1/2/3, 3.1-5, 3.2-1/2, 04.4-5, 05.10-1..4, 05.8-1/2. Operator confirmed via live family use: PWA install, Sentry/PostHog, 05.8 visual, prior real-device push. Only genuine open item: one fresh push re-subscribe on the post-2026-07-23 stack (`push_subscriptions` empty in prod; write-path verified correct). |
| 01.3-3: linked-account children invisible in ScheduleEditor / TaskManager | **Closed — dead code deleted.** Those components (legacy `/settings` page, removed in 5.11 but left behind, zero imports) are gone. The shipping Parent Center schedule UI is fed by `getChildren()` (children table, no account filter) — all children already visible. |

---

## Decisions

### Phase 4.1 — Plan 01 (2026-04-26)

- Used Next.js Metadata API `appleWebApp` field for Apple meta tags (not manual `<head>` tags) — idiomatic with App Router
- InstallPrompt uses inline styles for reliability — renders before Tailwind CSS hydration
- iOS install detection: `/iPad|iPhone|iPod/.test(navigator.userAgent)` + non-standalone check — covers all iOS Safari variants
- [Phase 04.2-03]: Parent skeleton uses T.card (#1A1A28) and T.cardHi (#20202E) tokens for dark-theme shimmer — matches existing dark palette without introducing new colors
- [Phase 04.2-03]: ParentCenterSkeleton renders semantic sections (header tabs + 2 child cards + activity rows) mirroring Dashboard layout structure
- [Phase 04.3-01]: Custom React context + Zustand for i18n — no next-intl or external packages; dotted-key lookup with {{var}} interpolation; browser language auto-detect with SSR guard; html lang is static, runtime language via LanguageProvider
- [Phase 04.3]: CelebrationOverlay uses t('celebration.badgeEarned') for both aria-label and heading; manifest.ts uses English canonical strings (server-side, no hooks)
- [Phase 04.3]: Push notification server files cannot use React hooks — kept Russian strings unchanged, marked TODO for future localization
- [Phase 04.3]: ROOM_ITEM_LABELS uses labelKey pattern — labels resolved via t(labelKey) inside component to avoid hook calls at module level
- [Phase 04.3]: todayLabel() uses toLocaleDateString with locale from useLanguage() — no hardcoded Russian day/month arrays
- [Phase 04.3-05a]: CATEGORY_LABELS, ROLES, and DAYS arrays moved inside components to allow useT() hook access
- [Phase 04.3-05a]: ru.json onboarding section extended with 60+ missing keys to match en.json
- [Phase 04.3]: getDayType optional t param: t?() ternary with Russian string fallback preserves backward compat for server-side callers
- [Phase 04.3]: BADGES keep original title/description for DB storage; new titleKey/descKey fields used for UI display only — t(badge.titleKey) at render time
- [Phase 04.3]: STARTER_TEMPLATES use English canonical strings — written to DB as static strings, English is authoritative; parents can edit after loading
- [Phase 04.4]: COPPA consent denial = no child created = no pending state shown (correct COPPA behavior)
- [Phase 04.4]: FamilyManager.tsx uses direct Supabase insert; consent_given added to both FamilyManager and addChildToFamily paths
- [Phase 04.4]: AuditScreen uses 'tasks' icon as fallback for audit nav item (Icon component has no 'audit' SVG path)
- [Phase 04.4-02]: coins_price in plan interface was wrong — actual RewardPurchase field is price_coins (auto-fixed Rule 1)
- [Phase 04.4-02]: void insertAuditEvent fire-and-forget pattern established: audit failure never blocks parent workflows; repo-layer events minimal, component-layer events carry full context
- [Phase 04.4]: arraybuffer used for JSZip output in export route — BodyInit compatible with Next.js Response; family-summary endpoint created for Danger Zone count display
- [Phase 04.5-desktop]: useDesktop hook uses window.innerWidth >= 1024 with resize listener — same pattern as plan 01/02 (no Tailwind breakpoint needed, purely inline styles)
- [Phase 04.5-desktop]: Kid Day left panel: position: sticky, height: 100vh so stats remain visible while scrolling the form
- [Phase 04.5-desktop]: Kid Wallet: goals in right sticky 340px column, transactions in left fill column — desktop only
- [Phase 05.1]: app/manifest.ts already had FamilyCoins name/short_name from a prior phase — confirmed only, no edit committed
- [Phase 05.1-03]: experimental.instrumentationHook enabled in next.config.js — required on Next.js 14.2.35 for instrumentation.ts to load at all
- [Phase 05.1-03]: Sentry.init guarded on DSN env presence in all three runtime configs (client/server/edge) — no-ops cleanly with no env vars
- [Phase 05.1-04]: capture_pageview: false at init + manual trackPageview() from AnalyticsProvider on route change — App Router client navigations don't trigger PostHog's own history-based autocapture
- [Phase 05.1]: Integration tests invoke Next.js route handlers directly (import POST from route.ts + new NextRequest), mocking only requireFamilyMember via a partial vi.mock of lib/supabase/admin — createAdminClient/assertChildInFamily/wallet_apply run for real against the live DB
- [Phase 05.1-05]: days.room_ok is DB-trigger-derived (room_score_trigger/update_room_score) from room_bed/room_floor/room_desk/room_closet/room_trash, not settable directly by insert — test seeds must set 3 of 5 checklist booleans instead
- [Phase 05.1-06]: purchase.test.ts mocks both requireFamilyMember and requireParent (two distinct auth boundaries in the purchase request/approve/reject flow); exchange-withdraw.test.ts mocks a single parent membership since exchange/withdraw only need requireFamilyMember
- [Phase 05.2-01]: room_tasks delete guard uses pg_trigger_depth() <= 1 (not = 0) — the trigger's own invocation is already depth 1, so = 0 would have blocked family/child FK-cascade deletion (incl. COPPA cascades) whenever a legacy room task existed
- [Phase 05.2-02]: room.repo.ts mirrors children.repo.ts idiom (browser supabase singleton + children family_id lookup) rather than categories.repo.ts's createClient(); createFamily seeds default room tasks via non-fatal seed_default_room_tasks RPC
- [Phase 05.2-03]: Room award threshold = max(1, ceil(0.6 * activeTaskCount)) — 5 active tasks → 3, byte-exact parity with the legacy room_ok (>=3-of-5) rule; award falls back to day.room_ok when zero room_checks rows exist for (child, date)
- [Phase 05.2-03]: Integration teardown for guard-protected room_tasks: delete room_checks directly, remove legacy room_tasks via the families FK ON DELETE CASCADE inside destroyTestFamily (direct deletes blocked by the 05.2-01 legacy-delete guard even for service role)
- [Phase 05.2-04]: KidDayFillForm dual-write always sets all 5 legacy RoomLegacyKeys explicitly (default false) rather than leaving unmapped/inactive tasks undefined — saveDay's params ?? roomData? fallback-merge would otherwise resurrect a stale prior value for a task no longer rendered
- [Phase 05.2-04]: KidDayFillForm dual-write always sets all 5 legacy RoomLegacyKeys explicitly (default false) rather than leaving unmapped/inactive tasks undefined
- [Phase 05.2-05]: DailyModal room checklist family_id resolved from the children table (the child's family, matching threat T-052-16) with the Zustand store familyId as fallback
- [Phase 05.2-05]: DailyModal roomCoins preview stays hardcoded 3 (modal never loaded wallet_settings); threshold preview uses max(1, ceil(0.6*N)); server award remains authoritative
- [Phase 05.2]: RoomTasksManager resolves familyId via useAppStore() (SectionsManager pattern), not useFamilyMembers()
- [Phase 05.3-01]: Token re-export pattern - lib/design/tokens.ts single source; kid/parent T objects re-export unchanged keys from base/paper/ink
- [Phase 05.3-01]: CHILD_ACCENTS re-derived to 5 non-neon non-gold hexes (#8B7BF5, #3FBF92, #E88AA6, #5FB3E0, #C58BE0)
- [Phase 05.3-02]: Text-safe paper tone variants darkened past plan suggestions (#1D7355/#A05111/#B33846) so all pairs incl. 14%-alpha chip surfaces are >=4.5:1
- [Phase 05.3-02]: LedgerRow pending tone uses resolved mutedText (paper.ink2 / ink.muted) — paper.ink3 fails AA at 3.59:1 on the paper bg
- [Phase 05.3-02]: Stamp reduced-motion double-guarded: keyframes inside a no-preference media query (hydration-safe) plus a post-mount JS check dropping the animation property
- [Phase 05.3-03]: LedgerRow has no `signed` prop (05.3-02 as-built interface) — credit amounts show no explicit '+' prefix; coins_change already carries its own sign so no information is lost
- [Phase 05.3-03]: Parent dashboard ActivityRow dropped the redundant tone Pill + separate Coin amount in favor of a single LedgerRow (plan explicitly permitted this simplification)
- [Phase 05.9]: Plan 07: behavior-mark approval is status-only (no coin mutation); crediting happens on the next /api/wallet/award POST
- [Phase 05.9]: Plan 09: CoinsRulesTab preset diff-preview only writes wallet_settings on explicit confirm; grade-scale switch seeds grade_coin_map from defaults only for missing keys of the newly selected scale (forward-only, D-08); BehaviorTagsManager + BehaviorApprovalQueue mounted below "Save rules"
- [Phase 04.5-02]: Settings desktop layout uses 200px vertical tab nav + content grid (plan's literal interface pattern) instead of per-tab-body 2-col card grids
- [Phase 09.3-06]: Phase-close verification pattern: automated gate sweep + live-schema re-check + D-01..D-13 decision traceability matrix + operator browser sign-off, rather than trusting a ROADMAP 'Complete' marker (per the Phase 1.3 failure mode)

### Phase 4.1 — Plan 02 (2026-04-26)

- Three-strategy fetch handler: passthrough for /api/ and supabase.co, cache-first for /_next/static/, network-first for pages
- addAll in install handler wrapped in catch() — pre-caching failures don't abort SW install
- OfflineBanner uses inline styles (consistent with InstallPrompt) — renders before Tailwind hydration
- Never cache API routes or Supabase requests in service worker

### Phase 4.1 — Plan 03 (2026-04-26)

- notifyParent only fires for pending-status purchases — auto-approved purchases skip push to avoid noise
- Push failure in requestPurchase is non-blocking — caught in try/catch, purchase flow always succeeds
- pushsubscriptionchange logs warning only — full auto-resubscription requires VAPID key unavailable in SW context
- requestPurchase must be a 'use server' file so notifyParent runs server-side (not in browser context)

### Phase 04.2 — Plan 04 (2026-05-16)

- useCountUp hook uses rAF with cubic ease-out (same pattern as AnimatedNum in kid/design/atoms.tsx) — no framer-motion for count-up, simpler and no extra dependency
- ease: 'easeOut' as const required to satisfy Framer Motion's Easing type in strict TypeScript — plain string literal rejected
- Activity feed capped at 8 items, badge grid at 12, wallet transactions at 10 — all animations complete under 500ms total

### Phase 04.4 — Plan 01 (2026-05-17)

- insertAuditEvent is non-blocking (catches errors, logs, never throws) — audit failures must not disrupt the parent action being audited
- action_type enforced by both SQL CHECK constraint and TypeScript union type — double safety
- consent_given uses three-state Boolean (NULL=not asked, TRUE=given, FALSE=withdrawn) to distinguish not-asked from denied
- Used import { supabase } from '@/lib/supabase' singleton (consistent with all existing repos) instead of createClient() from plan template

### Phase 04.5 — Plan 04 (2026-05-18)

- Achievements badge grid mobile fallback kept as repeat(3, 1fr) — existing mobile layout used 3 columns, not 2; preserves mobile experience byte-for-byte
- Shop both real-rewards and virtual-items grids updated together — consistent 3-column desktop layout across both tabs
- Balance strip in Shop left unchanged — already spans full container width, no inner maxWidth to remove

## Current Position

Phase: 9.4
Plan: Not started
Status: Ready to plan
Last activity: 2026-09-19

## Operator Next Steps

- Orchestrator to run phase-close (`verify_phase_goal` + `phase.complete`) for Phase 9.3, then proceed to `/gsd:plan-phase 9.4`
