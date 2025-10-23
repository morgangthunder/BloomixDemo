-- Add courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add courseId to lessons table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lessons' AND column_name='course_id'
  ) THEN
    ALTER TABLE lessons ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Insert sample course
INSERT INTO courses (id, tenant_id, title, description, status, view_count, completion_count, rating_average, created_by)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'JavaScript Mastery Course',
  'Complete JavaScript programming course from basics to advanced',
  'published',
  523,
  87,
  4.7,
  '00000000-0000-0000-0000-000000000011'
) ON CONFLICT (id) DO NOTHING;

-- Insert a new lesson for this course
INSERT INTO lessons (
  id,
  tenant_id,
  title,
  description,
  thumbnail_url,
  category,
  difficulty,
  duration_minutes,
  tags,
  data,
  status,
  created_by,
  view_count,
  completion_count,
  rating_average,
  course_id
) VALUES (
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Advanced JavaScript Patterns',
  'Learn design patterns and best practices in JavaScript',
  'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300',
  'Programming',
  'Advanced',
  90,
  ARRAY['javascript', 'design-patterns', 'advanced'],
  '{"stages": [{"id": 1, "title": "Introduction", "type": "trigger", "subStages": [{"id": 1, "title": "What are Design Patterns?", "type": "trigger", "duration": 10}]}]}',
  'approved',
  '00000000-0000-0000-0000-000000000011',
  342,
  54,
  4.8,
  '40000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Update one existing lesson to be in the course
UPDATE lessons 
SET course_id = '40000000-0000-0000-0000-000000000001'
WHERE id = '30000000-0000-0000-0000-000000000002'
  AND course_id IS NULL;

COMMENT ON TABLE courses IS 'Courses that contain multiple related lessons';

