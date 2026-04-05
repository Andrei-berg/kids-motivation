# Kid Screen UI Design Spec

**Phase:** 02.3  
**Status:** Design complete, ready for implementation  
**Route:** `/kid/*` (5 sub-routes with shared layout)  
**Audience:** Children ages 8-14, mobile-first  

---

## 1. Color Palette & Typography

### Kid-Mode Color System

The kid screens use a completely different palette from the parent center. Where the parent center is `bg-gray-950 text-gray-100` (dark, serious, admin), the kid screen is bright, warm, and full of energy.

**Primary Palette (Tailwind classes):**

| Role | Class | Hex | Usage |
|---|---|---|---|
| Background | `bg-amber-50` | #fffbeb | Page background, warm parchment feel |
| Surface | `bg-white` | #ffffff | Cards |
| Primary accent | `bg-violet-500` | #8b5cf6 | Buttons, active tab, interactive elements |
| Primary hover | `bg-violet-600` | #7c3aed | Button hover |
| Secondary accent | `bg-amber-400` | #fbbf24 | Coin indicators, earnings, stars |
| Success | `bg-emerald-400` | #34d399 | Streaks, room OK, positive states |
| Danger | `bg-rose-400` | #fb7185 | Penalties, negative grades, warnings |
| XP / Level | `bg-cyan-400` | #22d3ee | XP bar, level badge |
| Fire / Streak | `bg-orange-500` | #f97316 | Streak counter, fire animations |

**Gradients (defined as CSS custom properties in globals.css):**

```css
--kid-gradient-hero: linear-gradient(135deg, #8b5cf6, #6d28d9, #4c1d95);
--kid-gradient-coin: linear-gradient(135deg, #fbbf24, #f59e0b);
--kid-gradient-xp: linear-gradient(135deg, #22d3ee, #06b6d4);
--kid-gradient-streak: linear-gradient(135deg, #f97316, #ea580c);
--kid-gradient-badge: linear-gradient(135deg, #a78bfa, #7c3aed);
--kid-gradient-shop: linear-gradient(135deg, #fb7185, #e11d48);
```

**Card Shadows (softer, more playful than parent):**

```css
--kid-shadow: 0 4px 14px -2px rgba(139, 92, 246, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.06);
--kid-shadow-hover: 0 8px 24px -4px rgba(139, 92, 246, 0.2), 0 4px 8px -2px rgba(0, 0, 0, 0.08);
--kid-shadow-glow: 0 0 20px rgba(139, 92, 246, 0.3);
```

### Typography

Use the existing Inter font but with rounder, larger sizing:

| Element | Classes | Notes |
|---|---|---|
| Hero number (coin balance, level) | `text-4xl font-extrabold` (mobile) / `text-5xl` (desktop) | Gradient text via `bg-clip-text text-transparent` |
| Section heading | `text-lg font-bold` | Always accompanied by an emoji prefix |
| Card title | `text-base font-semibold` | |
| Body text | `text-sm font-medium` | Slightly bolder than parent to improve readability for kids |
| Caption / label | `text-xs font-medium text-gray-500` | |
| Big stat number | `text-3xl font-extrabold` | Used in streak counters, day scores |

### Card Style

Every card in kid mode uses:
```
bg-white rounded-2xl p-4 kid-shadow
```
Note `rounded-2xl` (16px) vs parent's `rounded-lg` (8px). Rounder = friendlier.

---

## 2. Navigation — Bottom Tab Bar

### Structure

Fixed bottom tab bar on mobile (`md:hidden`). On desktop (`hidden md:flex`), tabs move to a sticky top bar with the same icons and labels.

5 tabs, always visible:

| Order | Icon | Label (RU) | Route | Active Color |
|---|---|---|---|---|
| 1 | Sun/star SVG icon | Мой день | `/kid/day` | `text-violet-500` |
| 2 | Coin SVG icon | Кошелёк | `/kid/wallet` | `text-amber-500` |
| 3 | Trophy SVG icon | Достижения | `/kid/achievements` | `text-emerald-500` |
| 4 | Shopping bag SVG icon | Магазин | `/kid/shop` | `text-rose-500` |
| 5 | Crown/podium SVG icon | Рейтинг | `/kid/leaderboard` | `text-cyan-500` |

### Active State Design

