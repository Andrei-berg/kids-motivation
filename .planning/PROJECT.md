# PROJECT.md — KidsCoins (рабочее название)

> **Миссия:** Помочь каждой семье воспитать ответственных, активных и мотивированных детей — через прозрачную систему заслуженных наград, которая работает как реальный мир, а не как казино.

---

## 1. Философия продукта

**"Делу время, потехе час"**

Дети не просто получают награды — они их зарабатывают. Приложение моделирует взрослую жизнь в понятном для ребёнка формате:
- У тебя есть обязанности → ты их выполняешь → ты получаешь монеты → ты тратишь их на то, что хочешь
- Лень или обман → штрафы → меньше возможностей
- Старание и дисциплина → стрики, бейджи, больше монет → реальные вознаграждения

**Это не игра.** Это подготовка к жизни, завёрнутая в интерфейс, который дети хотят открывать каждый день.

---

## 2. Целевая аудитория

### Основные пользователи
- **Родители** (25–45 лет) — хотят воспитать дисциплину и ответственность, без постоянных конфликтов
- **Дети** (5–17 лет) — хотят зарабатывать свободу и призы, видеть свой прогресс

### Расширенные пользователи
- Бабушки/дедушки — участвуют, поощряют, следят за успехами
- Старшие братья/сёстры — выступают наставниками или участниками
- Тренеры (в будущем) — могут оставлять оценки напрямую

### Масштаб
- MVP: 5,000 семей (существующее комьюнити)
- Год 1: 50,000 семей
- Год 3: 500,000+ семей, международный рынок

---

## 3. Ключевые принципы UX (Silicon Valley standard)

1. **Onboarding за 3 минуты** — семья настроена и готова к работе за одну сессию
2. **Ребёнок — главный герой** — его профиль, его монеты, его магазин. Не родительский инструмент надзора, а детский дневник достижений
3. **Родитель — наблюдатель и верификатор** — не диктатор, а справедливый судья
4. **Прозрачность** — каждый видит что происходит. Никаких тайных начислений
5. **Доверие с последствиями** — ребёнок сам отмечает выполнение. Обман = серьёзный штраф
6. **Прогресс виден каждый день** — стрики, уровни, бейджи создают ощущение роста
7. **Семья как команда** — общие победы, внутренний чат, совместные цели

---

## 4. Функциональные блоки

### 4.1 Семья и аккаунты
- Регистрация через email / Google / Apple ID
- Создание семьи: название, аватар, часовой пояс
- Роли: `parent` | `child` | `extended` (бабушка, дедушка, наставник)
- Приглашения по коду или ссылке (6-символьный код семьи)
- Неограниченное количество членов семьи
- У каждого — свой личный аккаунт и профиль

### 4.2 Обязанности и категории
Гибкая система категорий — родитель настраивает под свою семью:

| Категория | Примеры активностей |
|---|---|
| 🎓 Учёба | Оценки в школе, домашнее задание, чтение |
| 🏠 Дом | Уборка комнаты, помощь по дому, готовка |
| ⚽ Спорт | Посещение тренировок, оценка тренера, соревнования |
| 📅 Распорядок | Подъём вовремя, отбой вовремя, зарядка |
| 🌟 Поведение | Вежливость, помощь другим, поступки дня |
| 📚 Хобби | Музыка, рисование, программирование |

Каждая категория настраивается: название, иконка, вес в монетах.

### 4.3 Расписание и напоминания
- Недельное расписание (школа, секции, домашние дела)
- Push-уведомления на телефон ребёнка и родителя
- Время напоминания задаётся для каждой задачи
- Статусы: ожидает → выполнено ребёнком → подтверждено родителем

### 4.4 Монеты и награды
**Начисление:**
- Оценки: 5→+5🪙, 4→+3🪙, 3→-3🪙, 2→-5🪙, 1→-10🪙
- Выполнение задач: гибкая настройка родителем
- Стрики: бонусные монеты за серии выполнения
- Бейджи: единоразовые награды за достижения
- Похвала тренера: до +10🪙

