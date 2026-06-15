# 🚀 Kids Motivation

Семейная система мотивации детей: дети зарабатывают монеты за учёбу, спорт,
порядок и активности и тратят их на награды.

> ⚠️ **Архитектура обновлена до мультисемейной (любая семья регистрируется).**
> Этот README местами описывает старую одно-семейную версию (Адам/Алим). Актуальная
> документация — в **`CLAUDE.md`** и **`project-docs/`** (overview, architecture,
> security-model, api-spec, data-model, deployment, …). Деньги/кошелёк мутируются
> только на сервере (service-role); таблицы денег RLS-залочены на чтение для клиента.

## ✨ Фишки Silicon Valley

### От Duolingo
- ✅ **Streaks** - серии дней подряд с огоньками 🔥
- ✅ **Daily goals** - ежедневные цели
- ✅ **XP система** - опыт и уровни
- ✅ **Achievements** - достижения с бейджами
- ✅ **Leaderboard** - соревнование между братьями

### От Notion
- ✅ **Clean UI** - минималистичный интерфейс
- ✅ **Keyboard shortcuts** - быстрые клавиши
- ✅ **Inline editing** - редактирование на месте

### От Linear
- ✅ **Command palette** - быстрый поиск (Cmd+K)
- ✅ **Status indicators** - индикаторы состояния
- ✅ **Smooth animations** - плавные анимации

### От Stripe
- ✅ **Beautiful forms** - красивые формы
- ✅ **Inline validation** - валидация на лету
- ✅ **Micro-interactions** - микро-взаимодействия

## 📊 Основные возможности

### 1️⃣ Ежедневный ввод (Daily Modal)
**4 раздела:**

**📚 УЧЁБА**
- Добавление оценок по предметам
- Автокомплит предметов (как в Notion)
- Быстрое копирование вчерашнего дня
- Цветовая индикация оценок

**🧹 КОМНАТА**
- 5 чекбоксов (кровать, пол, стол, шкаф, мусор)
- RoomScore (3 из 5 = день засчитан)
- Прогресс-бар в реальном времени

**😊 ДЕНЬ**
- Хорошее поведение
- Дневник
- Заметка родителя

**💪 СПОРТ** (НОВОЕ!)
- Домашний спорт (пробежка, упражнения, игры, растяжка)
- Трекер времени
- Секции с оценкой тренера

### 2️⃣ Массовый ввод (Bulk Modal)
- Таблица для ввода оценок за неделю
- Keyboard navigation (Tab, Enter, Arrow keys)
- Copy/Paste поддержка
- Автосохранение

### 3️⃣ Цели (Goals Modal)
**Детальная визуализация:**
- Прогресс-бар с анимацией
- Milestone celebrations (25%, 50%, 75%, 100%)
- Confetti при достижении 🎉
- История накоплений
- График роста

### 4️⃣ Геймификация
- **XP система** - опыт за действия
- **Уровни** - прогресс до следующего уровня
- **Челленджи** - недельные задачи
- **Бейджи** - достижения

### 5️⃣ Стрики (Streaks)
- 🧹 Комната 7 дней подряд
- 📚 Учёба 14 дней подряд
- 💪 Спорт 7 дней подряд
- 👑 Месяц стабильности

## 🗄️ База данных

**15 таблиц в Supabase:**
1. children - дети (с XP и уровнями)
2. settings - настройки
3. days - ежедневные записи
4. subject_grades - оценки по предметам
5. subjects_cache - кеш предметов для автокомплита
6. home_sports - домашний спорт (НОВОЕ!)
7. sports_sections - секции (НОВОЕ!)
8. section_attendance - посещения секций (НОВОЕ!)
9. goals - цели
10. goal_log - лог изменений целей
11. weeks - закрытые недели
12. streaks - серии
13. badges - бейджи
14. records - рекорды
15. challenges - челленджи (НОВОЕ!)

## 🚀 Деплой на Vercel

### Шаг 1: Supabase (5 минут)

1. **Создать проект:**
   ```
   https://supabase.com
   → Sign Up / Login
   → New Project
   → Имя: kids-motivation-v2
   → Create
   ```

2. **Создать таблицы:**
   ```
   SQL Editor → New query
   → Открыть supabase-schema-v2.sql
   → Скопировать ВСЁ
   → Вставить и Run
   ```

3. **Получить ключи:**
   ```
   Settings → API
   → Project URL
   → anon public key
   ```

### Шаг 2: GitHub (2 минуты)

```bash
cd kids-motivation-v2
git init
git add .
git commit -m "Initial commit - Silicon Valley Edition"

# Создать репозиторий на github.com
git remote add origin https://github.com/YOUR_USERNAME/kids-motivation-v2.git
git push -u origin main
```

### Шаг 3: Vercel (3 минуты)

1. **Import проекта:**
   ```
   https://vercel.com
   → Login with GitHub
   → Add New → Project
   → Import kids-motivation-v2
   ```

