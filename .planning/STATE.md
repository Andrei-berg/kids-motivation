---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-08T02:08:00Z"
progress:
  total_phases: 24
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-03-08 (01.4-02 complete — NavBar dynamic pill buttons + ExpenseModal/AuditLogViewer/PotentialWidget dynamic props, all hardcoded adam/alim removed from 4 shared components)

---

## Статус проекта

```
🟢 EXECUTING — Phase 1.4 Plan 02 COMPLETE (2/3 plans done). Shared components wired. Ready for Phase 1.4 Plan 03: Page migration.
```

---

## Что сделано

### ✅ Планирование (2026-03-01)
- [x] Проанализирован существующий код (15 таблиц, все компоненты)
- [x] Создан PROJECT.md — видение, философия, функции
- [x] Создан REQUIREMENTS.md — 108 требований (REQ-*)
- [x] Создан ROADMAP.md — 7 milestones, фазы
- [x] Создан ARCHITECTURE.md — схема БД, стек, файловая структура
- [x] Создан ONBOARDING.md — детальные экраны онбординга
- [x] Создан CODEBASE-ANALYSIS.md — что переиспользуем, что переписываем

### ✅ Phase 1.1 — DB Schema (COMPLETE, 2026-03-01)
- [x] Plan 01: SQL migrations — schema-v3.sql, seed-migration.sql, rls.sql (commits: ced902d, 28eeff6, df9271d)
- [x] Plan 02: Supabase clients (lib/supabase/client.ts, server.ts, middleware.ts) — commits: 08b9843, 292ef31
- [x] Plan 03: Auth middleware (middleware.ts, app/auth/callback/route.ts) — commits: 73a7c5e, 5ea318b

### Phase 1.2 — Onboarding (COMPLETE, 5/5 plans)
- [x] Plan 01: Schema patch (onboarding_step, avatars bucket) + lib/onboarding-api.ts
- [x] Plan 02: /login and /register pages with Google OAuth + email/password
- [x] Plan 03: Onboarding wizard steps 0-4 (welcome, profile, family, add child, invite) — commit: e0c8fd7
- [x] Plan 04: Onboarding wizard steps 5-6 (categories toggle, confetti + Done screen) — commit: 0a173bf; DB fixes: 0ce79a0, ce7a477, 92b6e6b, 85a76ce
- [x] Plan 05: Child join flow at /onboarding/join + middleware redirect fix — commits: f462c02, fc72a20

### Phase 1.3 — Flexible Categories + Schedule (COMPLETE, 4/4 plans)
- [x] Plan 01: SQL migration — categories, tasks, schedule_items, push_subscriptions tables + RLS + seed_default_categories() — commit: df64c43
- [x] Plan 02: Categories API layer — categories-api.ts, schedule-api.ts, push-api.ts; store.ts extended with familyId; createFamily wired to seedDefaultCategories — commits: 5f92d7f, d46273a
- [x] Plan 03: Settings page full redesign — app/settings/page.tsx + 6 sub-components in components/settings/ — commits: 8c739d2, 4ff66fb
- [x] Plan 04: Push notifications — web-push Server Action + PWA manifest + service worker + PushInit in root layout — commits: 83dbe67, 96e0dff

### Phase 1.4 — Dashboard Refactor (IN PROGRESS, 2/3 plans)
- [x] Plan 01: useFamilyMembers hook + store.ts cleanup (remove childId/setChildId) — commits: d8720f6, da9750d
- [x] Plan 02: NavBar dynamic pill buttons + ExpenseModal/AuditLogViewer/PotentialWidget dynamic props — commits: 8552a2e, 45e63e8

---

## Следующий шаг

**→ Phase 1.4 Plan 03: Page migration** — update all pages (dashboard, wallet, analytics, wallboard, expenses, audit) to use activeMemberId from store instead of legacy childId

---

## Прогресс по Milestone'ам

