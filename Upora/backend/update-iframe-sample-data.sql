-- Update iFrame sample data with a working URL
UPDATE interaction_types 
SET sample_data = '{"url": "https://www.wikipedia.org"}'
WHERE id = 'iframe-embed';

