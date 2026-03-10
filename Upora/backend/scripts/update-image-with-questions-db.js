#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jsCode = fs.readFileSync(path.join(__dirname, 'image-with-questions-full-code.js'), 'utf8');

const htmlCode = `<div id="app">
  <div id="confetti-container"></div>
  <div id="title-bar">
    <h1 id="title-text">Quiz</h1>
    <span id="question-count"></span>
    <span id="cache-badge" style="display:none;"></span>
  </div>

  <div id="intro-section" style="display:none;">
    <div class="intro-content">
      <div class="intro-icon">&#x2753;</div>
      <h2>Image with Questions</h2>
      <p>Look at the image and answer the multiple choice questions below.</p>
      <p class="intro-hint">Pick the correct answer from 4 options.</p>
      <button id="intro-start-btn" class="intro-start-btn">Let&apos;s Go!</button>
    </div>
  </div>

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

  <div id="content-section" style="display:none;">
    <div id="image-container">
      <img id="display-image" draggable="false" />
      <div id="image-fade"></div>
    </div>

    <div id="quiz-section" style="display:none;">
      <div id="question-box">
        <div id="question-number">Question 1 of 4</div>
        <div id="question-text">Question goes here</div>
      </div>
      <div id="answers-grid">
        <button id="answer-0" class="answer-option"><span class="answer-diamond">&#x25C6;</span><span class="answer-letter">A:</span><span class="answer-text">Option 1</span></button>
        <button id="answer-1" class="answer-option"><span class="answer-diamond">&#x25C6;</span><span class="answer-letter">B:</span><span class="answer-text">Option 2</span></button>
        <button id="answer-2" class="answer-option"><span class="answer-diamond">&#x25C6;</span><span class="answer-letter">C:</span><span class="answer-text">Option 3</span></button>
        <button id="answer-3" class="answer-option"><span class="answer-diamond">&#x25C6;</span><span class="answer-letter">D:</span><span class="answer-text">Option 4</span></button>
      </div>
      <div id="slider-container" style="display:none;">
        <div id="slider-labels">
          <span id="slider-label-low">0%</span>
          <span id="slider-value">50%</span>
          <span id="slider-label-high">100%</span>
        </div>
        <input type="range" id="slider-input" min="0" max="100" value="50" />
        <button id="slider-submit-btn" class="intro-start-btn">Submit Answer</button>
        <div id="slider-feedback" style="display:none;"></div>
      </div>
      <div id="progress-dots"></div>
    </div>
  </div>

  <div id="completion-modal" style="display:none;">
    <div class="completion-card">
      <div class="completion-icon">&#x1F389;</div>
      <h2 id="completion-title">Well done!</h2>
      <p id="completion-message"></p>
      <div id="slider-averages" style="display:none;"></div>
      <div class="completion-actions">
        <button id="completion-retry-btn" class="completion-btn secondary">Retry</button>
        <button id="completion-next-btn" class="completion-btn primary">Next</button>
      </div>
    </div>
  </div>
</div>`;

