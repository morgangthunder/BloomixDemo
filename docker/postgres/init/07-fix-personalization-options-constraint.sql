-- Fix 23505: Drop UNIQUE(category), add UNIQUE(category, age_range, gender)
-- Required for variant support (multiple rows per category).

-- Add age_range and gender if missing (for DBs created by 05-personalization.sql)
ALTER TABLE personalization_options ADD COLUMN IF NOT EXISTS age_range VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE personalization_options ADD COLUMN IF NOT EXISTS gender VARCHAR(50) NOT NULL DEFAULT '';

-- Drop old unique constraint on category only
ALTER TABLE personalization_options DROP CONSTRAINT IF EXISTS personalization_options_category_key;

-- New unique: one row per (category, age_range, gender)
CREATE UNIQUE INDEX IF NOT EXISTS idx_personalization_options_category_age_gender
  ON personalization_options (category, age_range, gender);
