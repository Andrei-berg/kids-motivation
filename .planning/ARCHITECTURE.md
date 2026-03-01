# ARCHITECTURE.md — Техническая архитектура

> Принцип: начинаем с того что знаем (Next.js + Supabase), добавляем то что нужно. Никакого over-engineering.

---

## 1. Обзор стека

```
┌─────────────────────────────────────────────────────────┐
│                    КЛИЕНТ                               │
│  Next.js 14 App Router (PWA)                           │
│  React + TypeScript + Tailwind CSS                     │
│  Zustand (global state)                                │
│  Framer Motion (animations)                            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                    BACKEND                              │
│  Supabase                                               │
│  ├── PostgreSQL (database)                             │
│  ├── Auth (email / Google / Apple)                     │
│  ├── Realtime (чат, уведомления)                       │
│  ├── Storage (аватары, фото)                           │
│  └── Edge Functions (бизнес-логика, webhooks)          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    СЕРВИСЫ                              │
│  Stripe (подписки и платежи)                           │
│  Resend (email уведомления)                            │
│  Expo (push notifications для native)                  │
│  Vercel (деплой)                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Почему этот стек

| Решение | Альтернативы | Почему выбрали |
|---|---|---|
| Next.js 14 | Remix, Vite+React | Знакомо, App Router = отличная PWA основа |
| Supabase | Firebase, PlanetScale | Уже используется, PostgreSQL = мощные запросы, RLS = безопасность |
| Zustand | Redux, Jotai | Уже используется, простой, надёжный |
| Tailwind | MUI, Chakra | Уже используется, быстрый UI |
| Stripe | LemonSqueezy, Paddle | Стандарт индустрии, лучшая документация |

---

## 3. Multi-tenant архитектура

### Принцип изоляции
Каждая семья — это `family`. Все данные привязаны к `family_id`. Row Level Security (RLS) в Supabase гарантирует, что семья A никогда не увидит данные семьи B.

```sql
-- Пример RLS политики
CREATE POLICY "Family members only" ON days
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );
```

### Иерархия данных
```
auth.users (Supabase Auth)
    └── user_profiles (имя, аватар, часовой пояс)
            └── family_members (role: parent|child|extended)
                    └── families (название, код приглашения)
                            ├── children_profiles (имя, возраст, аватар)
                            ├── categories (учёба, дом, спорт...)
                            ├── schedules (расписание)
                            ├── days (ежедневные отметки)
                            ├── wallets (баланс)
                            ├── transactions (история)
                            ├── shop_items (магазин)
                            ├── badges (бейджи)
                            └── messages (чат)
```

---

## 4. Схема базы данных

### Ключевые таблицы

```sql
-- Профили пользователей
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Семьи
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Члены семьи
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child', 'extended')),
  display_name TEXT,  -- имя внутри семьи
  avatar_url TEXT,
  birth_year INT,     -- для детей
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Категории (гибкие, настраиваются семьёй)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,       -- emoji или иконка
  color TEXT,               -- hex цвет
  type TEXT NOT NULL,       -- 'study' | 'home' | 'sport' | 'routine' | 'behavior' | 'custom'
  coins_reward INT DEFAULT 0,
  coins_penalty INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Задачи (конкретные обязанности)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  child_id UUID REFERENCES family_members(id),
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'daily',  -- daily|weekly|once
  day_of_week INT[],              -- для weekly
  reminder_time TIME,
  coins_reward INT,               -- override от категории
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Ежедневные отметки
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  child_id UUID REFERENCES family_members(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'pending'  -- pending|done|confirmed|rejected
    CHECK (status IN ('pending', 'done', 'confirmed', 'rejected')),
  coins_earned INT DEFAULT 0,
  note TEXT,
  proof_url TEXT,     -- фото как доказательство
  confirmed_by UUID REFERENCES family_members(id),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(task_id, child_id, date)
);

-- Оценки (учёба)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  child_id UUID REFERENCES family_members(id),
  date DATE NOT NULL,
  subject TEXT NOT NULL,
  grade INT CHECK (grade BETWEEN 1 AND 5),
  coins_earned INT,
  note TEXT
);

-- Кошельки
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  child_id UUID REFERENCES family_members(id) UNIQUE,
  balance INT DEFAULT 0 CHECK (balance >= 0)
);

