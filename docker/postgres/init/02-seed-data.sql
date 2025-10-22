-- Upora AI Lessons Platform - Seed Data
-- Development test data with multiple tenants

-- =====================================================
-- TENANTS (represented by UUID for tenant_id)
-- =====================================================

-- Tenant 1: Default Dev Tenant
-- tenant_id: 00000000-0000-0000-0000-000000000001

-- Tenant 2: Enterprise Client ABC
-- tenant_id: 00000000-0000-0000-0000-000000000002

-- =====================================================
-- USERS
-- =====================================================

-- Tenant 1 Users
INSERT INTO users (id, tenant_id, email, role, first_name, last_name, auth_provider, token_limit, subscription_tier) VALUES
-- Admin
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin@upora.dev', 'admin', 'Admin', 'User', 'cognito', 50000, 'enterprise'),
-- Lesson Builder
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'builder@upora.dev', 'lesson-builder', 'Sarah', 'Builder', 'cognito', 20000, 'pro'),
-- Interaction Builder
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'interaction@upora.dev', 'interaction-builder', 'Mike', 'Developer', 'cognito', 30000, 'pro'),
-- Students
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'student1@upora.dev', 'student', 'Alice', 'Student', 'cognito', 10000, 'free'),
('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'student2@upora.dev', 'student', 'Bob', 'Learner', 'cognito', 10000, 'free');

-- Tenant 2 Users (Enterprise Client)
INSERT INTO users (id, tenant_id, email, role, first_name, last_name, auth_provider, token_limit, subscription_tier) VALUES
('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'admin@clientabc.com', 'admin', 'Jane', 'Admin', 'external', 100000, 'enterprise'),
('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'teacher@clientabc.com', 'lesson-builder', 'John', 'Teacher', 'external', 50000, 'enterprise');

-- =====================================================
-- INTERACTION TYPES (Pixi.js configs)
-- =====================================================

-- Approved interaction type: Drag and Drop
INSERT INTO interaction_types (id, tenant_id, name, description, config, status, created_by, approved_by, approved_at) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Drag and Drop', 'Simple drag and drop interaction with sprites', 
'{
  "type": "drag-drop",
  "version": "1.0.0",
  "inputs": {
    "sprites": {
      "type": "array",
      "description": "Array of sprite objects with position and draggable properties"
    },
    "dropZones": {
      "type": "array",
      "description": "Array of drop zone objects with validation rules"
    }
  },
  "pixiConfig": {
    "width": 800,
    "height": 600,
    "backgroundColor": "0x1a1a2e"
  },
  "events": {
    "onDragStart": "log",
    "onDragEnd": "validate",
    "onCorrectDrop": "playSound",
    "onIncorrectDrop": "shake"
  }
}', 'approved', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', NOW());

-- Pending interaction type: Quiz
INSERT INTO interaction_types (id, tenant_id, name, description, config, status, created_by) VALUES
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Multiple Choice Quiz', 'Interactive quiz with multiple choice questions',
'{
  "type": "quiz",
  "version": "1.0.0",
  "inputs": {
    "questions": {
      "type": "array",
      "description": "Array of question objects with options and correct answer"
    }
  },
  "pixiConfig": {
    "width": 800,
    "height": 600,
    "backgroundColor": "0x2d2d44"
  }
}', 'pending', '00000000-0000-0000-0000-000000000012');

-- =====================================================
-- N8N WORKFLOWS
-- =====================================================

-- Approved workflow: PDF Text Extraction
INSERT INTO interaction_workflows (id, tenant_id, interaction_type_id, name, description, workflow_json, input_format, output_format, status, created_by, approved_by, approved_at, webhook_url) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PDF Text Extractor', 'Extracts text from PDF files and summarizes content',
'{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "pdf-extract"
    },
    {
      "name": "Extract PDF",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "name": "Summarize with Grok",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300]
    }
  ],
  "connections": {}
}',
'{
  "fileUrl": "string",
  "fileName": "string"
}',
'{
  "extractedText": "string",
  "summary": "string",
  "wordCount": "number"
}', 'approved', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', NOW(), 'http://n8n:5678/webhook/pdf-extract');

-- =====================================================
-- LESSONS
-- =====================================================