**Штрафы:**
- Невыполнение обязательных задач
- Обман при отметке выполнения (обнуление + штраф)
- Плохое поведение (по решению родителя)

### 4.5 Кошелёк и магазин
- Личный кошелёк каждого ребёнка
- **Магазин** — родитель создаёт позиции:
  - Виртуальные: час на компьютере, выбрать ужин, остаться до 22:00
  - Материальные: сувенир, игрушка, одежда
  - Опыт: поход в кино, пиццерия, парк развлечений
  - Деньги: обмен монет на реальные деньги (курс задаёт родитель)
- **P2P переводы** между детьми в семье
- **Подтверждение покупки** родителем (настраивается: авто или ручное)
- История всех транзакций

### 4.6 Аналитика и прогресс
- Дашборд ребёнка: сегодня, неделя, месяц
- Стрики: текущий и рекордный
- Бейджи и уровни (система XP)
- Сравнение по неделям (не с другими детьми, а с собой)
- Родительский дашборд: все дети, общая статистика семьи
- Отчёты: еженедельный дайджест на email

### 4.7 Внутрисемейный чат
- Чат всей семьи + личные переписки
- Реакции (❤️ 👍 🔥 🏆) и стикеры
- Уведомления об успехах: "Адам получил 5 по математике! 🎉"
- Голосовые сообщения (v2)
- Родитель может отправить "Медаль дня" с личным сообщением

### 4.8 Социальные функции (v2)
- Дружба между семьями (родитель одобряет)
- Семейный рейтинг среди друзей (анонимный по желанию)
- Совместные челленджи между семьями
- Обмен шаблонами магазина и категорий

---

## 5. Монетизация

### Free (базовый план)
- 1 семья, до 2 детей
- Все основные функции (обязанности, монеты, магазин)
- Лимит: 5 позиций в магазине, 3 категории
- Реклама (ненавязчивая, только для родителей)

### Premium (подписка)
- **$4.99/месяц** или **$39.99/год** (первые 3 месяца бесплатно)
- Неограниченно детей и категорий
- Полный магазин без ограничений
- Расширенная аналитика
- Семейный чат и стикеры
- Push-уведомления без ограничений
- Дружба с другими семьями
- Экспорт отчётов

### Family Plus (для активных сообществ)
- До 10 семей в группе (класс, спортивная команда)
- Совместные турниры
- Тренер может добавлять оценки напрямую

---

## 6. Стратегия запуска

### Этап 1 — Бета (комьюнити 5,000 родителей)
- PWA приложение (устанавливается с браузера)
- Полностью бесплатно для первых 1,000 семей (ранний доступ)
- Сбор фидбека, итерации каждые 2 недели

### Этап 2 — Рост
- App Store + Google Play
- Реферальная программа (пригласи семью → бонусные монеты)
- Интеграция со школьными системами (электронный дневник)

### Этап 3 — Масштаб
- Локализация (EN, RU, KZ, UA, DE)
- B2B: школы, спортивные клубы
- Fundraising (seed round)

---

## 7. Метрики успеха

| Метрика | Цель (6 мес) | Цель (12 мес) |
|---|---|---|
| Активные семьи (DAF) | 500 | 5,000 |
| Retention D7 | >40% | >55% |
| Retention D30 | >20% | >35% |
| Premium конверсия | 5% | 12% |
| NPS | >50 | >65 |
| Среднее кол-во действий/день | 3 | 5 |

---

## 8. Конкуренты и дифференциация

| Продукт | Минусы | Наше отличие |
|---|---|---|
| Greenlight | Только финансы, нет обязанностей | Полная жизнь ребёнка |
| BusyKid | Только деньги/работа | Учёба, спорт, поведение |
| GoHenry | Банковская карта, дорого | Гибкость, не только деньги |
| Роблокс/игры | Не про реальную жизнь | Реальные достижения |
| Таблица в Excel | Неудобно, нет мотивации | Gamification, push, social |