- Active tab icon scales up slightly (`scale-110`) with a spring transition
- Active tab gets a colored dot indicator (4px circle) below the label, using the tab's own accent color
- Active tab label text uses the accent color; inactive tabs are `text-gray-400`
- Subtle background pill (`bg-violet-50`, `bg-amber-50`, etc.) behind the active icon on mobile

### Desktop Top Bar

- Full-width, `bg-white border-b border-gray-100`
- Child avatar + name on the left: `{emoji} {name}` with level badge
- Tab links centered
- No child-switcher visible (kid mode = one child only, derived from `activeMemberId` in Zustand store)

### Mobile Bottom Bar

```
fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md 
border-t border-gray-100 safe-area-bottom
```
- Height: 64px + safe area
- `safe-area-bottom` adds `padding-bottom: env(safe-area-inset-bottom)` for notched phones

---

## 3. Screen-by-Screen Breakdown

---

### 3.1 — MY DAY (`/kid/day`)

**Purpose:** Show the child what happened today and this week. Read-only summary of their daily data. This is the home screen.

**Layout (top to bottom, single scroll):**

#### A. Hero Banner
- Full-width gradient card (`--kid-gradient-hero`, `rounded-2xl`)
- Left side: greeting text "Привет, {name}!" in `text-2xl font-extrabold text-white`
- Below greeting: level badge — pill shape, `bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full` showing "Уровень {level}"
- Right side: child's emoji/avatar rendered large (48px)
- Below: XP progress bar — thin (6px height), `bg-white/20` track with `bg-white` fill, showing `{xp % 1000} / 1000 XP`

#### B. Today's Snapshot (3-column grid)
Three square-ish stat cards in a row:

1. **Комната** — Large checkmark or X icon. Green background tint if `room_ok`, gray if not. Shows "3/5" or similar room score.
2. **Поведение** — Thumbs up or down. Green if `good_behavior`, gray if not or no data.
3. **Учёба** — Shows count of today's grades with average. E.g. "4.6" with star decoration. If no grades, shows "Нет оценок".

Each card: `bg-white rounded-2xl p-3 text-center kid-shadow`

#### C. Today's Grades List
- Horizontal scrolling row of grade "chips"
- Each chip: subject name + grade number
- Grade 5: `bg-emerald-100 text-emerald-700 border-emerald-200`
- Grade 4: `bg-blue-100 text-blue-700 border-blue-200`
- Grade 3: `bg-amber-100 text-amber-700 border-amber-200`
- Grade 2: `bg-rose-100 text-rose-700 border-rose-200`
- Grade 1: `bg-red-100 text-red-700 border-red-200`
- If no grades today: empty state shows a book emoji with "Оценок пока нет"

#### D. Week Progress Ring
- Circular progress ring (SVG) showing days filled / 7
- Inside the ring: large fraction "{filled}/7"
- Below: three mini stat rows:
  - "Комната чистая: {roomOkDays} дней"
  - "Хорошее поведение: {behaviorDays} дней"  
  - "Оценки получены: {gradedDays} дней"
- Each row has a small colored dot indicator (green/amber/blue)

#### E. Active Streaks Bar
- Horizontal scrollable row of streak badges
- Each streak: rounded pill with fire emoji, streak type icon, and count
- Example: "🔥 Комната 12 дней" with `bg-orange-50 text-orange-700 border border-orange-200`
- Pulse animation on the fire emoji for active streaks > 5 days
- If a streak hits a bonus threshold (7 room, 14 study), show a sparkle indicator

#### F. Active Goal Widget
- Only shows if `activeGoal` exists
- Card with target emoji, goal title, progress bar, and "{current}/{target}" coins
- Progress bar uses `--kid-gradient-coin`
- When goal is > 75% complete, the card gets a subtle golden border glow

**Data Sources:**
- `api.getChild(activeMemberId)` -> child name, emoji, level, xp
- `api.getDay(activeMemberId, today)` -> today's room/behavior data
- `api.getSubjectGradesForDate(activeMemberId, today)` -> today's grades
- `api.getWeekData(activeMemberId, today)` -> week days array for ring
- `api.getWeekScore(activeMemberId, weekStart)` -> coins breakdown
- `api.getStreaks(activeMemberId)` -> streak data
- `api.getGoals(activeMemberId)` -> active goal

