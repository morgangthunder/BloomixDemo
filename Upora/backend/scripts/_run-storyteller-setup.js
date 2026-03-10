const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'upora_user',
    password: process.env.DATABASE_PASSWORD || 'upora_password',
    database: process.env.DATABASE_NAME || 'upora_dev',
  });
  await client.connect();
  console.log('Connected to database');

  // 1. Create adventure_sessions table
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
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_adventure_sessions_user_lesson ON adventure_sessions(user_id, lesson_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_adventure_sessions_tenant ON adventure_sessions(tenant_id)');
  console.log('adventure_sessions table ensured');

  // 2. Add role column to llm_providers
  try {
    await client.query("ALTER TABLE llm_providers ADD COLUMN role VARCHAR(50) DEFAULT 'default'");
    console.log('Added role column to llm_providers');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('role column already exists');
    } else {
      console.log('role column warning:', e.message);
    }
  }

  // 3. Read JS code and insert interaction type
  const jsPath = '/tmp/storyteller-scene-full-code.js';
  let jsCode = '';
  try {
    jsCode = fs.readFileSync(jsPath, 'utf-8');
    console.log('JS code loaded:', jsCode.length, 'chars');
  } catch (e) {
    console.error('Could not read JS file:', e.message);
    await client.end();
    return;
  }

  const htmlCode = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>',
    '*{margin:0;padding:0;box-sizing:border-box}',
    'html,body{overflow:hidden;background:#0a0a1a;color:#fff;font-family:Segoe UI,system-ui,sans-serif;touch-action:none}',
    '#game-container{width:100vw;height:100vh;position:fixed;top:0;left:0;overflow:hidden;display:flex;align-items:center;justify-content:center}',
    '#pixi-container{width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden;display:none}',
    '#loading-section{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px}',
    '#loading-text{color:#aaa;font-size:16px;text-align:center;padding:0 20px}',
    '.spinner{width:48px;height:48px;border:3px solid rgba(0,212,255,0.2);border-top-color:#00d4ff;border-radius:50%;animation:spin 1s linear infinite}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '#input-section{display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:20px}',
    '#topic-label{color:#00d4ff;font-size:18px;font-weight:600}',
    '#movie-input{padding:12px 16px;border-radius:8px;border:1px solid rgba(0,212,255,0.3);background:rgba(255,255,255,0.05);color:#fff;font-size:16px;width:280px;text-align:center;outline:none}',
    '#movie-input:focus{border-color:#00d4ff}',
    '#generate-btn{padding:12px 32px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:16px;font-weight:600;cursor:pointer}',
    '#generate-btn:hover{opacity:0.85}',
    '@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}',
    '</style></head><body>',
    '<div id="game-container">',
    '<div id="loading-section"><div class="spinner"></div><div id="loading-text">Loading scene...</div></div>',
    '<div id="input-section"><div id="topic-label">Adventure Scene</div><input id="movie-input" placeholder="Enter art style (e.g. Studio Ghibli)" /><button id="generate-btn">Generate Scene</button></div>',
    '<div id="pixi-container"></div>',
    '</div></body></html>',
  ].join('');

  const configSchema = JSON.stringify({
    fields: [
      { key: 'title', type: 'string', label: 'Scene Title', default: 'Adventure Scene' },
      { key: 'imageDescription', type: 'string', label: 'Scene Image Description', multiline: true, default: '' },
      { key: 'adventureConfig', type: 'json', label: 'Adventure Configuration (characters, objectives, constraints)', default: null },
      { key: 'bgMusicStyle', type: 'select', label: 'Background Music', options: ['ambient', 'calm', 'focus', 'upbeat', 'retro', 'none'], default: 'ambient' },
      { key: 'bgMusicVolume', type: 'number', label: 'Music Volume (0-1)', default: 0.04 },
      { key: 'testMode', type: 'boolean', label: 'Test Mode (manual art style input)', default: true },
      { key: 'personalisation', type: 'boolean', label: 'Personalisation', default: true },
    ],
  });

  const sampleData = JSON.stringify({
    title: 'The Master\'s Workshop',
    imageDescription: 'A dimly lit Renaissance workshop in Florence. Wooden tables covered in anatomical sketches and geometric diagrams. A large canvas on an easel shows a half-finished portrait with visible perspective lines. Candles cast warm golden light. An arched stone doorway reveals a moonlit courtyard.',
    adventureConfig: {
      title: 'Renaissance Discovery',
      setting: 'Florence, 1503',
      tone: 'warm, curious, educational',
      contentConstraintLevel: 'moderate',
      characters: [
        { id: 'player', name: 'You', role: 'player' },
        { id: 'davinci', name: 'Leonardo da Vinci', description: 'Renaissance polymath, warm and intellectually curious', systemPrompt: 'You are Leonardo da Vinci in your Florence workshop in 1503. Be warm, curious, and encouraging. Connect art to mathematics.', greeting: 'Ah, benvenuto! What draws your eye?', knowledgeConstraints: ['geometry', 'perspective', 'Renaissance art', 'anatomy'] }
      ],
      learningObjectives: ['Understand vanishing point perspective', 'Learn how Renaissance artists used geometry', 'Discover the connection between art and mathematics'],
    },
    narrative: 'You push open the heavy oak door and step into a world of creativity. The workshop smells of linseed oil and pine.\n\nA figure hunched over a drawing looks up. His long grey beard catches the candlelight.\n\nLeonardo: "Ah, a visitor! Come closer \u2014 I have been studying something remarkable. Do you see this painting? Notice how every line converges on a single point. This is no accident."',
    choices: [
      { id: 'examine-painting', label: 'Examine the half-finished painting on the easel', leadsTo: null },
      { id: 'pick-up-notebook', label: 'Pick up the leather notebook filled with mirror writing', leadsTo: null },
      { id: 'ask-about-skull', label: 'Ask about the human skull on the shelf', leadsTo: null },
      { id: 'talk-to-leonardo', label: 'Ask Leonardo about his latest invention', leadsTo: null }
    ],
    clickableObjects: [
      { label: 'painting on easel', action: 'inspect', eventData: { description: 'A half-finished portrait with visible perspective lines converging to a vanishing point.' } },
      { label: 'leather notebook', action: 'inspect', eventData: { description: 'Pages of mirror writing with diagrams of flying machines and anatomical studies.' } },
      { label: 'Leonardo da Vinci', action: 'chat', characterId: 'davinci', chatOpener: 'Ah, you wish to speak? What would you like to know?' }
    ],
  });

  const iframeConfig = JSON.stringify({ noScroll: true, minWidth: 320, minHeight: 280 });

  const schema = JSON.stringify({
    type: 'visual-novel-scene',
    inputs: {
      narrative: { type: 'string', description: 'Scene narrative text (paragraphs separated by double newlines)' },
      choices: { type: 'array', items: { type: 'object', properties: { id: {}, label: {}, leadsTo: {} } } },
      characters: { type: 'array', items: { type: 'object', properties: { id: {}, name: {}, expression: {}, position: {} } } },
      clickableObjects: { type: 'array', items: { type: 'object', properties: { label: {}, action: {}, targetInteractionId: {}, characterId: {}, chatOpener: {} } } },
    },
    outputs: {
      choiceMade: { type: 'object', description: 'The choice the user selected' },
      scenesViewed: { type: 'integer' },
    },
  });

  const generationPrompt = 'Generate a visual novel adventure scene. Include narrative text (2-4 paragraphs with character dialogue), 2-4 branching choices, and optionally clickable objects in the scene. Format as JSON with: narrative, choices (id, label, leadsTo), characters (id, expression, position), clickableObjects (label, action, targetInteractionId, characterId, chatOpener).';

  const query = `
    INSERT INTO interaction_types (
      id, name, description, category, interaction_type_category,
      schema, generation_prompt,
      html_code, css_code, js_code,
      config_schema, sample_data,
      instance_data_schema, user_progress_schema,
      iframe_config, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (id) DO UPDATE SET
      name=EXCLUDED.name, description=EXCLUDED.description,
      schema=EXCLUDED.schema, generation_prompt=EXCLUDED.generation_prompt,
      html_code=EXCLUDED.html_code, js_code=EXCLUDED.js_code,
      config_schema=EXCLUDED.config_schema, sample_data=EXCLUDED.sample_data,
      iframe_config=EXCLUDED.iframe_config, is_active=EXCLUDED.is_active
  `;

  await client.query(query, [
    'storyteller-scene',
    'Storyteller Scene',
    'Visual novel adventure scene with AI-generated backgrounds, narrative text, branching choices, clickable scene objects, and character-as-AI-Teacher chat.',
    'explore',
    'pixijs',
    schema,
    generationPrompt,
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

  console.log('storyteller-scene interaction type inserted/updated');
  await client.end();
  console.log('Done!');
}

run().catch((err) => { console.error('Error:', err.message); process.exit(1); });