**Наш USP:** Единственное приложение, которое объединяет учёбу + дом + спорт + распорядок + кошелёк + семейный чат в одном месте, с настройкой под каждую семью.

---

## 9. Название (в разработке)

**Варианты:**
- `FamilyCoins` — понятно, но скучно
- `KidBoost` — энергично
- `HomeHero` — акцент на семье
- `EarnIt` — акцент на философии
- `DayWin` — победа каждого дня
- `Growi` — рост

*Финальное название выбирается после бета-тестирования с комьюнити.*

---

## Shipped: v5.0 — Flexibility & Design Unification (2026-07-23)

Any family, not just the original Adam & Alim family, can now shape the app to its own rules — nothing that used to be a hardcoded constant still is. Design work followed: both Kid Screen and Parent Center were rebuilt on one unified token system.

**What shipped:**
- Room checklist, streak thresholds/bonuses, school-year calendar (dates, quarters/trimesters, regional vacation presets, configurable weekend days), and a day-assembly engine (day type × schedule × block rules) all moved from code constants into per-family configurable data
- Rule presets (Classic / No-penalties / Bonuses-only) with a mandatory diff-preview before write; `grade_scale` per family (5-point / 12-point / A–F); behavior is a configurable tag set with per-tag prices instead of one binary flag
- Automation: scheduled allowance crediting, purchases under a per-child trust limit auto-approve, schedule-driven smart reminders (upcoming training, day not filled, streak at risk) — the daily routine now runs itself
- Full kid + parent redesign on a unified design system — `lib/design/tokens.ts` (paper/ink themes, Bitter/Golos Text/JetBrains Mono), shared atoms (LedgerRow, Amount, StatusChip); kid nav consolidated 6→5 (leaderboard folded into Awards)
- Legacy cleanup — old duplicate pages redirected/removed, `globals.css` purged of dead rules, consistent FamilyCoins branding (icon/splash/manifest) as the single remaining UI
- Along the way: found and fixed a Phase 1.3 migration that had silently never reached prod (breaking every push-notification path app-wide, not just the phase touching it) — a reminder that "ROADMAP complete" isn't proof a migration ran

**Technical state as of v5.0:**
- ~39,640 LOC TypeScript/TSX (up from ~26,930 at v3.0)
- New tables: `room_tasks`/`room_checks`, `family_calendar`/`vacation_periods`, `day_blocks`, `grade_scale`/`grade_coin_map`, `behavior_tags`/`behavior_marks`, trust-limit/allowance columns on `children`/`wallet_settings`
- Money mutations remain 100% server-side (service-role client); money tables stay RLS SELECT-only for clients — the boundary held through the whole de-hardcoding pass
- Known deferred: real-device VAPID push receipt (05.10) and 2 human-UAT scenarios (05.8) still need an operator with a physical device; ink theme flagged as too dark, parked for a future pass (see STATE.md Deferred Items)

<details>
<summary>v4.0 — PWA Polish (shipped 2026-07-23, retroactively — built 2026-04-26 to 2026-05-18, formally closed alongside v5.0)</summary>

Made FamilyCoins installable and production-ready for the first families.

- PWA install (Add to Home Screen, iOS/Android), background Web Push via service worker, offline shell caching with graceful degradation
- Framer Motion page transitions, pixel-accurate skeleton loaders, 44px touch targets throughout
- Full Russian + English localization, browser auto-detect with manual switcher, zero hardcoded strings
- Account deletion with full data cascade, data export (ZIP), COPPA/GDPR consent gate for children under 13, parent audit log
- Dedicated desktop layout (≥1024px): sidebar navigation, multi-column Parent Center + Kid Screen, full-height chat panel
- Bundled alongside (out-of-band, 2026-06-13…15): closed a critical RLS hole (30 tables had public `USING true` policies), moved all money mutations server-side, rotated leaked credentials

