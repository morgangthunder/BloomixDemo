-- Add personalisation boolean field to config_schema for all image-generating interactions
-- This adds the field right after the testMode field in each interaction's config_schema

-- Orbital Excavation
UPDATE interaction_types 
SET config_schema = jsonb_set(
  config_schema,
  '{fields}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'key' = 'testMode' THEN elem
        ELSE elem
      END
    )
    FROM jsonb_array_elements(config_schema->'fields') elem
  ) || '[{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."}]'::jsonb
)
WHERE id = 'orbital-excavation'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(config_schema->'fields') elem WHERE elem->>'key' = 'personalisation'
);

-- Process Explorer
UPDATE interaction_types 
SET config_schema = jsonb_set(
  config_schema,
  '{fields}',
  (config_schema->'fields') || '[{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."}]'::jsonb
)
WHERE id = 'process-explorer'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(config_schema->'fields') elem WHERE elem->>'key' = 'personalisation'
);

-- Image with Questions
UPDATE interaction_types 
SET config_schema = jsonb_set(
  config_schema,
  '{fields}',
  (config_schema->'fields') || '[{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."}]'::jsonb
)
WHERE id = 'image-with-questions'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(config_schema->'fields') elem WHERE elem->>'key' = 'personalisation'
);

-- PixiJS Boilerplate
UPDATE interaction_types 
SET config_schema = jsonb_set(
  config_schema,
  '{fields}',
  (config_schema->'fields') || '[{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."}]'::jsonb
)
WHERE id = 'pixijs-boilerplate'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(config_schema->'fields') elem WHERE elem->>'key' = 'personalisation'
);