### Milestone 1 — Foundation
```
Phase 1.1  [x] Новая схема БД (families, RLS, Auth) — COMPLETE (3/3 plans)
Phase 1.2  [x] Onboarding Flow — COMPLETE (5/5 plans)
Phase 1.3  [x] Гибкие категории + расписание — COMPLETE (4/4 plans)
Phase 1.4  [~] Dashboard рефактор (1/3 plans done)
```

### Milestone 2 — Core Loop
```
Phase 2.1  [ ] Движок монет (гибкий, настраиваемый)
Phase 2.2  [ ] Кошелёк и магазин
Phase 2.3  [ ] Бейджи и достижения
Phase 2.4  [ ] Аналитика
```

### Milestone 3 — Communication
```
Phase 3.1  [ ] Уведомления об успехах
Phase 3.2  [ ] Семейный чат
Phase 3.3  [ ] Голосовые сообщения и медиа
```

### Milestone 4 — PWA Polish
```
Phase 4.1  [ ] PWA (Service Worker, Manifest)
Phase 4.2  [ ] Performance & UX (анимации, skeleton)
Phase 4.3  [ ] Локализация RU/EN
Phase 4.4  [ ] Безопасность (COPPA, GDPR)
```

### Milestone 5 — Monetization
```
Phase 5.1  [ ] Freemium лимиты
Phase 5.2  [ ] Stripe подписка
Phase 5.3  [ ] Реферальная программа
```

### Milestone 6 — Social
```
Phase 6.1  [ ] Дружба семей
Phase 6.2  [ ] Совместные челленджи
Phase 6.3  [ ] Библиотека шаблонов
```

### Milestone 7 — Native Apps
```
Phase 7.1  [ ] React Native / Expo
Phase 7.2  [ ] App Store
Phase 7.3  [ ] Google Play
```

---

## Решения зафиксированные в ходе обсуждения

| Решение | Выбор | Причина |
|---|---|---|
| Платформа (приоритет) | PWA → Native | Быстрый запуск, потом App Store |
| Стек | Next.js + Supabase + Tailwind | Уже используется, не менять |
| Auth | Supabase Auth (email + Google) | Встроено в Supabase |
| Стейт | Zustand | Уже используется |
| Подписка | Freemium → $4.99/мес | Пробный период 30 дней |
| Монеты | Виртуальные + конвертация в деньги | Гибкость |
| Чат | Supabase Realtime | Встроено, реал-тайм |
| Дружба семей | Да, но M6 (не MVP) | Сначала фундамент |
| Штрафы | Да, оставляем | Реализм, ответственность |
| Магазин | Родитель создаёт позиции | Гибкость |
| Подтверждение покупок | Родитель одобряет | Контроль |

### Phase 1.4 Plan 02 — Ключевые решения (2026-03-08)

| Решение | Выбор | Причина |
|---|---|---|
| ExpenseModal members prop | Обязательный (required) | Без списка членов нельзя отрисовать динамический picker |
| displayName на AuditLogViewer/PotentialWidget | Опциональный | Backward compat; callers не обновлены до Plan 03 |
| app/expenses/page.tsx патч | Rule 3 auto-fix в Task 2 | required prop вызвал TS ошибку у единственного caller |

### Phase 1.4 Plan 01 — Ключевые решения (2026-03-08)

| Решение | Выбор | Причина |
|---|---|---|
| Legacy childId/setChildId | Удалены из store.ts в Phase 1.4 Plan 01 | activeMemberId (UUID) — единственный идентификатор ребёнка |
| REQ-FAM-011 (Delete member) | Отложен до Phase 2.x | Phase 1.1 RLS уже защищает на уровне БД; UI удаления — вне скоупа 1.4 |
| REQ-SEC-002 (Parent PIN) | Pre-satisfied в Phase 1.3 | app/settings/page.tsx PIN gate не тронут в Phase 1.4 |
| useFamilyMembers queries | 2 запроса на каждую страницу | Допустимо для семейного приложения с 2-3 детьми |

### Phase 1.3 Plan 04 — Ключевые решения (2026-03-07)

