-- Insert Orbital Excavation interaction type
-- Run: docker compose exec -T postgres psql -U upora_user -d upora_dev -f /docker-entrypoint-initdb.d/../patch-orbital-excavation.sql

INSERT INTO interaction_types (
  id, name, description, category, schema, generation_prompt,
  interaction_type_category, html_code, css_code, js_code,
  config_schema, sample_data, instance_data_schema, user_progress_schema, iframe_config, is_active
) VALUES (
  'orbital-excavation',
  'Orbital Excavation',
  'Explore stage: uncover a hidden image by orbiting a spaceship and firing at an asteroid, then choose the correct thematic portal. Uses AI image generation with personalisation or test mode.',
  'explore',
  '{}',
  'Generate portal answers for an Orbital Excavation game about {topic}. Provide 4 portals with labels — exactly one must be correct. Also provide a hint that becomes visible after the student has partially uncovered the image. Return JSON: { portals: [{label,correct}], triggerHint: string }',
  'pixijs',
  '<div id="game-container">
  <div id="loading-section">
    <div class="loading-spinner" id="loading-spinner"></div>
    <p id="loading-text">Preparing mission...</p>
  </div>
  <div id="input-section" style="display:none">
    <div class="input-card">
      <h3 id="topic-label">Orbital Excavation</h3>
      <p class="input-hint">Enter a movie or TV show for the art style:</p>
      <input type="text" id="movie-input" placeholder="e.g. Star Wars, Pixar, Studio Ghibli..." autocomplete="off">
      <button id="generate-btn">Launch Mission</button>
    </div>
  </div>
  <div id="pixi-container" style="display:none"></div>
</div>',
  '* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: #0a0a1a; color: #fff; font-family: ''Segoe UI'', system-ui, sans-serif; overflow: hidden !important; width: 100% !important; height: 100% !important; position: fixed !important; top: 0; left: 0; margin: 0 !important; padding: 0 !important; touch-action: none !important; -webkit-overflow-scrolling: auto !important; overscroll-behavior: none; }
#game-container { width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; position: fixed; top: 0; left: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
#pixi-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; overflow: hidden; }
#pixi-container canvas { display: block; touch-action: none; }
#loading-section { text-align: center; z-index: 10; }
#loading-text { margin-top: 16px; font-size: 14px; color: #aaa; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(0,212,255,0.2); border-top-color: #00d4ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
#input-section { z-index: 10; }
.input-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(0,212,255,0.2); border-radius: 12px; padding: 28px 24px; text-align: center; max-width: 360px; }
.input-card h3 { color: #00d4ff; margin-bottom: 8px; font-size: 18px; }
.input-hint { color: #888; font-size: 13px; margin-bottom: 14px; }
#movie-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(0,212,255,0.3); background: rgba(0,0,0,0.4); color: #fff; font-size: 14px; outline: none; margin-bottom: 12px; }
#movie-input:focus { border-color: #00d4ff; }
#generate-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #00d4ff, #0088cc); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
#generate-btn:hover { opacity: 0.85; }
.retry-btn { margin-top: 12px; padding: 8px 20px; border-radius: 6px; border: 1px solid #00d4ff; background: transparent; color: #00d4ff; cursor: pointer; font-size: 13px; }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }',
  'placeholder-js-will-be-updated',
  '{"fields":[{"key":"title","type":"string","label":"Topic Title","description":"Main topic for image generation"},{"key":"imageDescription","type":"string","label":"Image Description","multiline":true,"description":"Detailed description for the hidden target image"},{"key":"portals","type":"string","label":"Portal Answers (JSON array)","multiline":true,"description":"JSON array: [{direction,label,correct}]. Directions: North, South, East, West."},{"key":"triggerHint","type":"string","label":"Hint Text","description":"Hint shown after 30% of asteroid is revealed"},{"key":"testMode","type":"boolean","label":"Test Mode","default":true,"description":"When on, shows manual movie/TV input. When off, uses personalisation."},{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."},{"key":"bgMusicStyle","type":"string","label":"Background Music Style","default":"action","description":"Music style: action, calm, epic, none"}]}',
  '{"portals":[{"label":"A Red Dragon","correct":false},{"label":"A Volcanic Crater","correct":false},{"label":"A Strawberry","correct":true},{"label":"A Microscopic Virus","correct":false}],"triggerHint":"Look at the colour and the tiny dots on the surface...","imageDescription":"A large, ripe strawberry with vivid red skin, tiny yellow seeds, and a green leafy stem. Close-up, richly detailed, with water droplets on the surface."}',
  '{"fields":[{"name":"time","type":"number","description":"Total time including penalties (seconds)"},{"name":"revealPercent","type":"number","description":"Percentage of asteroid revealed"},{"name":"wrongAttempts","type":"number","description":"Number of wrong portal entries"},{"name":"correct","type":"boolean","description":"Whether the correct portal was chosen"}]}',
  '{"customFields":[{"name":"time","type":"number"},{"name":"revealPercent","type":"number"},{"name":"wrongAttempts","type":"number"},{"name":"correct","type":"boolean"}]}',
  '{"noScroll": true, "minWidth": 320, "minHeight": 280}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  generation_prompt = EXCLUDED.generation_prompt,
  html_code = EXCLUDED.html_code,
  css_code = EXCLUDED.css_code,
  js_code = EXCLUDED.js_code,
  config_schema = EXCLUDED.config_schema,
  sample_data = EXCLUDED.sample_data,
  instance_data_schema = EXCLUDED.instance_data_schema,
  user_progress_schema = EXCLUDED.user_progress_schema,
  iframe_config = EXCLUDED.iframe_config;
