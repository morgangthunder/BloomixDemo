-- Full update of image-with-questions interaction (v0.2.0 — WWTBAM in-iframe quiz, banner image)
UPDATE interaction_types SET
  name = 'Image with Questions',
  description = 'Generates a themed banner image with Who Wants to be a Millionaire-style multiple choice questions below. Quiz is rendered entirely inside the iframe.',
  html_code = '<div id="app">
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
</div>',
  css_code = '* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: #0f0f23;
  color: #e0e0e0;
  font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
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
}',
  js_code = '// Image with Questions Interaction
// Generates a themed banner image and presents WWTBAM-style multiple choice questions below
//
// Layout: banner image (top ~40%) + quiz section (bottom ~60%)
// Quiz section shows question + 4 answer options in Who Wants to be a Millionaire style
// All quiz UI is rendered inside the iframe — no snack messages to parent

(function () {
  "use strict";

  // ── SDK bootstrap ──────────────────────────────────────────────────
  const createIframeAISDK = () => {
    let requestCounter = 0;
    const generateRequestId = () => "req-" + Date.now() + "-" + ++requestCounter;

    const sendMessage = (type, data, callback) => {
      const requestId = generateRequestId();
      const message = { type, requestId, ...data };
      if (callback) {
        const listener = (event) => {
          if (event.data.requestId === requestId) {
            window.removeEventListener("message", listener);
            callback(event.data);
          }
        };
        window.addEventListener("message", listener);
      }
      window.parent.postMessage(message, "*");
    };

    return {
      emitEvent: (event, processedContentId) => {
        sendMessage("ai-sdk-emit-event", { event, processedContentId });
      },
      updateState: (key, value) => {
        sendMessage("ai-sdk-update-state", { key, value });
      },
      getState: (callback) => {
        sendMessage("ai-sdk-get-state", {}, (r) => callback(r.state));
      },
      showSnack: (content, duration, hideFromChatUI, actions, callback) => {
        sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false, actions: actions || [] }, (r) => {
          if (callback && r.snackId) callback(r.snackId);
        });
      },
      hideSnack: () => {
        sendMessage("ai-sdk-hide-snack", {});
      },
      generateImage: (options, callback) => {
        sendMessage("ai-sdk-generate-image", { options }, (response) => {
          if (callback) callback(response);
        });
      },
      saveUserProgress: (data, callback) => {
        sendMessage("ai-sdk-save-user-progress", { data }, (r) => {
          if (callback) callback(r.progress, r.error);
        });
      },
      getUserProgress: (callback) => {
        sendMessage("ai-sdk-get-user-progress", {}, (r) => {
          if (callback) callback(r.progress, r.error);
        });
      },
      postToChat: (content, role, openChat) => {
        sendMessage("ai-sdk-post-to-chat", { content, role: role || "assistant", openChat: openChat || false });
      },
      setInteractionInfo: (content) => {
        sendMessage("ai-sdk-set-interaction-info", { content });
      },
      getLessonImages: (callback) => {
        sendMessage("ai-sdk-get-lesson-images", {}, (response) => {
          if (callback) callback(response.images || [], response.error);
        });
      },
      findImagePair: (options, callback) => {
        sendMessage("ai-sdk-find-image-pair", { options }, (response) => {
          if (callback) callback(response);
        });
      },
      selectBestTheme: (options, callback) => {
        sendMessage("ai-sdk-select-theme", { options }, (response) => {
          if (callback) callback(response);
        });
      },
      playSfx: (name) => {
        sendMessage("ai-sdk-play-sfx", { name });
      },
      startBgMusic: (style) => {
        sendMessage("ai-sdk-start-bg-music", { style: style || "calm" });
      },
      startBgMusicFromUrl: (url, loopConfig) => {
        sendMessage("ai-sdk-start-bg-music-url", { url, loopConfig });
      },
      stopBgMusic: () => {
        sendMessage("ai-sdk-stop-bg-music", {});
      },
      setAudioVolume: (channel, level) => {
        sendMessage("ai-sdk-set-audio-volume", { channel, level });
      },
      navigateToSubstage: (stageId, substageId) => {
        sendMessage("ai-sdk-navigate-to-substage", { stageId, substageId });
      },
      getLessonStructure: (callback) => {
        sendMessage("ai-sdk-get-lesson-structure", {}, (r) => {
          if (callback) callback(r.structure);
        });
      },
      setSharedData: (key, value, callback) => {
        sendMessage("ai-sdk-set-shared-data", { key, value }, () => {
          if (callback) callback();
        });
      },
      getSharedData: (key, callback) => {
        sendMessage("ai-sdk-get-shared-data", { key }, (r) => {
          if (callback) callback(r.value);
        });
      },
      getPrefetchResult: (key, callback) => {
        sendMessage("ai-sdk-get-prefetch-result", { key }, (r) => {
          if (callback) callback({ result: r.result, status: r.status, error: r.error });
        });
      },
      navigateToLesson: (lessonId, options) => {
        sendMessage("ai-sdk-navigate-to-lesson", { lessonId, options: options || {} });
      },
      setCrossLessonData: (targetLessonId, data, callback) => {
        sendMessage("ai-sdk-set-cross-lesson-data", { targetLessonId, data }, () => {
          if (callback) callback();
        });
      },
      saveInstanceData: (data, callback) => {
        sendMessage("ai-sdk-save-instance-data", { data }, (r) => {
          if (callback) callback(r.success, r.error);
        });
      },
      getInstanceDataHistory: (filters, callback) => {
        sendMessage("ai-sdk-get-instance-data-history", { filters: filters || {} }, (r) => {
          if (callback) callback(r.data, r.error);
        });
      },
    };
  };

  // ── State ───────────────────────────────────────────────────────────
  var aiSDK = null;
  var questions = [];
  var quizTitle = "";
  var imageDescription = "";
  var currentQuestionIndex = 0;
  var correctCount = 0;
  var answered = false;
  var shuffledOptions = [];
  var questionResults = [];
  var sliderAnswers = [];

  var desktopResponse = null;
  var mobileResponse = null;
  var imageUrl = null;
  var parentIsMobile = window.innerWidth < 768;
  var parentIsFullscreen = false;
  console.log("[IWQ] Init — parentIsMobile:", parentIsMobile, "window.innerWidth:", window.innerWidth);
  var isTestMode = true;

  var bgMusicStyle = "calm";
  var bgMusicUrl = null;
  var bgMusicLoopConfig = null;

  function sfxCorrect()   { if (aiSDK) aiSDK.playSfx("correct"); }
  function sfxIncorrect() { if (aiSDK) aiSDK.playSfx("incorrect"); }
  function sfxComplete()  { if (aiSDK) aiSDK.playSfx("complete"); }
  function startBgMusic() {
    if (!aiSDK) return;
    if (bgMusicStyle === "none") return;
    if (bgMusicStyle === "custom" && bgMusicUrl) {
      aiSDK.startBgMusicFromUrl(bgMusicUrl, bgMusicLoopConfig || {});
    } else {
      aiSDK.startBgMusic(bgMusicStyle || "calm");
    }
  }
  function stopBgMusic() { if (aiSDK) aiSDK.stopBgMusic(); }

  // ── DOM helpers ─────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ── Overflow: always report false (viewport-filling flex layout) ───
  function reportNoOverflow() {
    window.parent.postMessage({
      type: "ai-sdk-content-overflow",
      overflow: false,
      scrollHeight: window.innerHeight,
      viewportHeight: window.innerHeight
    }, "*");
  }

  // ── Container dimensions listener ───────────────────────────────────
  function setupContainerDimensionsListener() {
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "container-dimensions") {
        var wasMobile = parentIsMobile;
        parentIsFullscreen = !!event.data.isFullscreen;
        parentIsMobile = !!event.data.isMobile;
        console.log("[IWQ] container-dimensions — isMobile:", parentIsMobile, "isFullscreen:", parentIsFullscreen, "width:", event.data.width);
        if (wasMobile !== parentIsMobile && desktopResponse) {
          switchViewportImage();
        }
      }
    });
  }

  function switchViewportImage() {
    var shouldUseMobile = parentIsMobile && mobileResponse;
    var newActive = shouldUseMobile ? mobileResponse : desktopResponse;
    var newUrl = newActive.imageUrl;
    if (newUrl === imageUrl) return;
    imageUrl = newUrl;
    var imgEl = $("display-image");
    if (imgEl) { imgEl.src = newUrl; }
  }

  function setupParentActionListener() {
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "interaction-action") {
        if (event.data.action === "Retry") { onRetry(); }
      }
    });
  }

  // ── Defaults ────────────────────────────────────────────────────────
  var DEFAULT_TITLE = "The Solar System";
  var DEFAULT_IMAGE_DESCRIPTION = "A panoramic view of the solar system showing the Sun and all eight planets in order, with colourful nebulae and stars in the background. Each planet should be recognisable by its distinctive features.";
  function defaultQuestions() {
    return [
      { question: "Which planet is known as the Red Planet?", correct: "Mars", wrong: ["Venus", "Jupiter", "Mercury"] },
      { question: "What is the largest planet in our solar system?", correct: "Jupiter", wrong: ["Saturn", "Neptune", "Uranus"] },
      { question: "Which planet is famous for its rings?", correct: "Saturn", wrong: ["Jupiter", "Neptune", "Uranus"] },
      { question: "What is the average distance from the Sun to Earth?", type: "slider", min: 50, max: 300, step: 1, unit: "million km", correct: 150, labels: { low: "50 million km", high: "300 million km" } },
      { question: "How many planets are in our solar system?", correct: "8", wrong: ["7", "9", "10"] }
    ];
  }

  // ── Init ────────────────────────────────────────────────────────────
  function init() {
    aiSDK = createIframeAISDK();
    var config = window.interactionConfig || {};
    var data = window.interactionData || {};

    isTestMode = config.testMode !== false;
    var usingDefaults = false;

    quizTitle = config.title || data.title || "";
    imageDescription = config.imageDescription || data.imageDescription || "";

    if (config.questions) {
      if (typeof config.questions === "string") {
        try { questions = JSON.parse(config.questions); } catch (e) { questions = []; }
      } else if (Array.isArray(config.questions)) {
        questions = config.questions;
      }
    } else if (Array.isArray(data.questions)) {
      questions = data.questions;
    }

    if (questions && questions.length > 0) {
      questions = questions.filter(function (q) {
        if (!q || !q.question) return false;
        if (q.type === "slider") return true;
        return q.correct && Array.isArray(q.wrong) && q.wrong.length >= 3;
      });
    }
    if (!questions || questions.length === 0) {
      usingDefaults = true;
      questions = defaultQuestions();
    }
    if (!quizTitle) quizTitle = usingDefaults ? DEFAULT_TITLE : "Quiz";
    if (!imageDescription) imageDescription = usingDefaults ? DEFAULT_IMAGE_DESCRIPTION : "";

    bgMusicStyle = config.bgMusicStyle || "calm";
    bgMusicUrl = config.bgMusicUrl || null;
    if (bgMusicStyle === "custom" && bgMusicUrl) {
      bgMusicLoopConfig = {
        loopStart: config.bgMusicLoopStart || 0,
        loopEnd: config.bgMusicLoopEnd || 0,
        crossfade: config.bgMusicCrossfade != null ? config.bgMusicCrossfade : 2,
      };
    }

    questionResults = [];
    $("title-text").textContent = quizTitle;
    $("question-count").textContent = questions.length + " questions";

    $("generate-btn").addEventListener("click", onGenerate);
    $("movie-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onGenerate();
    });

    for (var i = 0; i < 4; i++) {
      (function (idx) {
        $("answer-" + idx).addEventListener("click", function () {
          onAnswerSelected(idx);
        });
      })(i);
    }

    $("slider-input").addEventListener("input", function () {
      var q = questions[currentQuestionIndex];
      var sUnit = (q && q.unit) || "%";
      $("slider-value").textContent = this.value + (sUnit === "%" ? "%" : " " + sUnit);
    });
    $("slider-submit-btn").addEventListener("click", onSliderSubmit);

    setupParentActionListener();
    setupContainerDimensionsListener();

    if (isTestMode) {
      $("intro-start-btn").addEventListener("click", function () {
        hide($("intro-section"));
        show($("input-section"));
        $("movie-input").focus();
      });
    } else {
      $("intro-start-btn").addEventListener("click", function () {
        hide($("intro-section"));
        generateFromPersonalisation();
      });
    }
    show($("intro-section"));
    hide($("input-section"));

    reportNoOverflow();
  }

  // ── Personalisation pipeline ────────────────────────────────────────
  function generateFromPersonalisation() {
    show($("loading-section"));
    $("loading-text").textContent = "Finding the best image for you...";

    if (aiSDK && aiSDK.getPrefetchResult) {
      aiSDK.getPrefetchResult("personalisedImage", function (prefetch) {
        if (prefetch && prefetch.status === "ready" && prefetch.result) {
          usePrefetchedResult(prefetch.result);
          return;
        }
        if (prefetch && prefetch.status === "pending") {
          pollPrefetch(0);
          return;
        }
        runPersonalisationPipeline();
      });
    } else {
      runPersonalisationPipeline();
    }
  }

  function pollPrefetch(attempt) {
    if (attempt > 60) { runPersonalisationPipeline(); return; }
    setTimeout(function () {
      aiSDK.getPrefetchResult("personalisedImage", function (prefetch) {
        if (prefetch && prefetch.status === "ready" && prefetch.result) {
          usePrefetchedResult(prefetch.result);
        } else if (prefetch && prefetch.status === "pending") {
          $("loading-text").textContent = "Almost ready...";
          pollPrefetch(attempt + 1);
        } else {
          runPersonalisationPipeline();
        }
      });
    }, 1000);
  }

  function usePrefetchedResult(result) {
    if (result.source === "cachedPair" && result.pair) {
      useCachedImagePair(result.pair);
    } else if (result.source === "cachedImage" && result.image) {
      useCachedImage(result.image);
    } else if (result.source === "generated" && result.imageResult) {
      if (!result.imageResult.success) { runPersonalisationPipeline(); return; }
      onImageResponse(result.imageResult);
    } else {
      runPersonalisationPipeline();
    }
  }

  function runPersonalisationPipeline() {
    var interactionLabel = quizTitle.toLowerCase().replace(/\s+/g, "-");

    aiSDK.findImagePair(
      { dictionaryLabel: interactionLabel, interests: [] },
      function (response) {
        if (response && response.found && response.pair) {
          useCachedImagePair(response.pair);
          return;
        }

        aiSDK.getLessonImages(function (images, err) {
          var matching = (images || []).filter(function (img) {
            return img.dictionaryLabels && img.dictionaryLabels.indexOf(interactionLabel) !== -1;
          });
          if (matching.length > 0) {
            useCachedImage(matching[Math.floor(Math.random() * matching.length)]);
            return;
          }

          $("loading-text").textContent = "Choosing the best style for you...";
          var contentItems = questions.map(function (q) { return q.question; });
          aiSDK.selectBestTheme(
            { contentItems: contentItems, contentTitle: quizTitle },
            function (themeResult) {
              var theme = (themeResult && themeResult.theme) || "Studio Ghibli";
              $("loading-text").textContent = "Generating illustration in the style of " + theme + "...";
              generateWithTheme(theme);
            }
          );
        });
      }
    );
  }

  function useCachedImagePair(pair) {
    $("loading-text").textContent = "Loading cached image...";
    desktopResponse = { imageUrl: pair.desktop.imageUrl, imageId: pair.desktop.imageId };
    mobileResponse = pair.mobile ? { imageUrl: pair.mobile.imageUrl, imageId: pair.mobile.imageId } : null;
    var active = (parentIsMobile && mobileResponse) ? mobileResponse : desktopResponse;
    imageUrl = active.imageUrl;
    $("cache-badge").textContent = "Cached";
    $("cache-badge").className = "cache-badge cached";
    show($("cache-badge"));
    loadImageAndStartQuiz(active.imageUrl);
  }

  function useCachedImage(imageRecord) {
    $("loading-text").textContent = "Loading cached image...";
    desktopResponse = { imageUrl: imageRecord.imageUrl || imageRecord.url, imageId: imageRecord.id };
    mobileResponse = null;
    imageUrl = desktopResponse.imageUrl;
    $("cache-badge").textContent = "Cached";
    $("cache-badge").className = "cache-badge cached";
    show($("cache-badge"));
    loadImageAndStartQuiz(imageRecord.imageUrl || imageRecord.url);
  }

  function loadImageAndStartQuiz(url) {
    var imgEl = $("display-image");
    imgEl.onload = function () {
      hide($("loading-section"));
      show($("content-section"));
      startQuiz();
      reportNoOverflow();
    };
    imgEl.onerror = function () {
      $("loading-text").textContent = "Failed to load image — generating fresh...";
      var themes = ["Studio Ghibli", "Pixar", "Watercolor", "Comic Book", "Retro Cartoon"];
      generateWithTheme(themes[Math.floor(Math.random() * themes.length)]);
    };
    imgEl.src = url;
  }

  // ── Image request builder ───────────────────────────────────────────
  function buildImageRequest(styleName) {
    var sceneDesc = imageDescription
      ? "The painting depicts: " + imageDescription + ". "
      : "The painting is an atmospheric, educational scene related to the topic: ''" + quizTitle + "''. " +
        "The scene should be visually engaging, thematic, and evocative of the subject matter. ";

    var prompt =
      "IMPORTANT: This image is purely decorative — it must contain NO text, labels, captions, or numbers. " +
      "Create a single wide panoramic landscape painted illustration inspired by the visual style and aesthetic of ''" +
      styleName + "''. Use a similar color palette, art style, and character design sensibility. " +
      sceneDesc +
      "Dark backgrounds (#0f0f23 or near-black) blend with the dark UI. " +
      "FRAMING: Full-bleed artwork — the painting touches all four edges of the canvas. " +
      "ASPECT RATIO: This is a 16:9 widescreen landscape image. Compose the scene to work well in widescreen format.";

    var customDesc = imageDescription
      ? "Illustration of: " + imageDescription.substring(0, 120)
      : "Widescreen landscape illustration for topic ''" + quizTitle + "''";

    return {
      prompt: prompt,
      userInput: styleName,
      customInstructions: customDesc +
        ". Single scene — ONE cohesive illustration, NOT a grid or collage of separate images." +
        " 16:9 widescreen landscape. Full-bleed artwork that fills the ENTIRE canvas edge-to-edge." +
        " ZERO margins, ZERO padding, ZERO borders, ZERO white space on any side." +
        " If any background is needed it MUST be very dark (#0f0f23 or near-black) — NEVER white or light." +
        " Zero text/labels.",
      dictionaryLabels: [quizTitle.toLowerCase().replace(/\s+/g, "-")],
      width: 1024,
      height: 576,
      dualViewport: true,
      mobileWidth: 768,
      mobileHeight: 1024,
      testMode: isTestMode,
    };
  }

  function generateWithTheme(theme) {
    aiSDK.generateImage(buildImageRequest(theme), onImageResponse);
  }

  function onGenerate() {
    var movie = $("movie-input").value.trim();
    if (!movie) { shakeElement($("movie-input")); return; }
    hide($("input-section"));
    show($("loading-section"));
    $("loading-text").textContent = "Generating " + quizTitle + " illustration in the style of " + movie + "...";
    aiSDK.generateImage(buildImageRequest(movie), onImageResponse);
  }

  function onImageResponse(response) {
    if (!response.success) {
      $("loading-text").textContent = "Error: " + (response.error || "Image generation failed");
      $("loading-spinner").style.display = "none";
      var retryBtn = document.createElement("button");
      retryBtn.textContent = "Try Again";
      retryBtn.className = "retry-inline-btn";
      retryBtn.onclick = function () {
        retryBtn.remove();
        $("loading-spinner").style.display = "";
        hide($("loading-section"));
        show($("input-section"));
      };
      $("loading-section").appendChild(retryBtn);
      return;
    }

    desktopResponse = { imageUrl: response.imageUrl || response.imageData, imageId: response.imageId };
    mobileResponse = response.mobileVariant
      ? { imageUrl: response.mobileVariant.imageUrl, imageId: response.mobileVariant.imageId }
      : null;

    console.log("[IWQ] onImageResponse — parentIsMobile:", parentIsMobile,
      "hasMobileVariant:", !!response.mobileVariant,
      "mobileResponse:", !!mobileResponse,
      "iframeWidth:", window.innerWidth);

    var active = (parentIsMobile && mobileResponse) ? mobileResponse : desktopResponse;
    imageUrl = active.imageUrl;
    console.log("[IWQ] Selected:", active === mobileResponse ? "MOBILE" : "DESKTOP", "imageId:", active.imageId);

    if (response.cached) {
      $("cache-badge").textContent = "Cached";
      $("cache-badge").className = "cache-badge cached";
    } else {
      $("cache-badge").textContent = "Fresh";
      $("cache-badge").className = "cache-badge fresh";
    }
    show($("cache-badge"));

    var imgUrl = active.imageUrl;
    if (!imgUrl || imgUrl.indexOf("data:") === 0) {
      imgUrl = response.imageData ? "data:image/png;base64," + response.imageData : active.imageUrl;
    }
    loadImageAndStartQuiz(imgUrl);
  }

  // ── WWTBAM Quiz ─────────────────────────────────────────────────────
  function startQuiz() {
    currentQuestionIndex = 0;
    correctCount = 0;
    questionResults = [];
    sliderAnswers = [];
    startBgMusic();
    showCurrentQuestion();
  }

  function showCurrentQuestion() {
    if (currentQuestionIndex >= questions.length) {
      showComplete();
      return;
    }

    answered = false;
    var q = questions[currentQuestionIndex];
    var isSlider = q.type === "slider";

    $("question-text").textContent = q.question;
    $("question-number").textContent = "Question " + (currentQuestionIndex + 1) + " of " + questions.length;

    if (isSlider) {
      hide($("answers-grid"));
      hide($("slider-feedback"));
      show($("slider-container"));
      var sMin = q.min != null ? q.min : 0;
      var sMax = q.max != null ? q.max : 100;
      var sStep = q.step != null ? q.step : 1;
      var sUnit = q.unit || "%";
      var sMid = Math.round((sMin + sMax) / 2);
      var lowLabel = (q.labels && q.labels.low) || (sMin + " " + sUnit);
      var highLabel = (q.labels && q.labels.high) || (sMax + " " + sUnit);
      $("slider-label-low").textContent = lowLabel;
      $("slider-label-high").textContent = highLabel;
      var slider = $("slider-input");
      slider.min = sMin;
      slider.max = sMax;
      slider.step = sStep;
      slider.value = sMid;
      $("slider-value").textContent = sMid + (sUnit === "%" ? "%" : " " + sUnit);
      $("slider-submit-btn").disabled = false;
    } else {
      hide($("slider-container"));
      show($("answers-grid"));

      var options = [
        { text: q.correct, correct: true },
        { text: q.wrong[0], correct: false },
        { text: q.wrong[1], correct: false },
        { text: q.wrong[2], correct: false }
      ];
      shuffledOptions = shuffleArray(options);

      var letters = ["A", "B", "C", "D"];
      for (var i = 0; i < 4; i++) {
        var btn = $("answer-" + i);
        btn.className = "answer-option";
        btn.querySelector(".answer-letter").textContent = letters[i] + ":";
        btn.querySelector(".answer-text").textContent = shuffledOptions[i].text;
        btn.disabled = false;
      }
    }

    updateProgressDots();
    show($("quiz-section"));
  }

  function onAnswerSelected(index) {
    if (answered) return;
    answered = true;

    for (var i = 0; i < 4; i++) { $("answer-" + i).disabled = true; }

    $("answer-" + index).classList.add("selected");

    setTimeout(function () {
      var isCorrect = shuffledOptions[index].correct;
      $("answer-" + index).classList.remove("selected");
      $("answer-" + index).classList.add(isCorrect ? "correct" : "incorrect");

      if (!isCorrect) {
        for (var j = 0; j < 4; j++) {
          if (shuffledOptions[j].correct) { $("answer-" + j).classList.add("correct"); break; }
        }
      }

      questionResults.push(isCorrect);
      updateProgressDots();

      if (isCorrect) {
        correctCount++;
        sfxCorrect();
        spawnConfettiBurst(10);
      } else {
        sfxIncorrect();
      }

      setTimeout(function () {
        currentQuestionIndex++;
        showCurrentQuestion();
      }, 2000);
    }, 800);
  }

  function onSliderSubmit() {
    if (answered) return;
    answered = true;
    $("slider-submit-btn").disabled = true;

    var val = parseFloat($("slider-input").value);
    var q = questions[currentQuestionIndex];
    var sUnit = q.unit || "%";
    var hasCorrect = q.correct != null;
    var correctVal = hasCorrect ? q.correct : null;

    sliderAnswers.push({
      questionIndex: currentQuestionIndex,
      question: q.question,
      value: val,
      correct: correctVal,
      unit: sUnit,
      type: "slider"
    });
    questionResults.push("slider");
    updateProgressDots();

    var delayMs = 800;

    if (hasCorrect) {
      var range = (q.max != null ? q.max : 100) - (q.min != null ? q.min : 0);
      var diff = Math.abs(val - correctVal);
      var pctOff = range > 0 ? (diff / range) * 100 : diff;
      var feedback = $("slider-feedback");
      var unitStr = sUnit === "%" ? "%" : " " + sUnit;
      var cls, label;
      if (pctOff <= 5) {
        cls = "exact-match"; label = "Spot on!";
        sfxCorrect();
        spawnConfettiBurst(10);
      } else if (pctOff <= 20) {
        cls = "close-match"; label = "Close!";
        sfxCorrect();
      } else {
        cls = "close-match"; label = "Good estimate!";
        sfxCorrect();
      }
      feedback.className = cls;
      feedback.innerHTML = "<strong>" + label + "</strong> The answer is <strong>" + correctVal + unitStr + "</strong> — You guessed " + val + unitStr;
      show(feedback);
      delayMs = 2500;
    } else {
      sfxCorrect();
    }

    setTimeout(function () {
      currentQuestionIndex++;
      showCurrentQuestion();
    }, delayMs);
  }

  function updateProgressDots() {
    var container = $("progress-dots");
    container.innerHTML = "";
    for (var i = 0; i < questions.length; i++) {
      var dot = document.createElement("div");
      dot.className = "progress-dot";
      if (i < questionResults.length) {
        var res = questionResults[i];
        if (res === "slider") {
          dot.classList.add("dot-slider");
        } else {
          dot.classList.add(res ? "dot-correct" : "dot-incorrect");
        }
      } else if (i === currentQuestionIndex) {
        dot.classList.add("dot-current");
      }
      container.appendChild(dot);
    }
  }

  function showComplete() {
    stopBgMusic();
    sfxComplete();
    hide($("slider-container"));

    var mcTotal = questions.filter(function (q) { return q.type !== "slider"; }).length;
    var hasSliders = sliderAnswers.length > 0;

    if (mcTotal > 0) {
      var pct = correctCount / mcTotal;
      if (pct === 1) $("completion-title").textContent = "Perfect Score!";
      else if (pct >= 0.75) $("completion-title").textContent = "Great job!";
      else if (pct >= 0.5) $("completion-title").textContent = "Good effort!";
      else $("completion-title").textContent = "Keep practising!";
      $("completion-message").textContent = "You got " + correctCount + " of " + mcTotal + " correct!";
    } else {
      $("completion-title").textContent = "Thanks for your answers!";
      $("completion-message").textContent = "Your responses have been recorded.";
    }

    if (hasSliders) {
      renderSliderResults(null);
    }

    var modal = $("completion-modal");
    modal.style.display = "flex";

    $("completion-retry-btn").onclick = function () { modal.style.display = "none"; onRetry(); };
    $("completion-next-btn").onclick = function () {
      modal.style.display = "none";
      stopBgMusic();
      window.parent.postMessage({ type: "ai-sdk-request-next" }, "*");
    };

    spawnConfettiBurst(30);

    if (hasSliders && aiSDK) {
      var payload = {
        sliderAnswers: sliderAnswers,
        mcScore: { correct: correctCount, total: mcTotal },
        timestamp: Date.now()
      };
      aiSDK.saveInstanceData(payload, function () {
        fetchSliderAverages();
      });
    }
  }

  function renderSliderResults(averagesMap) {
    var container = $("slider-averages");
    if (!container) return;

    var html = "<h3>Estimate Results</h3>";
    for (var s = 0; s < sliderAnswers.length; s++) {
      var sa = sliderAnswers[s];
      var unitStr = sa.unit === "%" ? "%" : " " + (sa.unit || "%");

      html += ''<div class="slider-avg-row"><span class="slider-avg-question">'' + escapeHtml(sa.question) + ''</span></div>'';
      html += ''<div class="slider-detail-grid">'';
      html += ''<div class="slider-detail-item"><span class="slider-detail-label">Your answer</span><span class="slider-detail-value">'' + sa.value + unitStr + ''</span></div>'';
      if (sa.correct != null) {
        html += ''<div class="slider-detail-item"><span class="slider-detail-label">Correct answer</span><span class="slider-detail-value correct-val">'' + sa.correct + unitStr + ''</span></div>'';
      }
      if (averagesMap && averagesMap[sa.questionIndex] != null) {
        var info = averagesMap[sa.questionIndex];
        html += ''<div class="slider-detail-item"><span class="slider-detail-label">Average Answer <small>('' + info.count + '')</small></span><span class="slider-detail-value avg-val">'' + info.avg + unitStr + ''</span></div>'';
      }
      html += ''</div>'';
    }

    container.innerHTML = html;
    show(container);
  }

  function fetchSliderAverages() {
    if (!aiSDK) return;
    aiSDK.getInstanceDataHistory({ limit: 1000 }, function (historyArr) {
      if (!historyArr || !Array.isArray(historyArr) || historyArr.length === 0) return;

      var sumsByQ = {};
      var countsByQ = {};

      for (var h = 0; h < historyArr.length; h++) {
        var entry = historyArr[h];
        var data = entry.data || entry;
        var answers = data.sliderAnswers;
        if (!answers || !Array.isArray(answers)) continue;
        for (var a = 0; a < answers.length; a++) {
          var sa = answers[a];
          var key = sa.questionIndex != null ? sa.questionIndex : sa.question;
          if (!sumsByQ[key]) { sumsByQ[key] = 0; countsByQ[key] = 0; }
          sumsByQ[key] += sa.value;
          countsByQ[key]++;
        }
      }

      var averagesMap = {};
      for (var s = 0; s < sliderAnswers.length; s++) {
        var key = sliderAnswers[s].questionIndex;
        if (countsByQ[key]) {
          averagesMap[key] = {
            avg: Math.round(sumsByQ[key] / countsByQ[key]),
            count: countsByQ[key]
          };
        }
      }

      renderSliderResults(averagesMap);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function onRetry() {
    $("completion-modal").style.display = "none";
    if (aiSDK) { aiSDK.hideSnack(); aiSDK.setInteractionInfo(null); }
    startQuiz();
  }

  // ── Confetti ────────────────────────────────────────────────────────
  function spawnConfettiBurst(count) {
    var container = $("confetti-container");
    var colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#01a3a4", "#ff5e57"];
    for (var i = 0; i < count; i++) {
      var piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = (Math.random() * 100) + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.3) + "s";
      piece.style.animationDuration = (0.8 + Math.random() * 1.2) + "s";
      var size = 6 + Math.random() * 8;
      piece.style.width = size + "px";
      piece.style.height = size + "px";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      container.appendChild(piece);
      setTimeout(function () { piece.remove(); }, 2500);
    }
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function shakeElement(el) {
    el.classList.add("shake");
    setTimeout(function () { el.classList.remove("shake"); }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 10);
  }
})();
',
  iframe_config = '{"noScroll": true, "minWidth": 300, "minHeight": 280}'::jsonb,
  config_schema = '{"fields":[{"key":"title","type":"string","label":"Quiz Title / Topic","default":"","placeholder":"e.g. The Solar System, World History, French Cuisine...","hint":"Leave blank to use built-in defaults (The Solar System).","description":"Topic title shown in the quiz header"},{"key":"imageDescription","type":"string","multiline":true,"rows":3,"label":"Image Description","default":"","placeholder":"e.g. A panoramic view of the solar system showing the Sun and all eight planets in order...","hint":"Describe what the image should show. The AI generates an illustration matching this description, styled to the student''s preferences. Leave blank to auto-generate from the title.","description":"Description of the banner image to generate alongside the quiz"},{"key":"questions","type":"string","multiline":true,"rows":14,"label":"Questions (JSON)","default":"","placeholder":"[{\"question\":\"Which planet is the Red Planet?\",\"correct\":\"Mars\",\"wrong\":[\"Venus\",\"Jupiter\",\"Mercury\"]},\n{\"question\":\"Distance from Sun to Earth?\",\"type\":\"slider\",\"min\":50,\"max\":300,\"step\":1,\"unit\":\"million km\",\"correct\":150,\"labels\":{\"low\":\"50 million km\",\"high\":\"300 million km\"}}]","hint":"JSON array. MC: {question, correct, wrong:[3]}. Slider: {question, type:\"slider\", min, max, step, unit, correct (optional), labels:{low,high}}. Omit min/max for 0-100%. Types can be mixed.","description":"Questions as JSON — supports multiple-choice and slider (custom scale) answer types"}]}'::jsonb,
  sample_data = '{"title":"The Solar System","imageDescription":"A panoramic view of the solar system showing the Sun and all eight planets in order, with colourful nebulae and stars in the background. Each planet should be recognisable by its distinctive features.","questions":[{"question":"Which planet is known as the Red Planet?","correct":"Mars","wrong":["Venus","Jupiter","Mercury"]},{"question":"What is the largest planet in our solar system?","correct":"Jupiter","wrong":["Saturn","Neptune","Uranus"]},{"question":"Which planet is famous for its rings?","correct":"Saturn","wrong":["Jupiter","Neptune","Uranus"]},{"question":"What is the average distance from the Sun to Earth?","type":"slider","min":50,"max":300,"step":1,"unit":"million km","correct":150,"labels":{"low":"50 million km","high":"300 million km"}},{"question":"How many planets are in our solar system?","correct":"8","wrong":["7","9","10"]}]}'::jsonb
WHERE id = 'image-with-questions';
