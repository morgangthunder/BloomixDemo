-- Fix 23505: Drop UNIQUE(category), add UNIQUE(category, age_range, gender)
-- Run with: node scripts/run-sql.js fix-personalization-options-constraint.sql
-- Or: psql -U upora_user -d upora_dev -f scripts/fix-personalization-options-constraint.sql

ALTER TABLE personalization_options DROP CONSTRAINT IF EXISTS personalization_options_category_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personalization_options_category_age_gender
  ON personalization_options (category, age_range, gender);