**Empty State (no data today):**
- Hero banner still shows with greeting
- Today's snapshot shows three gray placeholder cards with "Ожидаем данные" text
- Friendly illustration: sleeping cat or waiting character emoji
- Text: "Папа ещё не заполнил сегодняшний день"

**Loading State:**
- Skeleton screens: gradient shimmer rectangles matching each section's shape
- Hero banner skeleton: solid `bg-gray-200 animate-pulse rounded-2xl h-32`
- Stat cards: three `bg-gray-100 animate-pulse rounded-2xl h-24` boxes

---

### 3.2 — WALLET (`/kid/wallet`)

**Purpose:** Show coin balance, recent transactions, exchange rate info. Child can SEE but not modify (parent manages). Child CAN request a withdrawal.

**Layout:**

#### A. Balance Hero
- Large gradient card (`--kid-gradient-coin`)
- Centered: coin emoji (animated subtle bounce) + balance number in `text-5xl font-extrabold text-white`
- Below: "монет" label
- Second row: money balance in smaller text: "{money} руб."
- Bottom edge: two mini pills: "Заработано: {total_earned}" and "Потрачено: {total_spent}"

#### B. Quick Actions Row
Two buttons side by side:
1. **Запросить вывод** — `bg-violet-500 text-white rounded-xl` — opens withdrawal request bottom sheet
2. **Обменять монеты** — `bg-amber-100 text-amber-700 rounded-xl` — opens exchange info/request

#### C. This Week's Earnings Breakdown
- Card with colored bars showing coins earned from each source:
  - Grades: blue bar
  - Room: green bar
  - Behavior: violet bar
  - Sport: orange bar
- Each bar has the coin amount on the right
- Total at bottom in bold

#### D. Transaction History
- Scrollable list, most recent first
- Each transaction row:
  - Left: icon circle (emoji from `WalletTransaction.icon`) in a colored circle
  - Middle: description + relative timestamp ("2 часа назад", "вчера")
  - Right: coin change — green "+5" or red "-3" in `font-bold`
- Group by date with sticky date headers
- Load more button at bottom (paginated, 20 at a time)

#### E. Withdrawal Request Bottom Sheet
- Slides up from bottom (mobile) or appears as modal (desktop)
- Shows current money balance
- Amount input with +/- stepper buttons (child-friendly, no keyboard needed for small amounts)
- "Отправить запрос" button
- Shows pending withdrawals with status badges: `bg-amber-100 text-amber-700` for pending, `bg-emerald-100 text-emerald-700` for approved

**Data Sources:**
- `getWallet(activeMemberId)` -> balance data
- `getTransactions(activeMemberId)` -> transaction list (paginated)
- `getWeekScore(activeMemberId, weekStart)` -> this week's breakdown
- `requestWithdrawal(activeMemberId, amount)` -> create withdrawal
- `getWithdrawals(activeMemberId)` -> pending/completed withdrawals

**Empty State (new wallet, no transactions):**
- Balance hero still shows 0 coins
- Transaction area: piggy bank emoji + "Начни зарабатывать монеты! Убери комнату, получи пятёрку, сделай зарядку."
- Three icon cards showing how to earn: Room (+3), Grade 5 (+5), Behavior (+5)

**Loading State:**
- Balance hero: large pulsing rectangle
- Transaction rows: 5 skeleton rows with circle + two lines

---

### 3.3 — ACHIEVEMENTS (`/kid/achievements`)

**Purpose:** Badges, level progress, XP history. The "trophy room."

**Layout:**

#### A. Level Card
- Large card with `--kid-gradient-xp` background
- Center: level number inside a shield/star shape, large (`text-6xl`)
- Level title below (see Level System in section 4)
- XP bar: thick (12px), `bg-white/20` track, `bg-white` fill
- Text below bar: "{currentXP} / {nextLevelXP} XP"

#### B. Stats Row
Four mini cards in a 2x2 grid:
1. Total XP earned (all time)
2. Badges earned / total available
3. Longest streak (any type)
4. Days active (total days with data)

Each: `bg-white rounded-2xl p-3 text-center kid-shadow` with a colored top border (4px)

