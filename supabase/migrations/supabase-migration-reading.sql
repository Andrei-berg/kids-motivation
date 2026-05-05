-- Add current_page to reading_log (bookmark — "на какой странице остановился")
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0;

-- Add coins_per_book to wallet_settings (coins awarded for finishing a whole book)
ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS coins_per_book INTEGER DEFAULT 20;

-- Add 'reading' streak type support (no schema change needed — streaks table uses streak_type TEXT)
-- Just documenting the new value: streak_type = 'reading'
