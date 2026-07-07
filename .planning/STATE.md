---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: — PWA Polish
status: ready_to_plan
stopped_at: Phase 05.4 complete (3/3) — ready to discuss Phase 05.5
last_updated: 2026-07-07T11:04:03.686Z
last_activity: 2026-07-07
progress:
  total_phases: 16
  completed_phases: 7
  total_plans: 40
  completed_plans: 96
  percent: 44
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-06-15 — out-of-band security + expenses pass (см. ниже).

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
Milestone v4.0 PWA Polish — In Progress
Phase 4.5 (desktop): COMPLETE — all 4 plans executed
Phase 05.1 (launch-prep): COMPLETE — full SC3 money suite (award + purchase + exchange + withdraw, 18 tests) green against live DB
Phase 05.2 (room-tasks): 05.2-06 COMPLETE (code) — RoomTasksManager settings editor (add/rename/toggle/reorder/delete, legacy tasks locked from deletion) mounted as Parent Center → Settings → Schedule → Room; settings.tabs.room + roomTasksManager.* i18n added to en/ru. All 6 plans (01-06) code-complete; SC1-SC3 verified in earlier plans; SC4 (rename visible on kid screen) queued as a checkpoint:human-verify for the operator at phase end — phase 05.2 not yet marked closed pending that approval.
Phase 05.3 (design-tokens): 05.3-03 CODE-COMPLETE — app/kid/wallet/page.tsx TxnRow and components/parent-center/screens/Dashboard.tsx ActivityRow both adopted the shared LedgerRow/Amount atoms (paper + ink themes respectively); credits/earn_coins/bonus render gold, debits/penalty render neutral/danger. Full build green (tsc/lint/test/next build, 55/55 pages). Surgical diffs confirmed via git diff per file. Consolidated checkpoint:human-verify (recolor + fonts + both pilots + unmigrated/legacy screens + gold-only-on-money rule) is queued for operator sign-off — phase 05.3 not yet marked closed pending that approval. 05.3-01 (tokens+fonts) and 05.3-02 (atoms module) done earlier.
Last activity: 2026-07-07
Prior GSD activity: 2026-07-07 — executed 05.3-02 (shared atoms module in components/design/atoms.tsx)
```

Progress: [██████████] 97%

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Phase 05.5 — year calendar

---

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 4.1 | pwa | PWA-01, PWA-02, PWA-03 | Not started |
| 4.2 | ux-polish | UX-01, UX-02 | Not started |
| 4.3 | localization | LOC-01 | Not started |
| 4.4 | security-compliance | SEC-01, SEC-02 | Not started |
| 4.5 | desktop | DSK-01, DSK-02, DSK-03 | Not started |

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

### Roadmap Evolution

- 2026-07-05: Milestone **v5.0 Flexibility & Design Unification** inserted (11 phases 5.1–5.11);
  Monetization/Social/Native shifted to v6.0/v7.0/v8.0. Principle: de-hardcoding first, design second
  («ничего не перекрашиваем, пока оно зашито»). Design contract:
  https://claude.ai/code/artifact/ab9621cc-2f84-42ff-a873-d07f8b841715
  Next up: `/gsd:plan-phase 5.1` (launch-prep).

- Note: v4.0 phases 4.3 (localization, 4/6) and 4.5 (desktop, 2/4) remain open; they do not block v5.0.

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
- **DEFECT (code review 05.4, CR-01, pre-existing): streak bonus mintable via arbitrary
  client dates.** `/api/wallet/award` keys the streak-bonus award on the raw
  client-supplied `date` string (regex-only validation) and pays from client-writable
  `streaks.current_count` — a child can loop distinct date strings and mint bonus×N.
  Predates 05.4 (present since the original server-side award, commit `c873a8d`).
  Fix direction (see `05.4-REVIEW.md` CR-01): pay only when `date === localDateString()`
  + real-calendar validation; longer term key on the milestone and move `updateStreaks`
  server-side. Candidate for an early 5.5 gap plan.
- **Discovered 2026-07-07: `parent_audit_events` was never created in prod** — every
  `insertAuditEvent` (shop_approve/reject etc.) has been silently failing since 04.4.
  Fixed same day: applied `04.4-01-audit-consent.sql` + `05.4-04-withdraw-audit-actions.sql`
  (adds withdraw_approve/withdraw_reject action types). Note: `insertAuditEvent` still
  writes via the anon browser client — works only where an authenticated parent session
  exists; server-role audit writes are a follow-up.

---

## Session Continuity

Last session: 2026-07-07T04:05:00.000Z
Stopped at: Completed 05.3-03-PLAN.md — LedgerRow/Amount piloted on kid wallet + parent dashboard; consolidated visual checkpoint pending operator sign-off
Resume file: None

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
