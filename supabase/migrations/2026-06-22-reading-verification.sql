-- Reading verification: a child's "I finished a book" claim is held for parent
-- confirmation (the kid retells the book) before the book bonus is credited.
--   reading_log.verified: NULL = pending review, TRUE = approved, FALSE = rejected.
--   children.require_reading_check: per-child flexibility — default ON for everyone
--     (people get lazy/cunning), turn OFF for a kid you trust to read.
ALTER TABLE reading_log ADD COLUMN IF NOT EXISTS verified BOOLEAN;
ALTER TABLE children ADD COLUMN IF NOT EXISTS require_reading_check BOOLEAN DEFAULT true;

-- Grandfather existing finished-book entries as verified: they were already credited
-- under the old trust model, so parents shouldn't get a retroactive verification queue.
UPDATE reading_log SET verified = true WHERE book_finished = true AND verified IS NULL;
