# 🚀 Быстрый старт - Деплой за 10 минут

## Шаг 1: Supabase (3 минуты)

1. Зайти на https://supabase.com → Sign Up / Sign In
2. New Project → Назвать "kids-motivation" → Create
3. SQL Editor → New query → Вставить код из `supabase-schema.sql` → Run
4. Settings → API → Скопировать:
   - `Project URL`
   - `anon public` key

## Шаг 2: GitHub (2 минуты)

```bash
# В папке проекта
git init
git add .
git commit -m "Initial commit"

# Создать репозиторий на github.com
# Затем:
git remote add origin https://github.com/YOUR_USERNAME/kids-motivation.git
git push -u origin main
```

## Шаг 3: Vercel (5 минут)

1. Зайти на https://vercel.com → Login with GitHub
2. Add New → Project → Import репозиторий `kids-motivation`
3. Environment Variables → Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [ваш Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [ваш anon key]
   PARENT_PIN_HASH = MTIzNA==
   ```
4. Deploy → Дождаться сборки
5. Готово! Ссылка вида `kids-motivation.vercel.app`

## Проверка

1. Открыть ссылку Vercel
2. Должен открыться Kid Screen
3. PIN код по умолчанию: `1234`

## Что дальше?

- Поменять PIN в Environment Variables Vercel
- Добавить детей в Supabase (таблица `children`)
- Настроить параметры в таблице `settings`
- Начать использовать! 🎉

## Проблемы?

**Ошибка подключения к Supabase:**
- Проверить Environment Variables в Vercel
- Проверить, что RLS policies включены в Supabase

**Пустые данные:**
- Убедиться, что SQL скрипт выполнился полностью
- Проверить таблицу `children` в Supabase

**Локальная разработка:**
```bash
cp .env.local.example .env.local
# Заполнить переменные
npm install
npm run dev
```