const cssCode = `* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: #0f0f23;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #0f0f23;
}

/* ── Title bar ───────────────────────────────────── */
#title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 12px;
  flex-shrink: 0;
  background: rgba(0,0,0,0.3);
}
#title-bar h1 { color: #4db8ff; font-size: 13px; font-weight: 700; }
#question-count { font-size: 10px; color: rgba(255,255,255,0.4); background: rgba(0,150,255,0.08); padding: 1px 8px; border-radius: 10px; }
.cache-badge { font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; }
.cache-badge.cached { background: rgba(0,255,100,0.12); color: #00ff88; }
.cache-badge.fresh  { background: rgba(255,170,0,0.12); color: #ffaa00; }

/* ── Input / loading / intro ─────────────────────── */
#input-section { padding: 20px 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.instruction { margin-bottom: 12px; font-size: 15px; color: rgba(255,255,255,0.7); }
.input-row { display: flex; gap: 10px; }
#movie-input { flex: 1; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(0,150,255,0.3); border-radius: 8px; color: #fff; font-size: 15px; outline: none; }
#movie-input:focus { border-color: #4db8ff; }
#movie-input::placeholder { color: rgba(255,255,255,0.3); }
#generate-btn { padding: 12px 24px; background: linear-gradient(135deg, #1a5fa0 0%, #0d3666 100%); border: 1px solid rgba(100,180,255,0.3); border-radius: 8px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap; }
#generate-btn:hover { background: linear-gradient(135deg, #2070b5 0%, #104080 100%); }
#loading-section { text-align: center; padding: 60px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.spinner { width: 48px; height: 48px; border: 4px solid rgba(0,150,255,0.2); border-top-color: #4db8ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
#loading-text { font-size: 15px; color: rgba(255,255,255,0.6); }
.retry-inline-btn { margin-top: 12px; padding: 8px 20px; border-radius: 8px; background: #ff6b6b; color: #fff; border: none; cursor: pointer; font-size: 14px; }
#intro-section { flex: 1; display: flex; align-items: center; justify-content: center; }
.intro-content { text-align: center; padding: 1rem 1.5rem; max-width: 480px; }
.intro-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.intro-content h2 { color: #4db8ff; font-size: 1.25rem; margin-bottom: 0.5rem; }
.intro-content p { color: rgba(255,255,255,0.7); font-size: 0.9rem; line-height: 1.4; margin-bottom: 0.4rem; }
.intro-hint { font-size: 0.8rem !important; color: rgba(255,255,255,0.4) !important; margin-bottom: 0.75rem !important; }
.intro-start-btn { padding: 10px 32px; background: linear-gradient(135deg, #1a5fa0 0%, #0d3666 100%); border: 1px solid rgba(100,180,255,0.3); border-radius: 8px; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
.intro-start-btn:hover { background: linear-gradient(135deg, #2070b5 0%, #104080 100%); }

/* ── Content: image + quiz ───────────────────────── */
#content-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #0f0f23;
}
#image-container {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #0f0f23;
}
#display-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
#image-fade {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 24px;
  background: linear-gradient(transparent, #0f0f23);
  pointer-events: none;
}

/* ── Quiz section: WWTBAM ────────────────────────── */
#quiz-section {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 6px 10px 4px;
  gap: 5px;
}

/* Question box — wide hexagonal panel */
#question-box {
  text-align: center;
  padding: 10px 20px 8px;
  background: linear-gradient(180deg, #1a3a60 0%, #0e2240 40%, #1a3a60 100%);
  border: 1px solid rgba(80, 160, 255, 0.35);
  border-radius: 28px;
  position: relative;
}
#question-number {
  font-size: 10px;
  color: rgba(180, 210, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 3px;
}
#question-text {
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 500;
}

/* Answers: 2x2 grid */
#answers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.answer-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #1a3a60 0%, #0e2240 40%, #1a3a60 100%);
  border: 1px solid rgba(80, 160, 255, 0.25);
  border-radius: 22px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  text-align: left;
  min-height: 36px;
  font-family: inherit;
  line-height: 1.3;
}
.answer-option:hover:not(:disabled) {
  border-color: rgba(100, 180, 255, 0.6);
  box-shadow: 0 0 10px rgba(60, 140, 255, 0.15);
}
.answer-option:disabled { cursor: default; }
.answer-diamond {
  color: #ff9500;
  font-size: 8px;
  flex-shrink: 0;
  line-height: 1;
}
.answer-letter {
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.answer-text { flex: 1; }

/* States */
.answer-option.selected {
  border-color: #ff9500 !important;
  background: linear-gradient(180deg, #5a3800 0%, #3a2400 40%, #5a3800 100%) !important;
  box-shadow: 0 0 14px rgba(255, 149, 0, 0.3);
  animation: pulse-selected 0.8s ease-in-out infinite;
}
@keyframes pulse-selected {
  0%, 100% { box-shadow: 0 0 14px rgba(255, 149, 0, 0.25); }
  50% { box-shadow: 0 0 22px rgba(255, 149, 0, 0.5); }
}
.answer-option.correct {
  border-color: #00cc66 !important;
  background: linear-gradient(180deg, #0a4d2a 0%, #063d1f 40%, #0a4d2a 100%) !important;
  box-shadow: 0 0 16px rgba(0, 204, 102, 0.3);
  animation: none;
}
.answer-option.correct .answer-diamond { color: #00ff88; }
.answer-option.incorrect {
  border-color: #cc3333 !important;
  background: linear-gradient(180deg, #4d0a0a 0%, #3d0606 40%, #4d0a0a 100%) !important;
  box-shadow: 0 0 16px rgba(204, 51, 51, 0.3);
  animation: none;
}
.answer-option.incorrect .answer-diamond { color: #ff4444; }

/* Progress dots */
#progress-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 4px 0 2px;
}
.progress-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  transition: all 0.3s;
}
.progress-dot.dot-current { background: #ff9500; box-shadow: 0 0 6px rgba(255,149,0,0.5); }
.progress-dot.dot-correct  { background: #00cc66; }
.progress-dot.dot-incorrect { background: #cc3333; }
.progress-dot.dot-slider { background: #4db8ff; }

/* ── Completion modal ────────────────────────────── */
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
  background: linear-gradient(180deg, #1a3a60 0%, #0e2240 100%);
  border: 1px solid rgba(80, 160, 255, 0.3);
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
.completion-card h2 { color: #4db8ff; font-size: 1.3rem; margin-bottom: 0.5rem; }
.completion-card p { color: rgba(255,255,255,0.7); font-size: 0.95rem; margin-bottom: 1.25rem; }
.completion-actions { display: flex; gap: 12px; justify-content: center; }
.completion-btn { padding: 10px 28px; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; font-family: inherit; }
.completion-btn.primary { background: linear-gradient(135deg, #1a5fa0 0%, #0d3666 100%); color: #fff; border: 1px solid rgba(100,180,255,0.3); }
.completion-btn.primary:hover { background: linear-gradient(135deg, #2070b5 0%, #104080 100%); }
.completion-btn.secondary { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); }
.completion-btn.secondary:hover { background: rgba(255,255,255,0.1); }

/* ── Slider answer mode ─────────────────────────── */
#slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}
#slider-labels {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}
#slider-value {
  font-size: 20px;
  font-weight: 700;
  color: #ff9500;
  text-shadow: 0 0 8px rgba(255,149,0,0.4);
}
#slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #0e2240 0%, #1a3a60 50%, #0e2240 100%);
  outline: none;
  border: 1px solid rgba(80,160,255,0.25);
}
#slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9500, #e08000);
  border: 2px solid rgba(255,200,100,0.6);
  box-shadow: 0 0 10px rgba(255,149,0,0.4);
  cursor: pointer;
}
#slider-input::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9500, #e08000);
  border: 2px solid rgba(255,200,100,0.6);
  box-shadow: 0 0 10px rgba(255,149,0,0.4);
  cursor: pointer;
}
#slider-submit-btn {
  margin-top: 2px;
  padding: 8px 28px;
  font-size: 13px;
}
#slider-feedback {
  width: 100%;
  text-align: center;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  animation: fade-in 0.3s ease;
}
#slider-feedback.exact-match {
  background: rgba(0,204,102,0.15);
  border: 1px solid rgba(0,204,102,0.4);
  color: #00ff88;
}
#slider-feedback.close-match {
  background: rgba(255,149,0,0.12);
  border: 1px solid rgba(255,149,0,0.35);
  color: #ffcc66;
}
#slider-feedback.far-match {
  background: rgba(255,149,0,0.12);
  border: 1px solid rgba(255,149,0,0.35);
  color: #ffcc66;
}

/* ── Slider averages in completion ──────────────── */
#slider-averages {
  text-align: left;
  margin: 0 0 1rem;
  padding: 10px 14px;
  background: rgba(0,0,0,0.25);
  border-radius: 10px;
  border: 1px solid rgba(80,160,255,0.15);
}
#slider-averages h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(180,210,255,0.6);
  margin-bottom: 8px;
}
.slider-avg-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.slider-avg-row:last-child { border-bottom: none; }
.slider-avg-question {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  margin-right: 10px;
}
.slider-avg-value {
  font-size: 14px;
  font-weight: 700;
  color: #ff9500;
  white-space: nowrap;
}
.slider-avg-correct {
  font-size: 11px;
  color: #00ff88;
  white-space: nowrap;
  margin-left: 6px;
}
.slider-detail-grid {
  display: flex;
  gap: 6px;
  margin: 4px 0 8px;
  flex-wrap: wrap;
}
.slider-detail-item {
  flex: 1;
  min-width: 70px;
  text-align: center;
  padding: 5px 6px;
  border-radius: 8px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(80,160,255,0.1);
}
.slider-detail-label {
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 2px;
}
.slider-detail-value {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #ff9500;
}
.slider-detail-value.correct-val { color: #00ff88; }
.slider-detail-value.avg-val { color: #4db8ff; }

/* ── Confetti / animations ───────────────────────── */
#confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000; overflow: hidden; }
.confetti-piece { position: absolute; top: -10px; animation: confetti-fall linear forwards; }
@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
.shake { animation: shake 0.4s ease; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* ── Responsive: mobile ──────────────────────────── */
@media (max-width: 768px) {
  #display-image { object-fit: cover; }
}
@media (max-width: 500px) {
  #answers-grid { grid-template-columns: 1fr; gap: 4px; }
  .answer-option { padding: 7px 10px; font-size: 12px; min-height: 32px; }
  #question-text { font-size: 13px; }
  .input-row { flex-direction: column; }
  #generate-btn { width: 100%; }
}
@media (max-width: 600px) {
  .completion-card { padding: 1.5rem 1.25rem; }
  .completion-btn { padding: 10px 20px; font-size: 0.85rem; }
}

/* ── Short viewports ─────────────────────────────── */
@media (max-height: 500px) {
  #question-box { padding: 6px 14px 5px; }
  #question-text { font-size: 12px; }
  #question-number { font-size: 9px; }
  .answer-option { padding: 5px 10px; min-height: 28px; font-size: 11px; border-radius: 16px; }
  #answers-grid { gap: 3px; }
  #title-bar { padding: 2px 10px; }
  #title-bar h1 { font-size: 11px; }
  #progress-dots { padding: 2px 0 0; }
  .progress-dot { width: 6px; height: 6px; }
}
@media (max-height: 380px) {
  #question-box { padding: 4px 12px 3px; border-radius: 18px; }
  .answer-option { border-radius: 14px; }
  .intro-icon { font-size: 1.2rem; }
  .intro-content h2 { font-size: 1rem; }
  .intro-content p { font-size: 0.78rem; }
  .intro-hint { display: none; }
  .intro-start-btn { padding: 7px 24px; font-size: 0.85rem; }
}
@media (max-height: 300px) {
  .intro-icon { display: none; }
}`;

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