</details>

<details>
<summary>v3.0 — Communication (shipped 2026-04-26)</summary>

Family experience is now alive with real-time communication. Push notifications fire for every meaningful event; family chat with reactions, stickers, and achievement auto-posts connects all members; photos provide task proof and share moments.

**What shipped:**
- Push notifications — `notifyChild` action covers purchase approval, badge award, wallet credit/debit
- "Medal of the Day" — parent composes personal message + bonus coins; child gets push notification
- Real-time family chat — ChatThread on `/parent/chat` and `/kid/chat` via Supabase Realtime
- Reactions + stickers — real-time reaction counts; StickerPicker with 12 emoji stickers
- Achievement auto-posts — badges, streak milestones (7/14/30 days), wallet credits post system messages to chat
- Photo messages — client-side compression, Supabase Storage (private bucket), signed URL delivery, inline lightbox
- Task photo proof — camera capture in kid day-fill form; proof display in parent confirmation view

**Technical state as of v3.0:**
- ~26,930 LOC TypeScript/TSX
- New tables: `chat_messages`, `chat_reactions`, `medal_of_day`; Supabase Storage bucket `family-photos`
- Supabase Realtime active (messages + reactions channels); free tier sufficient for beta
- Vercel deployment at kids-motivation.vercel.app

<details>
<summary>v2.0 — Role-Based UI (shipped 2026-04-13)</summary>

Two fully separate experiences — Parent Center (dark, control-focused) and Kid Screen (bright, gamified). Any family can register, add children, and start earning coins in under 3 minutes. Children without email can log in via PIN.

- `/parent/*` — dark dashboard, daily input, wallets, analytics, shop, PIN-protected settings
- `/kid/*` — My Day, wallet, achievements (badges/streaks/XP/levels), shop, leaderboard
- Shop approval flow — freeze → approve/reject; parent preview mode
- Kid day-fill form — room checklist, mood, activities, live coin counter; configurable fill-mode per child
- Push notifications + animations — cron reminders, coin fly-up, confetti celebrations
- 5-step onboarding wizard — writes family, children, wallets to DB end-to-end
- Child PIN login — family code → pick name → 4-digit PIN → `/kid/day`

</details>

---

## Current Milestone: none — between milestones

v5.0 shipped 2026-07-23. Next milestone not yet chosen — candidates below (see ROADMAP.md v6.0/v7.0/v8.0). Run `/gsd:new-milestone` to start questioning → research → requirements → roadmap for the next one.

---

## Requirements

### Validated

- ✓ Multi-tenant DB schema with families, RLS, Supabase Auth — v1.0
- ✓ Registration + onboarding wizard (email/Google, 3-minute setup) — v1.0
- ✓ Flexible categories and weekly schedule with push reminders — v1.0
- ✓ Dashboard and all pages dynamically load from authenticated family context — v1.0
- ✓ Role-based routing: parent→/parent, child→/kid, middleware guards — v2.0
- ✓ Parent Center: daily input, wallets, analytics, shop CRUD, PIN-protected settings — v2.0
- ✓ Kid Screen: My Day, wallet, achievements (10+ badges, streaks, XP/levels), shop, leaderboard — v2.0
- ✓ Shop approval flow: request→freeze→approve/reject→settle — v2.0
- ✓ Kid day-fill form with live coin counter and configurable fill-mode — v2.0
- ✓ Push notifications: streak alerts, schedule reminders, missed-task cron — v2.0
- ✓ Coin + badge animations (fly-up, confetti) — v2.0
- ✓ Child PIN login (no email required) — v2.0
- ✓ Push notifications for task confirmations, badge earnings, wallet credits — v3.0
- ✓ "Medal of the Day" — parent sends personal message with bonus coins — v3.0
- ✓ Real-time family group chat (Supabase Realtime) — v3.0
- ✓ Message reactions (❤️ 👍 🔥 🏆) and sticker pack — v3.0
- ✓ Achievement events auto-post to family chat — v3.0
- ✓ Photo messages in chat — v3.0
- ✓ Photo proof of task completion — v3.0
- ✓ PWA install prompt (iOS + Android), background Web Push, offline shell + degradation — v4.0
- ✓ Skeleton loaders + Framer Motion transitions, 44px touch targets throughout — v4.0
- ✓ Russian + English localization, browser auto-detect + manual switcher — v4.0
- ✓ COPPA/GDPR compliance: account deletion cascade, data export, consent gate, parent audit log — v4.0
- ✓ Desktop UI: sidebar nav, multi-column Parent Center + Kid Screen, full-height chat — v4.0
- ✓ Room checklist, streak settings, school-year calendar, day-blocks engine — all family-configurable, no hardcoded constants — v5.0
- ✓ Rule presets (Classic/No-penalties/Bonuses-only) + configurable grade_scale + behavior tag economy — v5.0
- ✓ Automation: scheduled allowance, trust-limit auto-approve, schedule-driven smart reminders — v5.0
- ✓ Unified design system (tokens, paper/ink themes) across full kid + parent redesign — v5.0
- ✓ Legacy pages removed, globals.css purged, single consistent UI/branding — v5.0

