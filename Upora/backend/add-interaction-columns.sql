-- Add new columns for interaction types
ALTER TABLE interaction_types 
ADD COLUMN IF NOT EXISTS interaction_type_category VARCHAR,
ADD COLUMN IF NOT EXISTS html_code TEXT,
ADD COLUMN IF NOT EXISTS css_code TEXT,
ADD COLUMN IF NOT EXISTS js_code TEXT,
ADD COLUMN IF NOT EXISTS iframe_url VARCHAR,
ADD COLUMN IF NOT EXISTS iframe_config JSONB,
ADD COLUMN IF NOT EXISTS config_schema JSONB,
ADD COLUMN IF NOT EXISTS sample_data JSONB;

-- Show results
SELECT id, name, interaction_type_category FROM interaction_types;