-- Approved Lesson 1: Introduction to Python
INSERT INTO lessons (id, tenant_id, title, description, thumbnail_url, category, difficulty, duration_minutes, data, status, created_by, approved_by, approved_at, tags) VALUES
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Introduction to Python', 'Learn Python basics with interactive coding exercises', 
'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300', 'Programming', 'Beginner', 45,
'{
  "stages": [
    {
      "id": "stage-1",
      "title": "Welcome to Python",
      "substages": [
        {
          "id": "substage-1-1",
          "title": "What is Python?",
          "content": "Python is a high-level, interpreted programming language known for its simplicity and readability.",
          "grokPrompt": {
            "systemPrompt": "You are a friendly Python teacher. Help students understand Python basics in simple terms.",
            "context": "This is the first lesson on Python programming.",
            "studentLevel": "beginner"
          }
        },
        {
          "id": "substage-1-2",
          "title": "Interactive Exercise",
          "interactionType": "10000000-0000-0000-0000-000000000001",
          "interactionData": {
            "sprites": [
              {"id": "var1", "label": "x = 10", "x": 100, "y": 100, "draggable": true},
              {"id": "var2", "label": "y = 20", "x": 100, "y": 150, "draggable": true}
            ],
            "dropZones": [
              {"id": "zone1", "label": "Variables", "x": 400, "y": 200, "accepts": ["var1", "var2"]}
            ]
          }
        }
      ]
    }
  ],
  "aiTeacher": {
    "enabled": true,
    "personality": "encouraging",
    "knowledgeBase": "python-basics"
  }
}', 'approved', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', NOW(), ARRAY['python', 'programming', 'beginner']);

-- Approved Lesson 2: JavaScript Fundamentals
INSERT INTO lessons (id, tenant_id, title, description, thumbnail_url, category, difficulty, duration_minutes, data, status, created_by, approved_by, approved_at, tags) VALUES
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'JavaScript Fundamentals', 'Master JavaScript with hands-on examples', 
'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300', 'Programming', 'Beginner', 60,
'{
  "stages": [
    {
      "id": "stage-1",
      "title": "JavaScript Basics",
      "substages": [
        {
          "id": "substage-1-1",
          "title": "Variables and Data Types",
          "content": "Learn about let, const, and var declarations.",
          "grokPrompt": {
            "systemPrompt": "You are an expert JavaScript instructor. Explain concepts clearly with examples.",
            "context": "Teaching JavaScript fundamentals to beginners.",
            "studentLevel": "beginner"
          }
        }
      ]
    }
  ]
}', 'approved', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', NOW(), ARRAY['javascript', 'programming', 'web-development']);

-- Pending Lesson 3: Advanced React Patterns
INSERT INTO lessons (id, tenant_id, title, description, thumbnail_url, category, difficulty, duration_minutes, data, status, created_by, tags) VALUES
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Advanced React Patterns', 'Deep dive into React hooks and patterns', 
'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300', 'Programming', 'Advanced', 90,
'{
  "stages": [
    {
      "id": "stage-1",
      "title": "Custom Hooks",
      "substages": [
        {
          "id": "substage-1-1",
          "title": "Building Custom Hooks",
          "content": "Learn to create reusable custom hooks."
        }
      ]
    }
  ]
}', 'pending', '00000000-0000-0000-0000-000000000011', ARRAY['react', 'javascript', 'advanced']);

-- Rejected Lesson (for testing)
INSERT INTO lessons (id, tenant_id, title, description, category, difficulty, duration_minutes, data, status, created_by, rejection_reason, tags) VALUES
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Incomplete Lesson', 'This lesson was rejected', 'Programming', 'Beginner', 30,
'{
  "stages": []
}', 'rejected', '00000000-0000-0000-0000-000000000011', 'Lesson content is incomplete. Please add at least one stage with substages.', ARRAY['test']);

-- Tenant 2 Lesson (Enterprise Client)
INSERT INTO lessons (id, tenant_id, title, description, category, difficulty, duration_minutes, data, status, created_by, approved_by, approved_at, tags) VALUES
('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Company Training: Sales 101', 'Internal sales training for Client ABC', 'Business', 'Beginner', 120,
'{
  "stages": [
    {
      "id": "stage-1",
      "title": "Sales Fundamentals",
      "substages": [
        {
          "id": "substage-1-1",
          "title": "Introduction",
          "content": "Welcome to sales training."
        }
      ]
    }
  ]
}', 'approved', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', NOW(), ARRAY['sales', 'training', 'internal']);

