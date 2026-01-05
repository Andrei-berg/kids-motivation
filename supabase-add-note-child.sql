-- ============================================================================
-- МИГРАЦИЯ: Добавление note_child в таблицу days
-- ============================================================================
-- Выполни в Supabase SQL Editor

-- Добавить колонку note_child
ALTER TABLE days 
ADD COLUMN IF NOT EXISTS note_child TEXT;

-- Проверить что колонка добавлена
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'days' 
  AND column_name = 'note_child';

-- Должно вернуть: note_child | text