| Решение | Выбор | Причина |
|---|---|---|
| CRON_SECRET обязательность | Опционален | Dev-режим работает без него; production должен установить для безопасности |
| PushInit поведение без поддержки | Silently no-ops | App полностью функционален без push; не блокируем работу |
| Test notification flow | Прямой Server Action вызов | Нет нужды в промежуточном API route для тестовой отправки |
| Иконки PWA | Не создаются в этом плане | manifest работает без иконок; браузер деградирует корректно; добавить в /public/ отдельно |

### Phase 1.3 Plan 03 — Ключевые решения (2026-03-07)

| Решение | Выбор | Причина |
|---|---|---|
| CoinRules/StreakSettings хранение | localStorage (family-scoped key) | Нет нового столбца в БД в Phase 1.3; Phase 2.1 мигрирует в coin_rules таблицу |
| Settings familyId источник | supabase.auth.getUser() + family_members query | Multi-tenant; не из legacy Zustand store |
| urlBase64ToUint8Array тип | Возвращает ArrayBuffer | TypeScript strict: Uint8Array<ArrayBufferLike> несовместим с BufferSource для PushManager.subscribe |

### Phase 1.3 Plan 02 — Ключевые решения (2026-03-07)

| Решение | Выбор | Причина |
|---|---|---|
| API параметры | familyId передаётся явно в каждую функцию | Multi-tenant паттерн; не тянем из store, caller контролирует scope |
| createClient() | lib/supabase/client.ts (не legacy lib/supabase.ts) | Консистентность с Phase 1.1; SSR-safe |
| seedDefaultCategories в createFamily | try/catch, non-fatal | Convenience defaults; семья создаётся успешно даже без них |
| Legacy childId в store | Сохранён рядом с familyId + activeMemberId | Backward compat до Phase 1.4; преждевременное удаление сломает все существующие страницы |
| push-api.ts | Только browser-side хранение | Server-side отправка пушей — отдельный Server Action в app/actions/push.ts |

### Phase 1.3 Plan 01 — Ключевые решения (2026-03-07)

| Решение | Выбор | Причина |
|---|---|---|
| RLS для новых таблиц | Тот же паттерн family_id IN (...) что и в rls.sql | Консистентность; get_my_family_ids() уже задефайнен |
| seed_default_categories | SECURITY DEFINER + ON CONFLICT DO NOTHING | Идемпотентность; безопасно вызывать несколько раз |
| Старая таблица schedule | Не трогать, новая schedule_items рядом | Backward compat до Phase 1.4 |
| push_subscriptions UNIQUE | (member_id, (subscription->>'endpoint')) | Один row на device, предотвращает дубли |
| tasks.child_member_id | NULL = все дети, non-null = конкретный ребёнок | Гибкость для семей с детьми разного возраста |

### Phase 1.2 Plan 05 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| joinFamilyAsChild flow | Upsert with onConflict: family_id,user_id | Child picks pre-created profile → links auth UID to existing null-user_id row |
| Empty children list UX | Helpful message (не ошибка) | Parent may not have added children yet; child can ask parent first |
| Avatar emoji detection | !avatarUrl.startsWith('http') → treat as emoji | Wizard stores emoji strings directly; this is consistent with parent wizard pattern |
| Child join page routing | No URL change between screens (screen: 'code' | 'confirm' state) | 2-screen flows don't warrant separate routes |

### Phase 1.2 Plan 04 — Ключевые решения (2026-03-02)

| Решение | Выбор | Причина |
|---|---|---|
| Категории — Phase 1.2 | UI only, без записи в DB | Таблицы категорий создаются в Phase 1.3; Step 5 вызывает только updateOnboardingStep |
| family_members.user_id | Nullable | Дочерние профили создаются без auth-аккаунта; привязка при присоединении по invite code |
| families.created_by | UUID column добавлен | RLS SELECT после INSERT до создания family_members row требует прямой проверки created_by |
| RLS рекурсия | SECURITY DEFINER хелперы | Рекурсивная политика family_members вызывала stack overflow; хелпер get_my_family_ids() решает проблему |