const configSchema = {
  fields: [
    {
      key: "title",
      type: "string",
      label: "Quiz Title / Topic",
      default: "",
      placeholder: "e.g. The Solar System, World History, French Cuisine...",
      hint: "Leave blank to use built-in defaults (The Solar System).",
      description: "Topic title shown in the quiz header"
    },
    {
      key: "imageDescription",
      type: "string",
      multiline: true,
      rows: 3,
      label: "Image Description",
      default: "",
      placeholder: "e.g. A panoramic view of the solar system showing the Sun and all eight planets in order...",
      hint: "Describe what the image should show. The AI generates an illustration matching this description, styled to the student's preferences. Leave blank to auto-generate from the title.",
      description: "Description of the banner image to generate alongside the quiz"
    },
    {
      key: "questions",
      type: "string",
      multiline: true,
      rows: 14,
      label: "Questions (JSON)",
      default: "",
      placeholder: '[{"question":"Which planet is the Red Planet?","correct":"Mars","wrong":["Venus","Jupiter","Mercury"]},\n{"question":"Distance from Sun to Earth?","type":"slider","min":50,"max":300,"step":1,"unit":"million km","correct":150,"labels":{"low":"50 million km","high":"300 million km"}}]',
      hint: "JSON array. MC: {question, correct, wrong:[3]}. Slider: {question, type:\"slider\", min, max, step, unit, correct (optional), labels:{low,high}}. Omit min/max for 0-100%. Types can be mixed.",
      description: "Questions as JSON — supports multiple-choice and slider (custom scale) answer types"
    }
  ]
};

