-- Add age_range and gender to personalization_options for variant lists
-- Default: (category, '', ''). Variants: (category, '18-24', ''), (category, '', 'male'), (category, '18-24', 'male')
-- Fallback: age+gender -> age -> gender -> default

ALTER TABLE personalization_options
  ADD COLUMN IF NOT EXISTS age_range VARCHAR(50) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50) NOT NULL DEFAULT '';

-- Ensure existing rows have default sentinels
UPDATE personalization_options SET age_range = '', gender = '' WHERE age_range IS NULL OR age_range = '' OR gender IS NULL OR gender = '';

ALTER TABLE personalization_options ALTER COLUMN age_range SET DEFAULT '';
ALTER TABLE personalization_options ALTER COLUMN gender SET DEFAULT '';

-- Drop old unique constraint (category)
ALTER TABLE personalization_options DROP CONSTRAINT IF EXISTS personalization_options_category_key;

-- New unique: one row per (category, age_range, gender)
CREATE UNIQUE INDEX IF NOT EXISTS idx_personalization_options_category_age_gender
  ON personalization_options (category, age_range, gender);