### Phase 1.2 Plan 03 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| Wizard state | WizardData для cross-step данных, local state для form fields | Избежать засорения верхнего уровня транзиентными полями формы |
| Photo upload timing | Дефер до submit (не на file select) | Предотвращение orphaned объектов в Supabase Storage |
| addChildToFamily arg order | (familyId, parentUserId, child) | Реальная сигнатура функции; план показывал перепутанный порядок аргументов |
| Back button scope | Steps 1-4 only | Step 0 нет кнопки "назад"; steps 5+ — placeholder, навигация не имеет смысла |

### Phase 1.2 Plan 02 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| Auth page styling | Inline styles + CSS variables | Прямое использование --emerald-500 и др. из globals.css |
| Google G icon | Inline SVG | Без внешних зависимостей для единственного логотипа |
| Forgot password UX | Email поле → затем клик | Нет отдельного поля; один шаг для пользователя |
| Register dual-mode | Обрабатывает оба случая Supabase | email-confirmation on=show UI, off=redirect to /dashboard |
| Auth pages | Без NavBar | Pre-auth страницы — gates, не app pages |

### Phase 1.1 Plan 03 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| Middleware family_members check | DB roundtrip на каждый запрос | Просто и корректно; оптимизация в Phase 1.4 |
| Onboarding paths | Auth-required, но family-check exempt | Пользователь создаёт семью после регистрации |
| /auth/callback | Поддержка `next` query param | Deep-link redirects post-auth |
| OAuth config | Supabase Dashboard + Google Cloud Console | Phase 1.2 user setup (не автоматизируется) |

### Phase 1.1 Plan 02 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| Browser client library | createBrowserClient (@supabase/ssr) | Автоматическая работа с cookies, не supabase-js |
| server.ts async | async createClient() + await cookies() | next/headers cookies() — async API в Next.js 14 |
| middleware export | updateSession() вместо createClient() | Клиент и response держать вместе, иначе cookie desync |
| JWT validation | getUser() не getSession() | getSession() не валидирует JWT на сервере Supabase |
| lib/supabase.ts | Сохранён без изменений | Backward compat — все существующие страницы работают |

### Phase 1.1 Plan 01 — Ключевые решения (2026-03-01)

| Решение | Выбор | Причина |
|---|---|---|
| family_id nullable | Nullable до Phase 1.4 | NOT NULL сломает существующий TypeScript |
| child_id сохраняется | Не удалять до Phase 1.4 | Все lib/* файлы используют child_id = 'adam'/'alim' |
| exercise_types family_id | NULL = global, non-null = family override | Глобальные упражнения доступны всем |
| Bootstrap семья | LEGACY invite_code | Идемпотентность через ON CONFLICT |
| Auth trigger | EXCEPTION block + SECURITY DEFINER | Никогда не блокировать регистрацию |
| RLS performance | (SELECT auth.uid()) wrapper | Избежать re-evaluation per row |

---

## Файлы планирования

```
.planning/
├── PROJECT.md              ✅ готов
├── REQUIREMENTS.md         ✅ готов (108 требований)
├── ROADMAP.md              ✅ готов (7 milestones)
├── STATE.md                ✅ этот файл
├── ARCHITECTURE.md         ✅ готов (схема БД, стек)
├── ONBOARDING.md           ✅ готов (все экраны)
├── CODEBASE-ANALYSIS.md    ✅ готов (анализ текущего кода)
└── phases/                 📁 будет заполняться в процессе
```

---

## Важные числа из анализа кода

- **Таблиц в БД:** 28 (уже существующих)
- **Страниц:** 7 (`/dashboard`, `/wallet`, `/analytics`, `/wallboard`, `/expenses`, `/settings`, `/audit`)
- **Компонентов:** 13
- **API функций:** ~60
- **Hardcoded мест:** 10+ файлов с 'adam'/'alim'
- **% функциональности готово:** ~60%
- **Требований P1:** 58 (критичных)

---

*Файл STATE.md обновляется автоматически GSD агентами после каждой фазы.*
