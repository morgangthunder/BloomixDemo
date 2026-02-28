#!/usr/bin/env node
// Reads the process-explorer-full-code.js and generates a SQL file to update the DB
const fs = require('fs');
const path = require('path');

const jsCode = fs.readFileSync(path.join(__dirname, 'process-explorer-full-code.js'), 'utf8');

const htmlCode = `<div id="app">
  <div id="confetti-container"></div>
  <div id="title-bar">
    <h1 id="title-text">Process</h1>
    <span id="step-count"></span>
    <span id="cache-badge" style="display:none;"></span>
  </div>

  <!-- Intro section -->
  <div id="intro-section" style="display:none;">
    <div class="intro-content">
      <div class="intro-icon">&#x1F50D;</div>
      <h2>Image Explorer</h2>
      <p>Answer questions by clicking on the right part of the image.</p>
      <p class="intro-hint">Zoom and pan to look closer.</p>
      <button id="intro-start-btn" class="intro-start-btn">Let&apos;s Go!</button>
    </div>
  </div>

  <!-- Input section: movie/show name -->
  <div id="input-section" style="display:none;">
    <p class="instruction">Enter a movie or TV show to theme the illustration:</p>
    <div class="input-row">
      <input type="text" id="movie-input" placeholder="e.g. Breaking Bad, The Simpsons..." autocomplete="off" />
      <button id="generate-btn">Generate</button>
    </div>
  </div>
  <div id="loading-section" style="display:none;">
    <div id="loading-spinner" class="spinner"></div>
    <p id="loading-text">Generating illustration...</p>
  </div>
  <div id="explore-section" style="display:none;">
    <div id="image-viewer">
      <img id="explore-image" draggable="false" />
      <div id="zoom-controls">
        <button id="zoom-in-btn" title="Zoom in">+</button>
        <button id="zoom-out-btn" title="Zoom out">&minus;</button>
        <button id="zoom-reset-btn" title="Reset zoom">&#x21BB;</button>
      </div>
    </div>
  </div>

  <!-- Completion modal -->
  <div id="completion-modal" style="display:none;">
    <div class="completion-card">
      <div class="completion-icon">&#x1F389;</div>
      <h2 id="completion-title">Well done!</h2>
      <p id="completion-message"></p>
      <div class="completion-actions">
        <button id="completion-retry-btn" class="completion-btn secondary">Retry</button>
        <button id="completion-next-btn" class="completion-btn primary">Next</button>
      </div>
    </div>
  </div>
</div>`;