#### C. Badge Gallery
- Section title: "Мои значки"
- Grid of badge cards, 3 columns on mobile, 4 on desktop
- **Earned badge:** Full color icon (large, 48px emoji), title below, earn date, XP reward shown. Card has subtle gold border.
- **Locked badge:** Grayscale/dimmed icon with a lock overlay, title in `text-gray-400`, description showing requirement. Card has `opacity-50`.
- Tapping an earned badge could show a detail bottom sheet with the full description and earn date

**Available Badges (from `badges.service.ts`):**

| Badge | Icon | XP | Requirement |
|---|---|---|---|
| Неделя отличника | Star | 500 | 7 days of all 5s |
| Мастер чистоты | Broom | 800 | Room clean 30 days straight |
| Спортсмен | Muscle | 600 | Sport 14 days straight |
| Целеустремлённый | Target | 1000 | Reach first goal |
| Идеальная неделя | Crown | 400 | Week with zero penalties |
| Любитель учёбы | Books | 400 | Grades for 14 days straight |

#### D. Streak Records
- Section title: "Рекорды серий"
- Three horizontal streak cards (room, study, sport)
- Each shows: current streak (large, with fire emoji if active) + best record
- Visual: mini flame bar chart showing streak history if available

**Data Sources:**
- `api.getChild(activeMemberId)` -> xp, level
- `getChildBadges(activeMemberId)` -> earned badges
- `getAvailableBadges()` -> all possible badges (compare with earned to show locked)
- `api.getStreaks(activeMemberId)` -> streak data

**Empty State (no badges yet):**
- Level card still shows Level 1 with empty XP bar
- Badge grid shows all badges in locked state
- Motivational text: "Собери свой первый значок! Для начала, попробуй убирать комнату каждый день."

**Loading State:**
- Level card: gradient skeleton
- Badge grid: 6 gray circles with pulse animation

---

### 3.4 — SHOP (`/kid/shop`)

**Purpose:** Browse available rewards, see prices, request purchases. Child can browse and tap "Хочу!" to request. Parent approves purchases.

**Layout:**

#### A. Balance Reminder Strip
- Thin card at top: coin icon + current balance + "доступно"
- Sticky on scroll so child always sees their balance while browsing
- `bg-amber-50 border border-amber-200 rounded-xl`

#### B. Category Tabs (optional, if categories exist)
- Horizontal scrolling pills: "Все", "Развлечения", "Сладости", "Привилегии", etc.
- Derived from `Reward.category` field
- Active: `bg-violet-500 text-white`, inactive: `bg-gray-100 text-gray-600`

#### C. Rewards Grid
- 2 columns on mobile, 3 on desktop
- Each reward card:
  - Top: large icon/emoji from `Reward.icon` on a soft colored background circle
  - Middle: reward title (`text-sm font-bold`), description if exists (`text-xs text-gray-500`)
  - Bottom: price pill — "50 coins" or "100 rub" with coin/ruble icon
  - **Affordable:** price pill is `bg-emerald-100 text-emerald-700`, card has normal styling
  - **Too expensive:** price pill is `bg-gray-100 text-gray-400`, card has `opacity-75`, small text "Не хватает {diff} монет"
  - Tap card to see detail bottom sheet

#### D. Reward Detail Bottom Sheet
- Large icon at top
- Title + full description
- Price prominently displayed
- "Хочу это!" button (large, `bg-violet-500 text-white rounded-xl py-3`)
- If too expensive: button is disabled with "Копи ещё {diff} монет"
- Confirmation step: "Точно хочешь? Спишется {price} монет" with Confirm/Cancel

#### E. My Requests
- Collapsible section at bottom: "Мои запросы"
- List of pending purchases with status:
  - Pending: `bg-amber-50` with hourglass icon
  - Approved/Fulfilled: `bg-emerald-50` with checkmark
- Shows reward icon, title, price, request date

**Data Sources:**
- `getWallet(activeMemberId)` -> current balance for affordability check
- `getRewards()` -> available rewards list (filter `is_active === true`, and `for_child === null || for_child === activeMemberId`)
- `purchaseReward(rewardId, activeMemberId)` -> create purchase request
- `getPurchases(activeMemberId)` -> child's purchase history

**Empty State (no rewards available):**
- Large shopping bag emoji
- "Магазин пока пуст. Попроси родителей добавить награды!"

