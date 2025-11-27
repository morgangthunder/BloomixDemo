-- Script to remove 2 of 3 duplicate approved iframe guide content sources
-- This keeps the oldest approved content source and removes 2 newer duplicates

-- First, let's see what duplicates exist for the specific URL
SELECT 
    id,
    source_url,
    status,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY created_at) as rn
FROM content_sources
WHERE type = 'url' 
  AND metadata->>'source' = 'iframe-guide'
  AND source_url = 'https://www.bubblbook.com/app/home'
  AND status = 'approved'
ORDER BY created_at;

-- Remove lesson_data_links for the 2 newest duplicates (keeping the oldest)
DELETE FROM lesson_data_links
WHERE content_source_id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY created_at) as rn
        FROM content_sources
        WHERE type = 'url' 
          AND metadata->>'source' = 'iframe-guide'
          AND source_url = 'https://www.bubblbook.com/app/home'
          AND status = 'approved'
    ) ranked
    WHERE rn > 1  -- Keep only the first (oldest), delete the rest
);

-- Delete the 2 duplicate content sources (keeping the oldest)
DELETE FROM content_sources
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY created_at) as rn
        FROM content_sources
        WHERE type = 'url' 
          AND metadata->>'source' = 'iframe-guide'
          AND source_url = 'https://www.bubblbook.com/app/home'
          AND status = 'approved'
    ) ranked
    WHERE rn > 1  -- Keep only the first (oldest), delete the rest
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
  AND source_url = 'https://www.bubblbook.com/app/home'
  AND status = 'approved'
ORDER BY created_at;

