---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-02T00:00:00Z"
progress:
  total_phases: 24
  completed_phases: 1
  total_plans: 8
  completed_plans: 8
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-03-02 (01.2-04 complete — 7-step onboarding wizard complete with confetti, categories UI, /dashboard redirect; 4 DB/RLS fixes applied)

---

## Статус проекта

```
🟢 EXECUTING — Phase 1.2 IN PROGRESS (Plan 04/05 COMPLETE, ready for Plan 05: child join flow at /onboarding/join)
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

### Phase 1.2 — Onboarding (IN PROGRESS, 4/5 plans complete)
- [x] Plan 01: Schema patch (onboarding_step, avatars bucket) + lib/onboarding-api.ts
- [x] Plan 02: /login and /register pages with Google OAuth + email/password
- [x] Plan 03: Onboarding wizard steps 0-4 (welcome, profile, family, add child, invite) — commit: e0c8fd7
- [x] Plan 04: Onboarding wizard steps 5-6 (categories toggle, confetti + Done screen) — commit: 0a173bf; DB fixes: 0ce79a0, ce7a477, 92b6e6b, 85a76ce
- [ ] Plan 05: Child join flow at /onboarding/join + middleware redirect fix

---

## Следующий шаг

**→ Phase 1.2 Plan 05: Child Join Flow** (/onboarding/join — child enters 6-digit invite code + middleware redirect fix)

---

## Прогресс по Milestone'ам

### Milestone 1 — Foundation
```
Phase 1.1  [x] Новая схема БД (families, RLS, Auth) — COMPLETE (3/3 plans)
Phase 1.2  [ ] Onboarding Flow
Phase 1.3  [ ] Гибкие категории + расписание
Phase 1.4  [ ] Dashboard рефактор (убрать hardcodes)
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
