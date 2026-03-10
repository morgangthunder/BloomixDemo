// Inserts the storyteller-scene interaction type into the database.
// Run: docker compose exec -T backend node scripts/insert-storyteller-scene.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'upora_user',
    password: process.env.DATABASE_PASSWORD || 'upora_password',
    database: process.env.DATABASE_NAME || 'upora_dev',
  });
  await client.connect();

  const jsCode = fs.readFileSync(path.join(__dirname, 'storyteller-scene-full-code.js'), 'utf-8');

  const htmlCode = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{overflow:hidden;background:#0a0a1a;color:#fff;font-family:Segoe UI,system-ui,sans-serif;touch-action:none}#game-container{width:100vw;height:100vh;position:fixed;top:0;left:0;overflow:hidden;display:flex;align-items:center;justify-content:center}#pixi-container{width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden;display:none}#loading-section{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px}#loading-text{color:#aaa;font-size:16px;text-align:center;padding:0 20px}.spinner{width:48px;height:48px;border:3px solid rgba(0,212,255,0.2);border-top-color:#00d4ff;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#input-section{display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:20px}#topic-label{color:#00d4ff;font-size:18px;font-weight:600}#movie-input{padding:12px 16px;border-radius:8px;border:1px solid rgba(0,212,255,0.3);background:rgba(255,255,255,0.05);color:#fff;font-size:16px;width:280px;text-align:center;outline:none}#movie-input:focus{border-color:#00d4ff}#generate-btn{padding:12px 32px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:16px;font-weight:600;cursor:pointer}#generate-btn:hover{opacity:0.85}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}</style></head><body><div id="game-container"><div id="loading-section"><div class="spinner"></div><div id="loading-text">Loading scene...</div></div><div id="input-section"><div id="topic-label">Adventure Scene</div><input id="movie-input" placeholder="Enter art style (e.g. Studio Ghibli)" /><button id="generate-btn">Generate Scene</button></div><div id="pixi-container"></div></div></body></html>`;

  const configSchema = JSON.stringify({
    fields: [
      { key: 'title', type: 'string', label: 'Scene Title', default: 'Adventure Scene' },
      { key: 'imageDescription', type: 'string', label: 'Scene Image Description', multiline: true, default: '' },
      { key: 'adventureConfig', type: 'json', label: 'Adventure Configuration', default: null },
      { key: 'bgMusicStyle', type: 'select', label: 'Background Music', options: ['ambient', 'calm', 'focus', 'upbeat', 'retro', 'none'], default: 'ambient' },
      { key: 'bgMusicVolume', type: 'number', label: 'Music Volume (0-1)', default: 0.04 },
      { key: 'testMode', type: 'boolean', label: 'Test Mode', default: true },
      { key: 'personalisation', type: 'boolean', label: 'Personalisation', default: true },
    ],
  });

  const sampleData = JSON.stringify({
    title: 'The Ancient Workshop',
    imageDescription: 'A dimly lit Renaissance workshop with wooden tables covered in sketches, a large canvas on an easel, candles providing warm light, and an arched stone doorway leading to a moonlit courtyard',
    adventureConfig: {
      title: 'Renaissance Discovery',
      setting: "Florence, 1503, Leonardo DaVinci's Workshop",
      tone: 'warm, curious, educational',
      contentConstraintLevel: 'moderate',
      characters: [
        { id: 'player', name: 'You', role: 'player' },
        { id: 'davinci', name: 'Leonardo DaVinci', description: 'Renaissance polymath, warm and intellectually curious', systemPrompt: 'You are Leonardo DaVinci speaking to a young student. Be warm, curious, and encouraging.', greeting: 'Ah, benvenuto! What draws your eye in my workshop?', knowledgeConstraints: ['geometry', 'perspective', 'Renaissance art'] },
      ],
      learningObjectives: ['Understand geometric perspective', 'Learn about Renaissance art techniques'],
    },
    narrative: 'You step through the heavy oak door into a world of creativity and genius. The workshop smells of linseed oil and pine.\n\nA figure hunched over a large sketch looks up and smiles warmly.\n\nLeonardo: "Ah, a visitor! Come, come. Tell me, do you see how the lines all meet at one point?"',
    choices: [
      { id: 'examine-painting', label: 'Examine the painting on the easel', leadsTo: 'ch1-perspective-puzzle' },
      { id: 'look-at-notebook', label: 'Look at the leather notebook', leadsTo: 'ch1-geometry-puzzle' },
    ],
    clickableObjects: [
      { label: 'painting on easel', action: 'navigate', targetInteractionId: 'ch1-perspective-puzzle' },
      { label: 'Leonardo DaVinci', action: 'chat', characterId: 'davinci', chatOpener: 'Ah, benvenuto! What draws your eye?' },
    ],
  });

  const iframeConfig = JSON.stringify({ noScroll: true, minWidth: 320, minHeight: 280 });

  const query = `
    INSERT INTO interaction_types (
      id, name, description, category,
      interaction_type_category,
      html_code, css_code, js_code,
      config_schema, sample_data,
      instance_data_schema, user_progress_schema,
      iframe_config, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      html_code = EXCLUDED.html_code,
      js_code = EXCLUDED.js_code,
      config_schema = EXCLUDED.config_schema,
      sample_data = EXCLUDED.sample_data,
      iframe_config = EXCLUDED.iframe_config,
      is_active = EXCLUDED.is_active
  `;

  await client.query(query, [
    'storyteller-scene',
    'Storyteller Scene',
    'Visual novel adventure scene with AI-generated backgrounds, narrative text, branching choices, clickable scene objects, and character-as-AI-Teacher chat.',
    'explore',
    'pixijs',
    htmlCode,
    '',
    jsCode,
    configSchema,
    sampleData,
    JSON.stringify({ type: 'object', properties: { scenesViewed: { type: 'integer' } } }),
    JSON.stringify({ type: 'object', properties: { score: { type: 'integer' }, completed: { type: 'boolean' } } }),
    iframeConfig,
    true,
  ]);

  console.log('✅ storyteller-scene interaction type inserted/updated');

  // Also add role column to llm_providers if missing
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'llm_providers' AND column_name = 'role'
        ) THEN
          ALTER TABLE llm_providers ADD COLUMN role VARCHAR(50) DEFAULT 'default';
        END IF;
      END $$;
    `);
    console.log('✅ llm_providers.role column ensured');
  } catch (e) {
    console.log('⚠️ Could not add role column (may already exist):', e.message);
  }

  // Create adventure_sessions table if not exists
  try {
    await client.query(`
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
    `);
    console.log('✅ adventure_sessions table ensured');
  } catch (e) {
    console.log('⚠️ Could not create adventure_sessions table:', e.message);
  }

  await client.end();
  console.log('Done!');
}

main().catch((err) => { console.error('Error:', err); process.exit(1); });
