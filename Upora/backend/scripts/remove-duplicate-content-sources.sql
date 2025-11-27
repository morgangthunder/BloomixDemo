-- Script to remove duplicate content sources for iframe guide webpages
-- This keeps the oldest content source and removes newer duplicates with the same URL

-- First, let's see what duplicates exist
SELECT 
    source_url,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(created_at ORDER BY created_at) as created_dates
FROM content_sources
WHERE type = 'url' 
  AND metadata->>'source' = 'iframe-guide'
  AND source_url IS NOT NULL
GROUP BY source_url
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Remove duplicates, keeping the oldest one (first created)
-- This deletes lesson_data_links first (to avoid foreign key constraints)
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
          AND source_url IS NOT NULL
    ) ranked
    WHERE rn > 1
);

-- Then delete the duplicate content sources (keeping the oldest)
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
          AND source_url IS NOT NULL
    ) ranked
    WHERE rn > 1
);

-- Verify duplicates are removed
SELECT 
    source_url,
    COUNT(*) as remaining_count
FROM content_sources
WHERE type = 'url' 
  AND metadata->>'source' = 'iframe-guide'
  AND source_url IS NOT NULL
GROUP BY source_url
HAVING COUNT(*) > 1;