-- Транзакции
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  wallet_id UUID REFERENCES wallets(id),
  type TEXT NOT NULL,  -- 'earn'|'spend'|'penalty'|'p2p_in'|'p2p_out'|'reward'
  amount INT NOT NULL,
  description TEXT,
  reference_id UUID,   -- ID задачи, покупки, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Позиции магазина
CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  title TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  type TEXT DEFAULT 'virtual',  -- virtual|physical|experience|cash
  image_url TEXT,
  cash_value NUMERIC(10,2),    -- если тип cash
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true
);

-- Покупки
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_item_id UUID REFERENCES shop_items(id),
  child_id UUID REFERENCES family_members(id),
  status TEXT DEFAULT 'pending'  -- pending|approved|rejected|delivered
    CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  coins_spent INT NOT NULL,
  approved_by UUID REFERENCES family_members(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Стрики
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES family_members(id) UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE
);

-- Бейджи
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES family_members(id),
  badge_key TEXT NOT NULL,   -- 'first_streak', 'hundred_coins', etc.
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, badge_key)
);

-- Сообщения (чат)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  sender_id UUID REFERENCES family_members(id),
  recipient_id UUID REFERENCES family_members(id),  -- NULL = все
  type TEXT DEFAULT 'text',  -- text|sticker|voice|achievement
  content TEXT,
  media_url TEXT,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Подписки
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) UNIQUE,
  plan TEXT DEFAULT 'free'  -- free|premium|family_plus
    CHECK (plan IN ('free', 'premium', 'family_plus')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);
```

---

## 5. Файловая структура (новый проект)

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (onboarding)/
│   │   ├── welcome/page.tsx
│   │   ├── create-family/page.tsx
│   │   ├── add-children/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── wallet/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── shop/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── settings/
│   │   │   ├── family/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   └── subscription/page.tsx
│   │   └── layout.tsx  (NavBar здесь)
│   ├── api/
│   │   ├── webhooks/stripe/route.ts
│   │   └── invites/[code]/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── onboarding/
│   ├── dashboard/
│   ├── daily/
│   │   └── DailyModal.tsx
│   ├── wallet/
│   ├── shop/
│   ├── chat/
│   ├── analytics/
│   └── ui/              (базовые компоненты)
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Avatar.tsx
│       └── ...
├── lib/
│   ├── supabase.ts       (client + server)
│   ├── store.ts          (Zustand)
│   ├── api/
│   │   ├── families.ts
│   │   ├── tasks.ts
│   │   ├── wallet.ts
│   │   ├── shop.ts
│   │   ├── analytics.ts
│   │   ├── chat.ts
│   │   └── badges.ts
│   ├── coins.ts          (движок начисления монет)
│   ├── streaks.ts
│   └── notifications.ts
├── public/
│   ├── manifest.json     (PWA)
│   ├── sw.js             (Service Worker)
│   └── icons/
├── supabase/
│   ├── schema.sql        (полная схема)
│   ├── rls.sql           (политики безопасности)
│   └── seed.sql          (тестовые данные)
└── middleware.ts          (защита роутов)
```

---

## 6. Аутентификация и роутинг

```typescript
// middleware.ts
// Неаутентифицированные → /login
// Аутентифицированные без семьи → /onboarding/welcome
// Аутентифицированные с семьёй → /dashboard
```

---

## 7. Real-time чат (Supabase Realtime)

```typescript
// Подписка на новые сообщения семьи
const channel = supabase
  .channel(`family:${familyId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `family_id=eq.${familyId}`
  }, (payload) => {
    addMessage(payload.new)
  })
  .subscribe()
```

---

## 8. PWA конфигурация

```json
// public/manifest.json
{
  "name": "KidsCoins",
  "short_name": "KidsCoins",
  "description": "Семейная система мотивации",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0f0f23",
  "theme_color": "#6366f1",
  "icons": [...]
}
```

---

## 9. Принципы кода

1. **TypeScript везде** — строгая типизация, никаких `any`
2. **Server Components** там где нет интерактивности
3. **Optimistic UI** — UI обновляется мгновенно, запрос идёт в фоне
4. **Error boundaries** — каждый раздел обёрнут в error boundary
5. **Loading states** — skeleton loaders везде
6. **Mobile-first** — все компоненты тестируются сначала на 375px
7. **Accessibility** — aria-labels, keyboard navigation, contrast ratio

---

*Документ создан: 2026-03-01. Версия 1.0.*
