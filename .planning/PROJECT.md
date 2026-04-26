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

## Shipped: v3.0 — Communication (2026-04-26)

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

## Current Milestone: v4.0 — PWA Polish

**Goal:** Make FamilyCoins installable and production-ready for the first 1,000 families — PWA install, offline support, UX polish, localization, security/compliance, and a dedicated desktop layout.

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

### Active (v4.0)

- [ ] PWA install prompt (iOS + Android) — manifest, service worker, Add to Home Screen
- [ ] Web Push when app is closed — service worker handles background push
- [ ] Basic offline support — cached shell loads when offline; graceful degradation
- [ ] Skeleton loaders + Framer Motion transitions — no layout shifts
- [ ] 44px touch targets throughout — mobile-first interaction quality
- [ ] Russian + English localization — auto-detect from browser, i18n files
- [ ] COPPA/GDPR compliance — account deletion, data export, consent gate
- [ ] Audit log for parent actions
- [ ] Desktop UI redesign — separate layout for wide screens (sidebar nav, multi-column dashboard, full-screen chat); designed with Claude design

### Out of Scope (current)

- Apple ID login — Google + email sufficient for beta
- Voice messages in chat — Supabase Pro storage cost; defer to v5.0+
- Video messages — high storage/bandwidth cost
- Offline mode for Realtime chat — real-time is core; degradation is sufficient
- B2B teacher/coach accounts — post-product-market-fit
- Freemium limits + Stripe — v5.0
- Native mobile (Expo) — v7.0

---

## Key Decisions

| Decision | Outcome | Status |
|----------|---------|--------|
| Next.js App Router over Pages Router | Clean auth/layout split per role | ✓ Good |
| Supabase Auth with synthetic emails for child PIN | No email required; `child_{id}@internal.familycoins.app` pattern | ✓ Good |
| Separate /parent/* and /kid/* route trees | Middleware enforces roles; no shared layout complexity | ✓ Good |
| PIN stored as SHA-256 hash in family_members.child_pin_hash | Security without bcrypt overhead | ✓ Good |
| Kid fill-mode as integer enum (1/2/3) in children table | Flexible per-child config without extra tables | ✓ Good |
| Zustand store for familyId + activeMemberId | Replaces legacy childId='adam'/'alim' hardcodes | ✓ Good |
| Coins calculated on-the-fly from days + subject_grades | No finalization step needed; analytics always current | ✓ Good |
| Supabase Realtime for chat (not Socket.io/Pusher) | Built into stack; free tier (200 concurrent, 2M msg/month) sufficient for beta | ✓ Good |
| notifyChild swallows all push errors silently | Push must never break business logic (approval, badge award, wallet) | ✓ Good |
| sender_id TEXT matches family_members.id convention | Consistent with existing id column type; no UUID conversion needed | ✓ Good |
| Photo URLs stored as 1h signed URLs in DB | Simple for MVP; long-lived URL management deferred | — Pending revisit |
| family-photos bucket is private (public=false) | Prevents enumeration; all access via signed URLs | ✓ Good |

---

*Документ создан: 2026-03-01. Обновлён: 2026-04-26 после v3.0 milestone.*