**Loading State:**
- Balance strip: skeleton bar
- Grid: 4 skeleton cards (rounded rectangles with circle at top)

---

### 3.5 — LEADERBOARD (`/kid/leaderboard`)

**Purpose:** Compare with sibling(s). Friendly competition. This is the ONLY screen where sibling data is visible.

**Layout:**

#### A. Period Selector
- Pill toggle: "Эта неделя" / "Этот месяц" / "Всё время"
- `bg-gray-100 rounded-full p-1` container with sliding indicator

#### B. Podium Visual
- Fun podium illustration for top positions
- Each child gets a podium block with:
  - Avatar (emoji, large)
  - Name
  - Score/coins
  - Level badge
- If only 2 children: side by side with the leader slightly elevated
- Colored: 1st place gold (`bg-amber-100`), 2nd place silver (`bg-gray-100`)

#### C. Category Breakdown
- After the podium, a list of category comparisons:
  - "Оценки" — who earned more from grades
  - "Комната" — room cleaning days
  - "Поведение" — behavior coins
  - "Серии" — longest active streak
  - "Значки" — badge count
- Each row: two avatar mini-circles on left and right with their score, and a VS divider or bar showing relative comparison
- The child viewing the screen gets their side highlighted with a subtle glow

#### D. Fun Stats
- Bottom section with quirky stats:
  - "Самая длинная серия уборки: {name}, {days} дней"
  - "Больше всего пятёрок за неделю: {name}, {count}"
  - "Рекорд монет за неделю: {name}, {amount}"
- Each stat in a card with a trophy emoji

**Data Sources:**
- For each child: `api.getWeekScore(childId, weekStart)`, `getWallet(childId)`, `api.getStreaks(childId)`, `getChildBadges(childId)`
- Children list: `api.getChildren()` (or `useFamilyMembers()` hook)
- Need to load data for ALL children, not just the active one

**Empty State (only one child in family):**
- Show the child's own stats in a "Personal Best" format instead
- "Пока ты единственный участник. Может, ещё кто-то присоединится!"

**Loading State:**
- Podium: two large skeleton blocks
- Category rows: 5 skeleton bars

---

## 4. Gamification Layer

### Level + XP System

XP is already stored on the `children` table (`xp: number`, `level: number`). Current formula: `level = Math.floor(xp / 1000) + 1`.

**Proposed Level Titles (for display flavor):**

| Level | XP Range | Title (RU) | Title Emoji |
|---|---|---|---|
| 1 | 0-999 | Новичок | egg |
| 2 | 1000-1999 | Ученик | seedling |
| 3 | 2000-2999 | Старатель | star |
| 4 | 3000-3999 | Мастер | sparkles |
| 5 | 4000-4999 | Эксперт | gem |
| 6 | 5000-5999 | Чемпион | trophy |
| 7 | 6000-6999 | Легенда | crown |
| 8+ | 7000+ | Супергерой | superhero |

These are purely cosmetic labels stored in a constant map, not in the DB.

### XP Earning Events

XP is currently awarded only by badges. Proposal to extend:

| Event | XP Award | Notes |
|---|---|---|
| Badge earned | 400-1000 | Already exists per badge |
| 7-day room streak | +50 XP | On streak milestone |
| 14-day study streak | +100 XP | On streak milestone |
| Week with all 5s | +200 XP | Check at week end |
| First goal reached | Built into badge (1000 XP) | Already exists |
| 100 coins earned total | +50 XP | Milestone check |

### Visual Progress Indicators

1. **XP Bar** — appears on My Day hero and Achievements page. Thin, smooth, animated fill with a shimmer effect on the leading edge.

2. **Level Badge** — shield-shaped pill that appears next to the child's name everywhere. Color evolves with level:
   - Levels 1-2: `bg-gray-200 text-gray-600`
   - Levels 3-4: `bg-violet-100 text-violet-700`
   - Levels 5-6: `bg-amber-100 text-amber-700`
   - Level 7+: `bg-gradient-to-r from-amber-400 to-orange-500 text-white`

3. **Streak Fire** — fire emoji next to streak count. For streaks > 5, the emoji gets a CSS pulse animation. For streaks > 10, a glow effect is added.

4. **Goal Progress** — ring or bar with coin gradient fill. Percentage text inside.

### Celebration Moments