const sampleData = {
  title: "The Solar System",
  imageDescription: "A panoramic view of the solar system showing the Sun and all eight planets in order, with colourful nebulae and stars in the background. Each planet should be recognisable by its distinctive features.",
  questions: [
    { question: "Which planet is known as the Red Planet?", correct: "Mars", wrong: ["Venus", "Jupiter", "Mercury"] },
    { question: "What is the largest planet in our solar system?", correct: "Jupiter", wrong: ["Saturn", "Neptune", "Uranus"] },
    { question: "Which planet is famous for its rings?", correct: "Saturn", wrong: ["Jupiter", "Neptune", "Uranus"] },
    { question: "What is the average distance from the Sun to Earth?", type: "slider", min: 50, max: 300, step: 1, unit: "million km", correct: 150, labels: { low: "50 million km", high: "300 million km" } },
    { question: "How many planets are in our solar system?", correct: "8", wrong: ["7", "9", "10"] }
  ]
};

const sql = `-- Full update of image-with-questions interaction (v0.2.0 — WWTBAM in-iframe quiz, banner image)
UPDATE interaction_types SET
  name = 'Image with Questions',
  description = 'Generates a themed banner image with Who Wants to be a Millionaire-style multiple choice questions below. Quiz is rendered entirely inside the iframe.',
  html_code = '${escapeSql(htmlCode)}',
  css_code = '${escapeSql(cssCode)}',
  js_code = '${escapeSql(jsCode)}',
  iframe_config = '{"noScroll": true, "minWidth": 300, "minHeight": 280}'::jsonb,
  config_schema = '${escapeSql(JSON.stringify(configSchema))}'::jsonb,
  sample_data = '${escapeSql(JSON.stringify(sampleData))}'::jsonb
WHERE id = 'image-with-questions';
`;

const outPath = path.join(__dirname, '..', '..', '..', 'docker', 'postgres', 'patch-iwq-full-update.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Written:', outPath, '(' + sql.length + ' chars)');