### Active

None yet — next milestone not chosen. Candidates carried forward from ROADMAP.md's forward-looking milestones (unvalidated, subject to a real requirements pass via `/gsd:new-milestone`):
- [ ] v6.0 Monetization — Free/Premium/Family Plus tiers, Stripe billing, freemium limits
- [ ] v7.0 Social — cross-family friendships, family rating/leaderboard among friends, shared challenges, shop/category template sharing
- [ ] v8.0 Native Apps — iOS/Android via Expo

### Out of Scope (current)

- Apple ID login — Google + email sufficient for beta
- Voice messages in chat — Supabase Pro storage cost; defer to v6.0+
- Video messages — high storage/bandwidth cost
- Offline mode for Realtime chat — real-time is core; degradation is sufficient
- B2B teacher/coach accounts — post-product-market-fit
- Freemium limits + Stripe — v6.0
- Native mobile (Expo) — v8.0

---

## Key Decisions

| Decision | Outcome | Status |
|----------|---------|--------|
| Next.js App Router over Pages Router | Clean auth/layout split per role | ✓ Good |
| Supabase Auth with synthetic emails for child PIN | No email required; `child_{id}@internal.familycoins.app` pattern | ✓ Good |
| Separate /parent/* and /kid/* route trees | Middleware enforces roles; no shared layout complexity | ✓ Good |
| PIN stored as bcrypt hash in `child_pin_credentials` (RLS deny-all), verified via `verify_child_pin()` with authoritative lockout | Superseded original SHA-256-in-`family_members` design — synthetic account password is a long random secret (never the PIN), so nothing brute-forceable is client-reachable | ✓ Good (rebuilt 2026-07, see `child-pin-auth-broken` history) |
| Kid fill-mode as integer enum (1/2/3) in children table | Flexible per-child config without extra tables | ✓ Good |
| Zustand store for familyId + activeMemberId | Replaces legacy childId='adam'/'alim' hardcodes | ✓ Good |
| Coins calculated on-the-fly from days + subject_grades | No finalization step needed; analytics always current | ✓ Good |
| Supabase Realtime for chat (not Socket.io/Pusher) | Built into stack; free tier (200 concurrent, 2M msg/month) sufficient for beta | ✓ Good |
| notifyChild swallows all push errors silently | Push must never break business logic (approval, badge award, wallet) | ✓ Good |
| sender_id TEXT matches family_members.id convention | Consistent with existing id column type; no UUID conversion needed | ✓ Good |
| Photo URLs stored as 1h signed URLs in DB | Simple for MVP; long-lived URL management deferred | — Pending revisit |
| family-photos bucket is private (public=false) | Prevents enumeration; all access via signed URLs | ✓ Good |
| All money mutations server-side only (service-role client); money tables RLS SELECT-only for clients | Closed the class of bugs where a client write could forge a balance; foundational to all of v5.0's de-hardcoding work | ✓ Good |
| Custom React context + Zustand for i18n (no next-intl) | Zero deps; dotted-key lookup + {{var}} interpolation, browser-detect default | ✓ Good |
| Service worker: three-strategy fetch (passthrough API/Supabase, cache-first static, network-first pages) | Never cache API or Supabase requests; safe offline shell without stale data risk | ✓ Good |
| `useDesktop` hook (`window.innerWidth >= 1024` + resize listener) for all desktop layouts | No new Tailwind breakpoints; mobile JSX left byte-for-byte unchanged everywhere it's used | ✓ Good |
| `lib/design/tokens.ts` as single design source, re-exported through legacy `T` objects | Zero-risk incremental recolor — components didn't need structural changes to adopt tokens | ✓ Good |
| Diff-preview-before-write for settings changes (rule presets, coin rules) | Never write on selection alone — an explicit old→new table + confirm step prevents silent bulk overwrites of family-tuned values | ✓ Good |
| Anchored-run streak calculators (`current_count` = full run length; today freezes rather than breaks) | Matches how families actually think about streaks; server-side only after CR-01 (client could previously mint bonus via arbitrary dates) | ✓ Good |
| Forward-only grade-scale switch — seeds missing `grade_coin_map` keys only, never rewrites an already-recorded grade's coin value | Switching 5-point→A–F mid-year can't retroactively change history | ✓ Good |
| Cron routes (allowance, reminders, missed-tasks) run on the service-role client | A cookie client has no session in cron context — RLS would return 0 rows | ✓ Good |
| Ink theme (Parent Center dark palette) flagged by operator as too dark/low-contrast | Deferred — needs a dedicated design pass, not a quick tweak | — Pending revisit |

---

*Документ создан: 2026-03-01. Обновлён: 2026-07-19 — Phase 5.7 (kid-redesign) complete: all kid screens on the unified family-bank system (paper theme, tokens/atoms, gold-on-money-only), nav consolidated 6→5 with leaderboard merged into a 3-tab Awards screen, motion discipline (stamp + count-up on server-confirmed award; confetti only on streak/level-up), chat read-marker via SECURITY DEFINER RPC (CR-01 privilege-escalation found in review and fixed); verification 3/3 passed.*

*Обновлён: 2026-07-21 — Phase 5.8 (parent-redesign) complete: Parent Center's remaining Schedule/Settings screens (7 CRUD managers + ChatPanel + Btn hover) recolored onto the ink theme, Day Constructor got a schedule-link picker (D-02) and per-child overrides (D-03, both candidate layouts kept behind a toggle per operator decision), a new Year Calendar visual month grid with sick-day overlay (D-05/D-06) replaced the flat settings-only view, and Analytics gained a real week-scoped Weekly Summary card (D-08). Code review found 2 Critical + 6 Warning issues post-execution (D-02 picker initially unreachable, Weekly Summary "Tasks done" metric structurally capped) — all 9 fixed and re-verified (9/9 must-haves). Two items (picker + card) remain pending live-browser re-confirmation by the operator after next deploy — see 05.8-HUMAN-UAT.md (operator's local session hit a stale PWA service-worker cache, not a code defect). Operator flagged the overall dark "ink" theme brightness/contrast as too dark across all of Parent Center — tracked as a separate future task, not part of 5.8's scope.*

---
*Milestone v5.0 Flexibility & Design Unification shipped 2026-07-23 (all 11 phases 5.1-5.11 complete, 71/71 plans). v4.0 PWA Polish formally closed at the same time (was code-complete since 2026-05-18 but never run through milestone close). Full requirements/decisions evolution review done as part of `/gsd:complete-milestone`. No milestone currently active — next one starts via `/gsd:new-milestone`.*