These are critical for engagement. Implement as overlay/toast animations:

1. **Badge Unlocked** — Full-screen overlay (brief, 2-3 seconds):
   - Dark backdrop with radial gradient burst
   - Badge icon scales up from 0 to 1 with a spring bounce
   - Confetti particle effect (CSS-only, using pseudo-elements or a lightweight library like `canvas-confetti`)
   - Title text animates in: "Новый значок!" followed by badge name
   - Auto-dismiss after 3s, or tap to dismiss
   - Sound effect (optional, consider a simple Web Audio API beep pattern)

2. **Level Up** — Similar overlay but with:
   - Level number morphs from old to new
   - Star burst background
   - New level title displayed
   - Slightly longer display (4s)

3. **Streak Milestone (7, 14, 30 days):**
   - Toast notification slides down from top
   - Fire emoji + "СЕРИЯ {count} ДНЕЙ!" in bold
   - `bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl`
   - Bonus coins amount shown: "+100 coins"

4. **Goal Reached:**
   - Full overlay with target emoji bursting
   - Confetti
   - "ЦЕЛЬ ДОСТИГНУТА!" text
   - Show what the goal was and the amount

5. **Daily Positive Feedback:**
   - When the My Day screen loads and today has data with good results:
   - Subtle floating "+5" coin indicators that drift up and fade (like game score popups)
   - Quick micro-animation, not blocking

**Implementation:** Create a `<CelebrationOverlay>` component that lives in the kid layout. It checks for new badges/levels/streaks on page load by comparing timestamps. Store "last seen" celebration timestamps in localStorage to avoid re-showing.

---

## 5. Kid Screen vs Parent Center Contrast

| Dimension | Parent Center | Kid Screen |
|---|---|---|
| **Background** | `bg-gray-950` (near black) | `bg-amber-50` (warm cream) |
| **Text** | `text-gray-100` (light on dark) | `text-gray-800` (dark on light) |
| **Accent** | `text-indigo-400` (muted indigo) | `bg-violet-500` (vibrant purple) |
| **Card radius** | `rounded-lg` (8px) | `rounded-2xl` (16px) |
| **Card shadow** | Minimal, dark mode | Colored shadows with violet tint |
| **Font weight** | Regular/medium (data-dense) | Semibold/bold (easy scanning) |
| **Font sizes** | Compact, information-dense | Larger, more whitespace |
| **Icons** | SVG icons, monochrome | Emoji-first, colorful |
| **Interaction model** | CRUD forms, data entry, toggles | Read-only views, tap to see detail |
| **Navigation** | 6 tabs (admin-oriented) | 5 tabs (reward-oriented) |
| **Tone** | "Control panel" | "Game interface" |
| **Animations** | Subtle hover transitions | Bounces, pulses, celebrations |
| **Layout density** | Dense tables and grids | Spacious cards and visuals |
| **Data modification** | Full CRUD everywhere | Only withdrawal requests + purchase requests |
| **Emotional design** | Neutral, professional | Encouraging, positive reinforcement |

Key structural difference: Kid screens NEVER show edit forms (no DailyModal, no BulkModal, no GoalsModal). Data flows one way: parent enters -> kid views. The only kid-initiated actions are: browse shop, request purchase, request withdrawal.

---

## 6. Component Inventory

### Layout Components
- `KidLayout` — shared layout wrapper with `bg-amber-50`, kid nav, celebration overlay
- `KidNav` — bottom tab bar (mobile) + top bar (desktop), 5 tabs with colored active states
- `KidHero` — gradient banner with avatar, name, level badge, XP bar (reused on Day + Achievements)

### Data Display Components
- `CoinBadge` — inline pill showing coin amount with coin icon, color-coded positive/negative
- `GradeChip` — small pill showing subject + grade, color coded by grade value (5=green, 4=blue, 3=amber, 2=rose, 1=red)
- `StreakPill` — horizontal pill with fire emoji, type icon, day count, pulse animation
- `LevelBadge` — shield-shaped pill with level number and title, color evolves with level
- `ProgressRing` — SVG circular progress indicator, configurable size/color/thickness
- `ProgressBar` — horizontal bar with gradient fill, shimmer animation on leading edge
- `StatCard` — mini card with label, value, optional colored top border
- `BadgeCard` — square card for badge gallery: icon, title, locked/unlocked state
- `TransactionRow` — single transaction list item: icon circle, description, amount, timestamp
- `RewardCard` — shop item card: icon, title, price pill, affordable/locked state
- `PodiumBlock` — leaderboard position block with avatar, name, score, elevation