const cssCode = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0f0f23;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
  height: 100vh;
}
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
#title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
#title-bar h1 { color: #00d4ff; font-size: 16px; font-weight: 700; }
#step-count { font-size: 12px; color: rgba(255,255,255,0.5); background: rgba(0,212,255,0.08); padding: 2px 8px; border-radius: 12px; }
.cache-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
.cache-badge.cached { background: rgba(0,255,100,0.15); color: #00ff88; }
.cache-badge.fresh  { background: rgba(255,170,0,0.15); color: #ffaa00; }
#input-section { padding: 20px 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.instruction { margin-bottom: 12px; font-size: 15px; color: rgba(255,255,255,0.7); }
.input-row { display: flex; gap: 10px; }
#movie-input { flex: 1; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(0,212,255,0.3); border-radius: 8px; color: #fff; font-size: 15px; outline: none; transition: border-color 0.2s; }
#movie-input:focus { border-color: #00d4ff; }
#movie-input::placeholder { color: rgba(255,255,255,0.3); }
#generate-btn { padding: 12px 24px; background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%); border: none; border-radius: 8px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; white-space: nowrap; }
#generate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,0.3); }
#generate-btn:active { transform: translateY(0); }
#loading-section { text-align: center; padding: 60px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.spinner { width: 48px; height: 48px; border: 4px solid rgba(0,212,255,0.2); border-top-color: #00d4ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
#loading-text { font-size: 15px; color: rgba(255,255,255,0.6); }
#explore-section { display: flex; flex-direction: column; flex: 1; min-height: 0; }
#image-viewer { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #0a0a1a; cursor: crosshair; touch-action: none; }
#explore-image { position: absolute; top: 0; left: 0; max-width: none; transform-origin: 0 0; transition: none; user-select: none; -webkit-user-drag: none; }
#zoom-controls { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 10; }
#zoom-controls button { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.3); background: rgba(0,0,0,0.6); color: #00d4ff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; line-height: 1; }
#zoom-controls button:hover { background: rgba(0,212,255,0.2); }
/* Intro section */
#intro-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}
.intro-content {
  text-align: center;
  padding: 1rem 1.5rem;
  max-width: 480px;
}
.intro-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
.intro-content h2 {
  color: #00d4ff;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}
.intro-content p {
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.4rem;
}
.intro-hint {
  font-size: 0.8rem !important;
  color: rgba(255,255,255,0.4) !important;
  margin-bottom: 0.75rem !important;
}
.intro-start-btn {
  padding: 10px 32px;
  background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  letter-spacing: 0.5px;
}
.intro-start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,212,255,0.4);
}
/* Completion modal */
#completion-modal {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  z-index: 900;
  display: none;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.25s ease;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.completion-card {
  background: #1a1a2e;
  border: 1px solid rgba(0,212,255,0.2);
  border-radius: 16px;
  padding: 2rem 2.5rem;
  text-align: center;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  animation: card-pop 0.3s ease;
}
@keyframes card-pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.completion-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.completion-card h2 { color: #00d4ff; font-size: 1.3rem; margin-bottom: 0.5rem; }
.completion-card p { color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.4; margin-bottom: 1.25rem; }
.completion-actions { display: flex; gap: 12px; justify-content: center; }
.completion-btn {
  padding: 10px 28px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
}
.completion-btn.primary {
  background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
  color: #fff;
}
.completion-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,0.3); }
.completion-btn.secondary {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.15);
}
.completion-btn.secondary:hover { background: rgba(255,255,255,0.12); }
@media (max-width: 600px) {
  .completion-card { padding: 1.5rem 1.25rem; }
  .completion-btn { padding: 10px 20px; font-size: 0.85rem; }
}
.region-flash { position: absolute; pointer-events: none; border-radius: 6px; animation: flash-pulse 0.6s ease-out; opacity: 0; }
@keyframes flash-pulse { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
#confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000; overflow: hidden; }
.confetti-piece { position: absolute; top: -10px; animation: confetti-fall linear forwards; }
@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
.shake { animation: shake 0.4s ease; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@media (max-width: 600px) {
  .input-row { flex-direction: column; }
  #generate-btn { width: 100%; }
  #title-bar h1 { font-size: 18px; }
}
@media (max-height: 400px) {
  .intro-icon { font-size: 1.2rem; margin-bottom: 0.25rem; }
  .intro-content h2 { font-size: 1rem; margin-bottom: 0.25rem; }
  .intro-content p { font-size: 0.78rem; line-height: 1.3; margin-bottom: 0.2rem; }
  .intro-hint { display: none; }
  .intro-start-btn { padding: 7px 24px; font-size: 0.85rem; }
  #title-bar { padding: 3px 10px; }
  #title-bar h1 { font-size: 14px; }
}
@media (max-height: 300px) {
  .intro-icon { display: none; }
  .intro-content { padding: 0.5rem 1rem; }
  .intro-content h2 { font-size: 0.9rem; margin-bottom: 0.15rem; }
  .intro-content p { font-size: 0.72rem; margin-bottom: 0.15rem; }
  .intro-start-btn { padding: 5px 20px; font-size: 0.8rem; }
}`;

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

const configSchema = {
  fields: [
    {
      key: "contentType",
      type: "select",
      label: "Content Type",
      options: [
        { value: "", label: "Auto-detect (from content)" },
        { value: "process", label: "Process (grid of step panels)" },
        { value: "items", label: "Items (single scene with scattered objects)" }
      ],
      default: "",
      hint: "Choose how the image is generated. 'Process' creates a grid with one panel per step. 'Items' creates a single scene with all objects visible. Auto-detect analyses the input to decide."
    },
    {
      key: "processTitle",
      type: "string",
      label: "Title",
      default: "",
      placeholder: "e.g. Beach Items, Water Cycle, Kitchen Tools...",
      description: "Name of the process or item collection being illustrated"
    },
    {
      key: "processSteps",
      type: "string",
      multiline: true,
      rows: 8,
      label: "Steps / Items (one per line)",
      default: "",
      placeholder: "Enter each step or item on a new line...",
      hint: "For a process: enter each step on a new line. For items: enter each item or object on a new line.",
      description: "Steps or items, one per line"
    }
  ]
};

const sql = `-- Full update of process-explorer interaction (v0.8.7 - Image Explorer)
UPDATE interaction_types SET
  name = 'Image Explorer',
  description = 'Generates a themed image of lesson content and quizzes the user to identify each region by clicking. Tests content caching, component map labelling, and dictionary labels.',
  html_code = '${escapeSql(htmlCode)}',
  css_code = '${escapeSql(cssCode)}',
  js_code = '${escapeSql(jsCode)}',
  iframe_config = '{"noScroll": true, "minWidth": 320, "minHeight": 280}'::jsonb,
  config_schema = '${escapeSql(JSON.stringify(configSchema))}'::jsonb
WHERE id = 'process-explorer';
`;

const outPath = path.join(__dirname, '..', '..', '..', 'docker', 'postgres', 'patch-pe-full-update.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Written:', outPath, '(' + sql.length + ' chars)');
