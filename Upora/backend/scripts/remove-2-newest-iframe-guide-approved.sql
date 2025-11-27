-- Script to remove 2 of 3 approved iframe guide content sources
-- This keeps the oldest approved content source and removes the 2 newest

-- First, show what we're working with
SELECT 
    id,
    source_url,
    status,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at) as age_rank
FROM content_sources
WHERE type = 'url' 
  AND metadata->>'source' = 'iframe-guide'
  AND status = 'approved'
ORDER BY created_at;

-- Remove lesson_data_links for the 2 newest (keeping the oldest)
DELETE FROM lesson_data_links
WHERE content_source_id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY created_at) as age_rank
        FROM content_sources
        WHERE type = 'url' 
          AND metadata->>'source' = 'iframe-guide'
          AND status = 'approved'
    ) ranked
    WHERE age_rank > 1  -- Keep only the first (oldest), delete the rest
);

-- Delete the 2 newest content sources (keeping the oldest)
DELETE FROM content_sources
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY created_at) as age_rank
        FROM content_sources
        WHERE type = 'url' 
          AND metadata->>'source' = 'iframe-guide'
          AND status = 'approved'
    ) ranked
    WHERE age_rank > 1  -- Keep only the first (oldest), delete the rest
);

-- Verify only 1 remains
SELECT 
    id,
    source_url,
    status,
    created_at
FROM content_sources
WHERE type = 'url' 
  AND metadata->>'source' = 'iframe-guide'
  AND status = 'approved'
ORDER BY created_at;