### Interactive Components
- `BottomSheet` — slide-up panel for detail views and withdrawal/purchase flows
- `PeriodToggle` — pill-style toggle for "this week / this month / all time"
- `CategoryPills` — horizontal scrolling filter pills for shop categories
- `WithdrawalForm` — amount stepper + submit button inside BottomSheet
- `PurchaseConfirm` — two-step confirmation for shop purchases inside BottomSheet

### Celebration Components
- `CelebrationOverlay` — full-screen overlay for badge unlock, level up, goal reached
- `StreakToast` — top-sliding toast for streak milestones
- `FloatingCoinPopup` — small "+5" text that floats up and fades, triggered on My Day load

### Skeleton Components
- `KidSkeleton` — generic pulse skeleton matching kid card style (`rounded-2xl`)
- `HeroSkeleton` — gradient pulse rectangle for hero sections
- `GridSkeleton` — 2-3 column skeleton cards for shop/badge grids

---

## 7. Critical Implementation Notes

### Routing Structure

```
app/kid/
  layout.tsx          — KidLayout: bg-amber-50, KidNav, CelebrationOverlay
  page.tsx            — redirect to /kid/day
  day/page.tsx        — My Day screen
  wallet/page.tsx     — Wallet screen
  achievements/page.tsx — Achievements screen
  shop/page.tsx       — Shop screen
  leaderboard/page.tsx — Leaderboard screen
```

All pages are `'use client'`. The layout wraps all kid pages with shared nav and celebration system.

### Store Usage

The existing `app/kid/page.tsx` reads from `localStorage.getItem('v4_selected_kid')` which is the OLD pattern. The new implementation MUST use:

```ts
const { activeMemberId } = useAppStore()
```

This is the Zustand store defined in `lib/store.ts` with persist middleware (key: `v5_child`). Every kid page reads `activeMemberId` from here. If `activeMemberId` is null, redirect to a child selection splash or parent dashboard.

### Data Loading Pattern

Each page should use a `useEffect` + `useState` pattern matching the existing codebase style (no React Query or SWR in use). Example:

```ts
const { activeMemberId } = useAppStore()
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  if (!activeMemberId) return
  loadData()
}, [activeMemberId])
```

### No Data Mutation by Kids

Kid screens are READ-ONLY except for:
1. `purchaseReward(rewardId, childId)` — Shop purchase request
2. `requestWithdrawal(childId, amount)` — Wallet withdrawal request

No DailyModal, no BulkModal, no GoalsModal should be imported or rendered in kid pages.

### CSS Strategy

Add new CSS custom properties and classes to `app/globals.css` under a clearly marked section:

```css
/* ============================================================================
   KID MODE STYLES
   ============================================================================ */
```

Use Tailwind classes for layout/spacing/sizing. Use custom CSS classes for:
- Gradient backgrounds that Tailwind can't express cleanly
- Animations (pulse, bounce, shimmer, float-up)
- The celebration overlay effects
- Card shadows with colored tints

### Safe Area Handling

The bottom tab bar needs safe area padding for mobile devices with notches:

```css
.kid-nav-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Performance Considerations

- **Leaderboard** loads data for ALL children — this is the only page that does this. Use `Promise.all` to parallelize the fetches.
- **Transaction history** on Wallet should be paginated (20 items at a time) to avoid loading hundreds of rows.
- **Celebration checks** should compare `badges.earned_at` timestamps against a localStorage key (`kid_last_celebration_check`) to avoid re-showing celebrations on every page load.
- **Images/avatars:** The system uses emoji avatars, not image files. No image optimization concerns.

### Accessibility

- All interactive elements need proper `aria-label` attributes (buttons, tabs)
- Color is never the ONLY indicator — always pair with icons or text
- Touch targets: minimum 44x44px for all tappable elements (critical for kids)
- Font sizes never below 12px in the kid interface

### Internationalization

All UI text is in Russian (matching existing codebase). No i18n framework is used — strings are hardcoded. Keep all kid screen strings in Russian.
