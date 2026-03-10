-- Storyteller Scene interaction type
-- Visual novel adventure scene with narrative text, choices, clickable hotspots, and character personas
INSERT INTO interaction_types (
  id, name, description, category,
  interaction_type_category,
  html_code, css_code, js_code,
  config_schema, sample_data,
  instance_data_schema, user_progress_schema,
  iframe_config,
  is_active
) VALUES (
  'storyteller-scene',
  'Storyteller Scene',
  'Visual novel adventure scene with AI-generated backgrounds, character portraits, narrative text with typewriter effect, branching choices, clickable scene objects, and character-as-AI-Teacher chat. Part of the Storyteller adventure framework.',
  'explore',
  'pixijs',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{overflow:hidden;background:#0a0a1a;color:#fff;font-family:Segoe UI,system-ui,sans-serif;touch-action:none;-webkit-overflow-scrolling:auto}#game-container{width:100vw;height:100vh;position:fixed;top:0;left:0;overflow:hidden;display:flex;align-items:center;justify-content:center}#pixi-container{width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden;display:none}#loading-section{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px}#loading-text{color:#aaa;font-size:16px;text-align:center;padding:0 20px}.spinner{width:48px;height:48px;border:3px solid rgba(0,212,255,0.2);border-top-color:#00d4ff;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#input-section{display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:20px}#topic-label{color:#00d4ff;font-size:18px;font-weight:600}#movie-input{padding:12px 16px;border-radius:8px;border:1px solid rgba(0,212,255,0.3);background:rgba(255,255,255,0.05);color:#fff;font-size:16px;width:280px;text-align:center;outline:none;transition:border-color 0.3s}#movie-input:focus{border-color:#00d4ff}#generate-btn{padding:12px 32px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity 0.2s}#generate-btn:hover{opacity:0.85}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}</style></head><body><div id="game-container"><div id="loading-section"><div class="spinner"></div><div id="loading-text">Loading scene...</div></div><div id="input-section"><div id="topic-label">Adventure Scene</div><input id="movie-input" placeholder="Enter art style (e.g. Studio Ghibli)" /><button id="generate-btn">Generate Scene</button></div><div id="pixi-container"></div></div></body></html>',
  '',
  '',
  '{
    "fields": [
      {"key": "title", "type": "string", "label": "Scene Title", "default": "Adventure Scene"},
      {"key": "imageDescription", "type": "string", "label": "Scene Image Description", "multiline": true, "default": ""},
      {"key": "adventureConfig", "type": "json", "label": "Adventure Configuration (characters, objectives, constraints)", "default": null},
      {"key": "bgMusicStyle", "type": "select", "label": "Background Music", "options": ["ambient", "calm", "focus", "upbeat", "retro", "none"], "default": "ambient"},
      {"key": "bgMusicVolume", "type": "number", "label": "Music Volume (0-1)", "default": 0.04},
      {"key": "testMode", "type": "boolean", "label": "Test Mode (manual art style input)", "default": true},
      {"key": "personalisation", "type": "boolean", "label": "Personalisation", "default": true}
    ]
  }',
  '{
    "title": "The Ancient Workshop",
    "imageDescription": "A dimly lit Renaissance workshop with wooden tables covered in sketches, a large canvas on an easel, candles providing warm light, and an arched stone doorway leading to a moonlit courtyard",
    "adventureConfig": {
      "title": "Renaissance Discovery",
      "setting": "Florence, 1503, Leonardo DaVinci''s Workshop",
      "tone": "warm, curious, educational",
      "contentConstraintLevel": "moderate",
      "characters": [
        {"id": "player", "name": "You", "role": "player"},
        {"id": "davinci", "name": "Leonardo DaVinci", "description": "Renaissance polymath, warm and intellectually curious", "systemPrompt": "You are Leonardo DaVinci speaking to a young student in your workshop. You are warm, curious, and encouraging. Relate answers to art and mathematics.", "greeting": "Ah, benvenuto! What draws your eye in my workshop?", "knowledgeConstraints": ["geometry", "perspective", "Renaissance art"]}
      ],
      "learningObjectives": ["Understand geometric perspective", "Learn about Renaissance art techniques"],
      "approvedContentSourceIds": []
    },
    "narrative": "You step through the heavy oak door into a world of creativity and genius. The workshop smells of linseed oil and pine. Candles flicker on every surface, casting dancing shadows across half-finished inventions.\n\nA figure hunched over a large sketch looks up and smiles warmly. His long grey beard catches the candlelight as he rises to greet you.\n\nLeonardo: \"Ah, a visitor! Come, come. I was just working on something that might interest you. Tell me, do you see how the lines in this painting all seem to meet at one point?\"",
    "choices": [
      {"id": "examine-painting", "label": "Examine the painting on the easel", "leadsTo": "ch1-perspective-puzzle"},
      {"id": "look-at-notebook", "label": "Look at the leather notebook on the desk", "leadsTo": "ch1-geometry-puzzle"},
      {"id": "ask-about-inventions", "label": "Ask Leonardo about his inventions", "leadsTo": "ch1-engineering-scene"}
    ],
    "clickableObjects": [
      {"label": "painting on easel", "action": "navigate", "targetInteractionId": "ch1-perspective-puzzle"},
      {"label": "leather notebook", "action": "navigate", "targetInteractionId": "ch1-geometry-puzzle"},
      {"label": "Leonardo DaVinci", "action": "chat", "characterId": "davinci", "chatOpener": "Ah, benvenuto! What draws your eye in my workshop?"}
    ]
  }',
  '{"type": "object", "properties": {"scenesViewed": {"type": "integer"}}}',
  '{"type": "object", "properties": {"score": {"type": "integer"}, "completed": {"type": "boolean"}}}',
  '{"noScroll": true, "minWidth": 320, "minHeight": 280}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  interaction_type_category = EXCLUDED.interaction_type_category,
  html_code = EXCLUDED.html_code,
  css_code = EXCLUDED.css_code,
  config_schema = EXCLUDED.config_schema,
  sample_data = EXCLUDED.sample_data,
  instance_data_schema = EXCLUDED.instance_data_schema,
  user_progress_schema = EXCLUDED.user_progress_schema,
  iframe_config = EXCLUDED.iframe_config,
  is_active = EXCLUDED.is_active;

-- Add role column to llm_providers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'llm_providers' AND column_name = 'role'
  ) THEN
    ALTER TABLE llm_providers ADD COLUMN role VARCHAR(50) DEFAULT 'default';
  END IF;
END $$;

-- Create adventure_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS adventure_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  adventure_state JSONB DEFAULT '{}',
  scene_cache JSONB DEFAULT '{}',
  character_portraits JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adventure_sessions_user_lesson ON adventure_sessions(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_adventure_sessions_tenant ON adventure_sessions(tenant_id);
