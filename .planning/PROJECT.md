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

## Shipped: v2.0 — Role-Based UI (2026-04-13)

Two fully separate experiences now exist — Parent Center (dark, control-focused) and Kid Screen (bright, gamified). Any family can register, add children, and start earning coins in under 3 minutes. Children without email can log in via PIN.

**What shipped:**
- `/parent/*` — dark dashboard, daily input, wallets, analytics, shop, PIN-protected settings
- `/kid/*` — My Day, wallet, achievements (badges/streaks/XP), shop, leaderboard
- Shop approval flow — freeze → approve/reject; parent preview mode
- Kid day-fill form — room checklist, mood, activities, live coin counter; configurable fill-mode per child
- Push notifications + animations — cron reminders, coin fly-up, confetti celebrations
- 5-step onboarding wizard — writes family, children, wallets to DB end-to-end
- Child PIN login — family code → pick name → 4-digit PIN → `/kid/day`

**Technical state as of v2.0:**
- ~14,000 LOC TypeScript/TSX in `app/` + `lib/`
- Supabase (PostgreSQL + Auth + Storage + Realtime ready)
- Next.js 14 App Router, Tailwind CSS + custom globals.css
- Vercel deployment at kids-motivation.vercel.app

---

## Current Milestone: v3.0 — Communication

**Goal:** Make the family experience alive with real-time communication. Parents confirm tasks with personal messages; achievements auto-post to family chat; photos provide task proof.

**Target features:**
- Push notifications for task confirmations, badge earnings, wallet credits, and "Medal of the Day"
- Real-time family group chat (Supabase Realtime) with reactions and stickers
- Achievement events auto-post to chat
- Photo and voice messages in chat
- Photo proof of task completion

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

### Active (v3.0)

- [ ] Push notifications for task confirmations, badge earnings, wallet credits
- [ ] "Medal of the Day" — parent sends personal message with bonus coins
- [ ] Real-time family group chat (Supabase Realtime)
- [ ] Message reactions (❤️ 👍 🔥 🏆) and sticker pack
- [ ] Achievement events auto-post to family chat
- [ ] Photo and voice messages in chat
- [ ] Photo proof of task completion

### Out of Scope (current)

- Apple ID login — Google + email sufficient for beta
- Old pages (/dashboard, /wallet, /analytics) — fully replaced by /parent/* and /kid/*
- Offline mode — real-time Supabase is core requirement
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

---

*Документ создан: 2026-03-01. Обновлён: 2026-04-13 после v2.0 milestone.*