-- =====================================================
-- USAGE TRACKING (Simulate some activity)
-- =====================================================

-- Student 1 views Lesson 1
INSERT INTO usages (tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'lesson', '30000000-0000-0000-0000-000000000001', 'view', '00000000-0000-0000-0000-000000000011', 50);

-- Student 1 completes Lesson 1
INSERT INTO usages (tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'lesson', '30000000-0000-0000-0000-000000000001', 'complete', '00000000-0000-0000-0000-000000000011', 200);

-- Student 2 views Lesson 2
INSERT INTO usages (tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', 'lesson', '30000000-0000-0000-0000-000000000002', 'view', '00000000-0000-0000-0000-000000000011', 50);

-- Interaction usage
INSERT INTO usages (tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'interaction_type', '10000000-0000-0000-0000-000000000001', 'interaction', '00000000-0000-0000-0000-000000000012', 25);

-- =====================================================
-- TOKEN TRACKING (Simulate Grok API usage)
-- =====================================================

-- AI Chat tokens
INSERT INTO token_tracking (tenant_id, user_id, usage_type, resource_type, resource_id, tokens_used, cost_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'ai_chat', 'lesson', '30000000-0000-0000-0000-000000000001', 250, 5),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'ai_chat', 'lesson', '30000000-0000-0000-0000-000000000001', 180, 4);

-- Content processing tokens
INSERT INTO token_tracking (tenant_id, user_id, usage_type, resource_type, resource_id, tokens_used, cost_cents) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'content_processing', 'workflow', '20000000-0000-0000-0000-000000000001', 1500, 30);

-- =====================================================
-- TOKEN PRICING CONFIGURATION
-- =====================================================

-- Subscription tiers
INSERT INTO token_pricing (tier, monthly_tokens, price_cents, margin_multiplier, base_cost_per_1k_tokens, customer_cost_per_1k_tokens) VALUES
('free', 10000, 0, 1.5, 0.0015, 0.00225),
('pro', 50000, 999, 1.5, 0.0015, 0.00225),
('enterprise', 200000, 4999, 1.5, 0.0015, 0.00225);

-- Global pricing configuration per LLM provider
INSERT INTO pricing_config (provider, base_cost_per_1k, margin_multiplier, customer_cost_per_1k) VALUES
('xai', 0.0015, 1.5, 0.00225),      -- Grok API (hypothetical pricing)
('openai', 0.03, 1.5, 0.045),       -- GPT-4 (actual pricing)
('anthropic', 0.015, 1.5, 0.0225);  -- Claude (actual pricing)

-- =====================================================
-- USER SESSIONS (Active learning sessions)
-- =====================================================

INSERT INTO user_sessions (tenant_id, user_id, lesson_id, progress, started_at, last_activity_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000001', 
'{"currentStage": "stage-1", "currentSubstage": "substage-1-2", "completedSubstages": ["substage-1-1"]}', 
NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes');

-- =====================================================
-- UPDATE STATISTICS
-- =====================================================

-- Update lesson view counts
UPDATE lessons SET view_count = 2 WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE lessons SET view_count = 1, completion_count = 1 WHERE id = '30000000-0000-0000-0000-000000000002';

-- Update interaction usage counts
UPDATE interaction_types SET usage_count = 1 WHERE id = '10000000-0000-0000-0000-000000000001';

-- Update workflow execution counts
UPDATE interaction_workflows SET execution_count = 1, last_executed_at = NOW() WHERE id = '20000000-0000-0000-0000-000000000001';

-- =====================================================
-- VERIFICATION QUERIES (commented out, run manually if needed)
-- =====================================================

-- SELECT 'Total Users' AS metric, COUNT(*) FROM users;
-- SELECT 'Total Lessons' AS metric, COUNT(*) FROM lessons;
-- SELECT 'Approved Lessons' AS metric, COUNT(*) FROM lessons WHERE status = 'approved';
-- SELECT 'Total Usages' AS metric, COUNT(*) FROM usages;
-- SELECT 'Total Token Usage' AS metric, SUM(tokens_used) FROM token_tracking;

