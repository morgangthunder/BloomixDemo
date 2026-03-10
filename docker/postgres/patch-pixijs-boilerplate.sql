-- PixiJS Boilerplate interaction type
-- Provides a starter template with: SDK, image pipeline, responsive viewport,
-- pause system, background music, results popup, test mode, input handling.
-- Run: docker compose exec -T postgres psql -U upora_user -d upora_dev -f /docker-entrypoint-initdb.d/../patch-pixijs-boilerplate.sql

INSERT INTO interaction_types (
  id, name, description, category, schema, generation_prompt,
  interaction_type_category, html_code, css_code, js_code,
  config_schema, sample_data, instance_data_schema, user_progress_schema, iframe_config, is_active
) VALUES (
  'pixijs-boilerplate',
  'PixiJS Boilerplate',
  'Starter template for PixiJS interactions. Includes SDK, image generation pipeline, responsive viewport with CSS transform scaling, pause/resume system with unpause modal, background music, results popup with benchmarks, test mode input, and view-change reload. Click the generated image to complete.',
  'explore',
  '{}',
  'This is a boilerplate starter for PixiJS interactions. No LLM generation needed for the base template.',
  'pixijs',
  '<div id="game-container">
  <div id="loading-section">
    <div class="loading-spinner" id="loading-spinner"></div>
    <p id="loading-text">Preparing...</p>
  </div>
  <div id="input-section" style="display:none">
    <div class="input-card">
      <h3 id="topic-label">PixiJS Interaction</h3>
      <p class="input-hint">Enter a movie or TV show for the art style:</p>
      <input type="text" id="movie-input" placeholder="e.g. Star Wars, Pixar, Studio Ghibli..." autocomplete="off">
      <button id="generate-btn">Start</button>
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
  '{"fields":[{"key":"title","type":"string","label":"Topic Title","description":"Title used for image generation prompts"},{"key":"imageDescription","type":"string","label":"Image Description","multiline":true,"description":"Detailed description for the generated image"},{"key":"testMode","type":"boolean","label":"Test Mode","default":true,"description":"When on, shows manual movie/TV input. When off, uses personalisation pipeline."},{"key":"personalisation","type":"boolean","label":"Personalisation","default":true,"description":"When enabled, each user gets a personalised image style. When disabled, all users share the same generated image."},{"key":"bgMusicStyle","type":"string","label":"Background Music Style","default":"calm","description":"Music style: calm, upbeat, focus, ambient, retro, none"},{"key":"bgMusicVolume","type":"number","label":"Music Volume","default":0.04,"description":"Background music volume 0-1"}]}',
  '{}',
  '{"fields":[{"name":"time","type":"number","description":"Completion time in seconds"},{"name":"correct","type":"boolean","description":"Whether the interaction was completed successfully"}]}',
  '{"customFields":[{"name":"time","type":"number"},{"name":"correct","type":"boolean"}]}',
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
