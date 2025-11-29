-- Link Photosynthesis True/False content source to Photosynthesis Basics lesson
-- Lesson ID: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
-- Content Source ID: 26e022ab-56d4-452a-9621-5f32d457eb83

INSERT INTO lesson_data_links (id, lesson_id, content_source_id, relevance_score, use_in_context, linked_at)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  '26e022ab-56d4-452a-9621-5f32d457eb83',
  1.0,
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify the link was created
SELECT 
  ldl.id,
  l.title as lesson_title,
  cs.title as content_source_title,
  ldl.relevance_score,
  ldl.use_in_context
FROM lesson_data_links ldl
JOIN lessons l ON l.id = ldl.lesson_id
JOIN content_sources cs ON cs.id = ldl.content_source_id
WHERE ldl.lesson_id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
  AND ldl.content_source_id = '26e022ab-56d4-452a-9621-5f32d457eb83';

