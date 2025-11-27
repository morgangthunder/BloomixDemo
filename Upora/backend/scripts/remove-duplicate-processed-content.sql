-- Script to remove duplicate processed content outputs for Rick Astley video
-- Keeps the oldest one (YouTube video output) and removes the 4 true-false-selection duplicates

-- First, see what we have
SELECT 
    id,
    output_name,
    output_type,
    content_source_id,
    created_at
FROM processed_content_outputs
WHERE content_source_id = 'b01857e0-22ab-4322-8205-857e8a34373c'
ORDER BY created_at;

-- Delete the 4 duplicate true-false-selection outputs (keep the oldest YouTube video one)
DELETE FROM processed_content_outputs
WHERE content_source_id = 'b01857e0-22ab-4322-8205-857e8a34373c'
  AND output_type = 'true-false-selection';

-- Verify only 1 remains
SELECT 
    id,
    output_name,
    output_type,
    content_source_id,
    created_at
FROM processed_content_outputs
WHERE content_source_id = 'b01857e0-22ab-4322-8205-857e8a34373c'
ORDER BY created_at;