2. **Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL = [твой Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [твой anon key]
   NEXT_PUBLIC_PARENT_PIN_HASH = MTIzNA==
   ```

3. **Deploy:**
   ```
   → Deploy
   → Ждать 2-3 минуты
   → Получить ссылку
   ```

## 💻 Локальная разработка

```bash
# Установить зависимости
npm install

# Создать .env.local
cp .env.local.example .env.local
# Заполнить ключи Supabase

# Запустить
npm run dev

# Открыть http://localhost:3000
```

## 📱 Структура проекта

```
kids-motivation-v2/
├── app/                    # Next.js App Router
│   ├── globals.css        # Глобальные стили (Silicon Valley)
│   ├── layout.tsx         # Главный layout
│   ├── page.tsx           # Редирект на /kid
│   ├── kid/              # Kid Screen
│   ├── analytics/        # Analytics
│   ├── weekly/           # Weekly Review
│   └── ...
├── components/            # React компоненты
│   ├── NavBar.tsx        # Навигация
│   ├── DailyModal.tsx    # Ежедневный ввод (4 раздела)
│   ├── GoalsModal.tsx    # Цели с визуализацией
│   ├── BulkModal.tsx     # Массовый ввод
│   └── ...
├── lib/                  # Библиотеки
│   ├── supabase.ts       # Supabase клиент
│   └── api.ts            # API функции
├── utils/                # Утилиты
│   └── helpers.ts        # Функции для дат и расчетов
├── hooks/                # React hooks
├── supabase-schema-v2.sql # SQL схема
├── package.json
└── README.md
```

## 🎯 Ключевые компоненты

### Daily Modal - 4 раздела
```typescript
<DailyModal>
  <Tab value="study">    // Учёба
  <Tab value="room">     // Комната
  <Tab value="day">      // День
  <Tab value="sport">    // Спорт (НОВОЕ!)
</DailyModal>
```

### Goals Modal - Детальная визуализация
```typescript
<GoalsModal>
  <ProgressBar animated />
  <Confetti onComplete />
  <MilestoneCard />
  <HistoryChart />
</GoalsModal>
```

### Bulk Modal - Таблица ввода
```typescript
<BulkModal>
  <WeekPicker />
  <SubjectTable 
    keyboard={true}
    copyPaste={true}
    autoSave={true}
  />
</BulkModal>
```

## 🎨 Дизайн система

**Цвета:**
- Success: `#10b981` (emerald-500)
- Goal: `#f59e0b` (amber-500)
- Info: `#3b82f6` (blue-500)
- Danger: `#ef4444` (red-500)

**Градиенты:**
- Success: `linear-gradient(135deg, #10b981, #059669)`
- Goal: `linear-gradient(135deg, #f59e0b, #d97706)`
- Streak: `linear-gradient(135deg, #f97316, #ea580c)`

**Анимации:**
- Buttons: ripple effect
- Cards: hover lift
- Progress: shimmer
- Modals: slide up + fade

## 🔐 Безопасность

- **Auth:** Supabase Auth. Родитель — email/пароль; ребёнок — код семьи + 4-значный
  PIN (синтетический Supabase-юзер, bcrypt+соль). `middleware.ts` защищает
  `/parent/*` (только родитель) и `/kid/*` (только ребёнок) через `getUser()`.
- **RLS:** family-isolation для роли `authenticated`; у `anon` нет доступа к
  таблицам (pre-login — через SECURITY DEFINER RPC). Денежные таблицы — SELECT-only
  для клиента, запись только через server-роуты (service-role).
- **Деньги на сервере:** `app/api/wallet/*` + server-actions, guards в
  `lib/supabase/admin.ts`. Начисления идемпотентны.
- **Cron/push:** `CRON_SECRET` (fail-closed). **Env-секреты:** `SUPABASE_SERVICE_ROLE_KEY`
  и `CRON_SECRET` обязательны в Vercel. Подробности — `project-docs/security-model.md`.
- HTTPS через Vercel.

## 📊 Расчёты

### Недельный заработок:
```javascript
Базовая сумма: 500₽

Режим "Все пятёрки": 500₽
ИЛИ
Оценки:
  5 → +50₽
  4 → +10₽
  3 → -50₽
  2 → -100₽

Комната:
  5-6 дней → +50₽
  7 дней → +100₽

Спорт (НОВОЕ):
  3+ занятий → +150₽

Стрики:
  Комната 7 дней → +100₽
  Учёба 14 дней → +100₽
  Спорт 7 дней → +100₽
  Сильная неделя → +200₽
```

## 🆘 Помощь

**Ошибки подключения:**
- Проверь Environment Variables в Vercel
- Проверь RLS policies в Supabase

**Пустые данные:**
- Проверь таблицу `children` в Supabase
- Выполни SQL скрипт еще раз

**Локальная разработка:**
```bash
npm install
cp .env.local.example .env.local
# Заполнить переменные
npm run dev
```

## 🎉 Готово!

Теперь у тебя есть полноценная система мотивации со всеми фишками Silicon Valley! 🚀

**PIN код:** 1234 (можно поменять в .env)

---

Made with 💚 for Адам and Алим
