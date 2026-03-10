import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class CreateOrbitalExcavationInteraction1737200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Load full JS from scripts file
    let jsCode = '// Orbital Excavation - load full code from scripts/orbital-excavation-full-code.js';
    try {
      const jsPath = path.join(__dirname, '..', '..', 'scripts', 'orbital-excavation-full-code.js');
      jsCode = fs.readFileSync(jsPath, 'utf-8');
    } catch {
      console.warn('[Migration] Could not read orbital-excavation-full-code.js – using placeholder');
    }

    const htmlCode = `<div id="game-container">
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
</div>`;

    const cssCode = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0a1a; color: #fff; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
#game-container { width: 100vw; height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; }
#pixi-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
#pixi-container canvas { width: 100% !important; height: 100% !important; }
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
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`;

    const configSchema = JSON.stringify({
      fields: [
        { key: 'title', type: 'string', label: 'Topic Title', description: 'Main topic for image generation' },
        { key: 'imageDescription', type: 'string', label: 'Image Description', multiline: true, description: 'Detailed description for the hidden target image' },
        { key: 'portals', type: 'string', label: 'Portal Answers (JSON array)', multiline: true, description: 'JSON array: [{direction,label,correct}]. Directions: North, South, East, West.' },
        { key: 'triggerHint', type: 'string', label: 'Hint Text', description: 'Hint shown after 30% of asteroid is revealed' },
        { key: 'testMode', type: 'boolean', label: 'Test Mode', default: true, description: 'When on, shows manual movie/TV input. When off, uses personalisation.' },
        { key: 'bgMusicStyle', type: 'string', label: 'Background Music Style', default: 'action', description: 'Music style: action, calm, epic, none' },
      ],
    });

    const sampleData = JSON.stringify({
      portals: [
        { direction: 'North', label: 'Covalent Bonding', correct: false },
        { direction: 'South', label: "Rutherford's Gold Foil", correct: true },
        { direction: 'East', label: 'Electron Cloud Model', correct: false },
        { direction: 'West', label: 'Plum Pudding Model', correct: false },
      ],
      triggerHint: 'Look for the deflection patterns in the center.',
    });

    const instanceDataSchema = JSON.stringify({
      fields: [
        { name: 'time', type: 'number', description: 'Total time including penalties (seconds)' },
        { name: 'revealPercent', type: 'number', description: 'Percentage of asteroid revealed' },
        { name: 'wrongAttempts', type: 'number', description: 'Number of wrong portal entries' },
        { name: 'correct', type: 'boolean', description: 'Whether the correct portal was chosen' },
      ],
    });

    const userProgressSchema = JSON.stringify({
      customFields: [
        { name: 'time', type: 'number' },
        { name: 'revealPercent', type: 'number' },
        { name: 'wrongAttempts', type: 'number' },
        { name: 'correct', type: 'boolean' },
      ],
    });

    await queryRunner.query(
      `INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, html_code, css_code, js_code,
        config_schema, sample_data, instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'orbital-excavation',
        'Orbital Excavation',
        'Explore stage: uncover a hidden image by orbiting a spaceship and firing at an asteroid, then choose the correct thematic portal. Uses AI image generation with personalisation or test mode.',
        'explore',
        '{}',
        'Generate portal answers for an Orbital Excavation game about {topic}. Provide 4 portals (North/South/East/West) with labels — exactly one must be correct. Also provide a hint that becomes visible after the student has partially uncovered the image. Return JSON: { portals: [{direction,label,correct}], triggerHint: string }',
        'pixijs',
        $1, $2, $3, $4, $5, $6, $7, true
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
        user_progress_schema = EXCLUDED.user_progress_schema`,
      [htmlCode, cssCode, jsCode, configSchema, sampleData, instanceDataSchema, userProgressSchema],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'orbital-excavation'`);
  }
}
