import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcessExplorerInteraction1736900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Image Explorer Interaction (DB id: process-explorer for backward compat)
    // Generates a themed image of content and quizzes users to identify regions by clicking
    // Tests Phase 4: content caching, component map labelling, dictionary labels
    //
    // Full JS source: Upora/backend/scripts/process-explorer-full-code.js

    const htmlCode = `<div id="app">
  <div id="confetti-container"></div>

  <!-- Title bar -->
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
      <p>You&apos;ll see an image introducing some of the content for this lesson. Try to answer the questions by clicking on the right part of the image.</p>
      <p class="intro-hint">You can zoom in and pan around to get a closer look.</p>
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

  <!-- Loading section -->
  <div id="loading-section" style="display:none;">
    <div id="loading-spinner" class="spinner"></div>
    <p id="loading-text">Generating illustration...</p>
  </div>

  <!-- Explore section: image viewer only (questions shown in parent control bar) -->
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
}

/* Title bar */
#title-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
#title-bar h1 {
  color: #00d4ff;
  font-size: 20px;
  font-weight: 700;
}
#step-count {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  background: rgba(0,212,255,0.08);
  padding: 2px 8px;
  border-radius: 12px;
}
.cache-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}
.cache-badge.cached { background: rgba(0,255,100,0.15); color: #00ff88; }
.cache-badge.fresh  { background: rgba(255,170,0,0.15); color: #ffaa00; }

/* Input section */
#input-section {
  padding: 20px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.instruction {
  margin-bottom: 12px;
  font-size: 15px;
  color: rgba(255,255,255,0.7);
}
.input-row {
  display: flex;
  gap: 10px;
}
#movie-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
#movie-input:focus { border-color: #00d4ff; }
#movie-input::placeholder { color: rgba(255,255,255,0.3); }

#generate-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  white-space: nowrap;
}
#generate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,0.3); }
#generate-btn:active { transform: translateY(0); }

/* Loading */
#loading-section {
  text-align: center;
  padding: 60px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0,212,255,0.2);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }
#loading-text {
  font-size: 15px;
  color: rgba(255,255,255,0.6);
}

/* Explore section: flex column filling remaining space */
#explore-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Image viewer: fills all space above bottom panel */
#image-viewer {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
  cursor: crosshair;
  touch-action: none;
}
#explore-image {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  transition: none;
  user-select: none;
  -webkit-user-drag: none;
}

/* Zoom controls overlay */
#zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
}
#zoom-controls button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(0,212,255,0.3);
  background: rgba(0,0,0,0.6);
  color: #00d4ff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  line-height: 1;
}
#zoom-controls button:hover { background: rgba(0,212,255,0.2); }

/* Intro section */
#intro-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.intro-content {
  text-align: center;
  max-width: 440px;
}
.intro-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.intro-content h2 {
  color: #00d4ff;
  font-size: 22px;
  margin-bottom: 12px;
}
.intro-content p {
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
}
.intro-hint {
  font-size: 12px !important;
  color: rgba(255,255,255,0.4) !important;
  margin-bottom: 20px !important;
}
.intro-start-btn {
  padding: 14px 36px;
  background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  margin-top: 8px;
}
.intro-start-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,212,255,0.35); }
.intro-start-btn:active { transform: translateY(0); }

/* Region flash overlay */
.region-flash {
  position: absolute;
  pointer-events: none;
  border-radius: 6px;
  animation: flash-pulse 0.6s ease-out;
  opacity: 0;
}
@keyframes flash-pulse {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.05); }
}

/* Confetti */
#confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}
.confetti-piece {
  position: absolute;
  top: -10px;
  animation: confetti-fall linear forwards;
}
@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* Shake animation for validation */
.shake {
  animation: shake 0.4s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

/* Responsive */
@media (max-width: 600px) {
  #bottom-panel { height: 130px; padding: 8px 12px; }
  .input-row { flex-direction: column; }
  #generate-btn { width: 100%; }
  #title-bar h1 { font-size: 18px; }
  #question-text { font-size: 14px; }
}`;

    // Read the full JS from the reference file description
    // The actual code is embedded below (from Upora/backend/scripts/process-explorer-full-code.js)
    const jsCode = `(function () {
  "use strict";

  // ── SDK bootstrap ──────────────────────────────────────────────────
  const createIframeAISDK = () => {
    let subscriptionId = null;
    let requestCounter = 0;
    const generateRequestId = () => "req-" + Date.now() + "-" + ++requestCounter;
    const generateSubscriptionId = () => "sub-" + Date.now() + "-" + Math.random();

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
      showSnack: (content, duration, hideFromChatUI, callback) => {
        sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (r) => {
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
    };
  };

  // ── State ───────────────────────────────────────────────────────────
  let aiSDK = null;
  let steps = [];
  let processTitle = "";
  let componentMap = null;
  let imageUrl = null;
  let quizOrder = [];
  let currentQuizIndex = 0;
  let correctCount = 0;
  let attempts = 0;

  // Zoom / pan state
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let lastPanX = 0;
  let lastPanY = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;
  const CLICK_TOLERANCE = 8;

  // ── DOM helpers ─────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ── Initialise ──────────────────────────────────────────────────────
  function init() {
    aiSDK = createIframeAISDK();

    const config = window.interactionConfig || {};
    const data = window.interactionData || {};

    processTitle = config.processTitle || data.processTitle || "Process";

    if (config.processSteps && typeof config.processSteps === "string") {
      steps = config.processSteps.split("\\n").map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.processSteps)) {
      steps = data.processSteps.map((s) => String(s).trim()).filter(Boolean);
    } else {
      steps = [
        "Collect used paper",
        "Sort and shred",
        "Mix with water to make pulp",
        "Clean pulp remove ink and glue",
        "Roll into thin sheets",
        "Dry and cut",
        "New paper products",
      ];
    }

    $("title-text").textContent = processTitle;
    $("step-count").textContent = steps.length + " steps";

    $("generate-btn").addEventListener("click", onGenerate);

    $("movie-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onGenerate();
    });

    $("zoom-slider").addEventListener("input", (e) => {
      scale = parseFloat(e.target.value);
      applyTransform();
    });

    $("zoom-reset").addEventListener("click", () => {
      scale = 1;
      panX = 0;
      panY = 0;
      $("zoom-slider").value = "1";
      applyTransform();
    });

    $("skip-btn").addEventListener("click", nextQuestion);
    $("retry-btn").addEventListener("click", onRetry);
    setupImageInteraction();
  }

  // ── Generate image ─────────────────────────────────────────────────
  function onGenerate() {
    const movie = $("movie-input").value.trim();
    if (!movie) {
      shakeElement($("movie-input"));
      return;
    }

    hide($("input-section"));
    show($("loading-section"));
    $("loading-text").textContent = "Generating " + processTitle + " illustration in the style of " + movie + "...";

    const stepsText = steps.map((s, i) => (i + 1) + ". " + s).join(", ");
    const prompt =
      "Create a single illustration inspired by the visual style and aesthetic of '" +
      movie +
      "'. Use a similar color palette, art style, and character design sensibility. " +
      "The illustration depicts these process steps as distinct visual regions arranged left-to-right: " +
      stepsText +
      ". Each step must be visually distinct and clearly identifiable as a separate area. " +
      "Do not include any text, labels, numbers, or words in the image. Leave a small margin around all edges of the image.";

    const componentPrompt = steps.join(", ");

    console.log("[ImageExplorer] Generating image with prompt:", prompt.substring(0, 120) + "...");
    console.log("[ImageExplorer] componentPromptContent:", componentPrompt);

    aiSDK.generateImage(
      {
        prompt: prompt,
        userInput: movie,
        includeComponentMap: true,
        componentPromptContent: componentPrompt,
        dictionaryLabels: [processTitle.toLowerCase().replace(/\\s+/g, "-")],
        width: 1280,
        height: 720,
      },
      onImageResponse
    );
  }

  function onImageResponse(response) {
    console.log("[ImageExplorer] Image response:", {
      success: response.success,
      cached: response.cached,
      hasComponentMap: !!response.componentMap,
      imageId: response.imageId,
      error: response.error || null,
    });

    if (!response.success) {
      console.error("[ImageExplorer] Image generation FAILED:", response.error || "unknown");
      console.error("[ImageExplorer] Full error response:", JSON.stringify(response, null, 2));
      $("loading-text").textContent = "Error: " + (response.error || "Image generation failed");
      $("loading-spinner").style.display = "none";
      var retryBtn = document.createElement("button");
      retryBtn.textContent = "Try Again";
      retryBtn.style.cssText = "margin-top:12px;padding:8px 20px;border-radius:8px;background:#ff6b6b;color:#fff;border:none;cursor:pointer;font-size:14px;";
      retryBtn.onclick = function () { retryBtn.remove(); hide($("loading-section")); show($("input-section")); };
      $("loading-section").appendChild(retryBtn);
      return;
    }

    if (response.cached) {
      console.log("%c[ImageExplorer] ♻️ IMAGE SERVED FROM CACHE (no LLM call)", "color: #00ff88; font-size: 14px; font-weight: bold;");
    } else {
      console.log("%c[ImageExplorer] 🆕 FRESH IMAGE GENERATED (LLM call made)", "color: #ffaa00; font-size: 14px; font-weight: bold;");
    }

    imageUrl = response.imageUrl || response.imageData;
    componentMap = response.componentMap || null;

    if (componentMap && componentMap.components) {
      console.log("[ImageExplorer] Component map received:", componentMap.components.length, "components");
      componentMap.components.forEach((c) => {
        console.log("  -", c.label, "at", c.x + "," + c.y, "size", c.width + "x" + c.height + "%");
      });
    } else {
      console.warn("[ImageExplorer] No component map returned - quiz will use fallback grid");
    }

    if (response.cached) {
      $("cache-badge").textContent = "♻️ Cached";
      $("cache-badge").className = "cache-badge cached";
    } else {
      $("cache-badge").textContent = "🆕 Fresh";
      $("cache-badge").className = "cache-badge fresh";
    }
    show($("cache-badge"));

    const imgEl = $("explore-image");
    imgEl.onload = () => {
      hide($("loading-section"));
      show($("explore-section"));
      startQuiz();
    };
    imgEl.onerror = () => {
      $("loading-text").textContent = "Failed to load image";
      setTimeout(() => {
        hide($("loading-section"));
        show($("input-section"));
      }, 2000);
    };

    if (response.imageUrl) {
      imgEl.src = response.imageUrl;
    } else if (response.imageData) {
      imgEl.src = "data:image/png;base64," + response.imageData;
    }
  }

  // ── Quiz logic ──────────────────────────────────────────────────────
  function startQuiz() {
    quizOrder = shuffleArray([...Array(steps.length).keys()]);
    currentQuizIndex = 0;
    correctCount = 0;
    attempts = 0;
    showCurrentQuestion();
  }

  function showCurrentQuestion() {
    if (currentQuizIndex >= quizOrder.length) {
      showComplete();
      return;
    }
    const stepIdx = quizOrder[currentQuizIndex];
    $("question-text").textContent = 'Click on: "' + steps[stepIdx] + '"';
    $("progress-text").textContent = "Step " + (currentQuizIndex + 1) + " of " + steps.length;
    $("progress-fill").style.width = ((currentQuizIndex / steps.length) * 100) + "%";
    hide($("feedback-area"));
    hide($("skip-btn"));
    show($("question-area"));
    attempts = 0;
  }

  function nextQuestion() {
    currentQuizIndex++;
    hide($("feedback-area"));
    showCurrentQuestion();
  }

  function showComplete() {
    hide($("question-area"));
    hide($("feedback-area"));
    $("question-text").textContent = "All done! You found " + correctCount + " of " + steps.length + " steps.";
    $("progress-fill").style.width = "100%";
    $("progress-text").textContent = "Complete!";
    show($("question-area"));
    show($("retry-btn"));
    spawnConfettiBurst(30);
  }

  function onRetry() {
    hide($("retry-btn"));
    scale = 1; panX = 0; panY = 0;
    $("zoom-slider").value = "1";
    applyTransform();
    startQuiz();
  }

  // ── Click handling on image ─────────────────────────────────────────
  function onImageClick(e) {
    if (currentQuizIndex >= quizOrder.length) return;

    const container = $("image-viewer");
    const imgEl = $("explore-image");
    const rect = container.getBoundingClientRect();

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const imgDisplayW = imgEl.naturalWidth * scale;
    const imgDisplayH = imgEl.naturalHeight * scale;

    const imgLeft = (rect.width - imgDisplayW) / 2 + panX;
    const imgTop = (rect.height - imgDisplayH) / 2 + panY;

    const pctX = ((clickX - imgLeft) / imgDisplayW) * 100;
    const pctY = ((clickY - imgTop) / imgDisplayH) * 100;

    if (pctX < 0 || pctX > 100 || pctY < 0 || pctY > 100) return;

    console.log("[ImageExplorer] Click at", pctX.toFixed(1) + "%,", pctY.toFixed(1) + "%");

    const targetStep = steps[quizOrder[currentQuizIndex]];
    const hit = checkHit(pctX, pctY, targetStep);

    if (hit) {
      onCorrect(hit);
    } else {
      onIncorrect();
    }
  }

  function checkHit(pctX, pctY, targetStepLabel) {
    if (!componentMap || !componentMap.components || componentMap.components.length === 0) {
      const stripWidth = 100 / steps.length;
      const targetIdx = quizOrder[currentQuizIndex];
      const stripLeft = targetIdx * stripWidth;
      const stripRight = stripLeft + stripWidth;
      if (pctX >= stripLeft - CLICK_TOLERANCE && pctX <= stripRight + CLICK_TOLERANCE) {
        return { label: targetStepLabel, x: stripLeft, y: 0, width: stripWidth, height: 100 };
      }
      return null;
    }

    const targetLower = targetStepLabel.toLowerCase();
    const matchingComponent = componentMap.components.find((c) => {
      const labelLower = (c.label || "").toLowerCase();
      return labelLower.includes(targetLower) || targetLower.includes(labelLower) || fuzzyMatch(targetLower, labelLower);
    });

    if (!matchingComponent) {
      console.warn("[ImageExplorer] No component label matches step:", targetStepLabel);
      const stripWidth = 100 / steps.length;
      const targetIdx = quizOrder[currentQuizIndex];
      const stripLeft = targetIdx * stripWidth;
      const stripRight = stripLeft + stripWidth;
      if (pctX >= stripLeft - CLICK_TOLERANCE && pctX <= stripRight + CLICK_TOLERANCE) {
        return { label: targetStepLabel, x: stripLeft, y: 0, width: stripWidth, height: 100 };
      }
      return null;
    }

    const cx = matchingComponent.x - CLICK_TOLERANCE;
    const cy = matchingComponent.y - CLICK_TOLERANCE;
    const cw = matchingComponent.width + CLICK_TOLERANCE * 2;
    const ch = matchingComponent.height + CLICK_TOLERANCE * 2;

    if (pctX >= cx && pctX <= cx + cw && pctY >= cy && pctY <= cy + ch) {
      return matchingComponent;
    }

    return null;
  }

  function fuzzyMatch(a, b) {
    const wordsA = a.split(/\\s+/).filter((w) => w.length > 2);
    const wordsB = b.split(/\\s+/).filter((w) => w.length > 2);
    let matches = 0;
    for (const wa of wordsA) {
      for (const wb of wordsB) {
        if (wa.includes(wb) || wb.includes(wa)) matches++;
      }
    }
    return matches >= Math.min(wordsA.length, wordsB.length, 2);
  }

  function onCorrect(component) {
    correctCount++;
    attempts = 0;
    flashRegion(component, "rgba(0, 255, 100, 0.35)");
    spawnConfettiBurst(15);
    $("feedback-text").textContent = "✓ Correct!";
    $("feedback-text").className = "feedback-text correct";
    show($("feedback-area"));
    hide($("skip-btn"));
    setTimeout(nextQuestion, 1200);
  }

  function onIncorrect() {
    attempts++;
    $("feedback-text").textContent = "✗ Not quite!";
    $("feedback-text").className = "feedback-text incorrect";
    show($("feedback-area"));

    if (attempts >= 2) {
      show($("skip-btn"));
      const targetStep = steps[quizOrder[currentQuizIndex]];
      const hint = findComponentForStep(targetStep);
      if (hint && attempts >= 3) {
        flashRegion(hint, "rgba(255, 220, 0, 0.25)");
      }
    }
  }

  function findComponentForStep(stepLabel) {
    if (!componentMap || !componentMap.components) return null;
    const lower = stepLabel.toLowerCase();
    return componentMap.components.find((c) => {
      const l = (c.label || "").toLowerCase();
      return l.includes(lower) || lower.includes(l) || fuzzyMatch(lower, l);
    }) || null;
  }

  // ── Region flash overlay ───────────────────────────────────────────
  function flashRegion(component, color) {
    const container = $("image-viewer");
    const imgEl = $("explore-image");
    const rect = container.getBoundingClientRect();
    const imgDisplayW = imgEl.naturalWidth * scale;
    const imgDisplayH = imgEl.naturalHeight * scale;
    const imgLeft = (rect.width - imgDisplayW) / 2 + panX;
    const imgTop = (rect.height - imgDisplayH) / 2 + panY;

    const overlay = document.createElement("div");
    overlay.className = "region-flash";
    overlay.style.left = (imgLeft + (component.x / 100) * imgDisplayW) + "px";
    overlay.style.top = (imgTop + (component.y / 100) * imgDisplayH) + "px";
    overlay.style.width = ((component.width / 100) * imgDisplayW) + "px";
    overlay.style.height = ((component.height / 100) * imgDisplayH) + "px";
    overlay.style.background = color;
    container.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1000);
  }

  // ── Confetti ───────────────────────────────────────────────────────
  function spawnConfettiBurst(count) {
    const container = $("confetti-container");
    const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#01a3a4", "#ff5e57"];

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = (Math.random() * 100) + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.3) + "s";
      piece.style.animationDuration = (0.8 + Math.random() * 1.2) + "s";
      const size = 6 + Math.random() * 8;
      piece.style.width = size + "px";
      piece.style.height = size + "px";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 2500);
    }
  }

  // ── Zoom & Pan ─────────────────────────────────────────────────────
  function applyTransform() {
    var container = $("image-viewer");
    var imgEl = $("explore-image");
    if (!container || !imgEl || !imgEl.naturalWidth) return;
    var cw = container.clientWidth;
    var ch = container.clientHeight;
    var imgW = imgEl.naturalWidth * scale;
    var imgH = imgEl.naturalHeight * scale;
    var tx = (cw - imgW) / 2 + panX;
    var ty = (ch - imgH) / 2 + panY;
    imgEl.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
  }

  function setupImageInteraction() {
    const container = $("image-viewer");

    let pointerDownPos = null;
    container.addEventListener("pointerdown", (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });
    container.addEventListener("pointerup", (e) => {
      if (!pointerDownPos) return;
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx < 6 && dy < 6) {
        onImageClick(e);
      }
      pointerDownPos = null;
    });

    container.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      lastPanX = panX;
      lastPanY = panY;
      container.style.cursor = "grabbing";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      panX = lastPanX + (e.clientX - panStartX);
      panY = lastPanY + (e.clientY - panStartY);
      applyTransform();
    });
    window.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        $("image-viewer").style.cursor = "crosshair";
      }
    });

    container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * delta));
      $("zoom-slider").value = String(scale);
      applyTransform();
    }, { passive: false });

    let activeTouches = [];

    container.addEventListener("touchstart", (e) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 1) {
        isPanning = true;
        panStartX = activeTouches[0].clientX;
        panStartY = activeTouches[0].clientY;
        lastPanX = panX;
        lastPanY = panY;
      } else if (activeTouches.length === 2) {
        isPanning = false;
        pinchStartDist = getTouchDist(activeTouches[0], activeTouches[1]);
        pinchStartScale = scale;
      }
      e.preventDefault();
    }, { passive: false });

    container.addEventListener("touchmove", (e) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 1 && isPanning) {
        panX = lastPanX + (activeTouches[0].clientX - panStartX);
        panY = lastPanY + (activeTouches[0].clientY - panStartY);
        applyTransform();
      } else if (activeTouches.length === 2) {
        const dist = getTouchDist(activeTouches[0], activeTouches[1]);
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale * (dist / pinchStartDist)));
        $("zoom-slider").value = String(scale);
        applyTransform();
      }
      e.preventDefault();
    }, { passive: false });

    container.addEventListener("touchend", (e) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 0) isPanning = false;
    });
  }

  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Utility ────────────────────────────────────────────────────────
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shakeElement(el) {
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  }

  // ── Boot ───────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 10);
  }
})();`;

    const configSchema = JSON.stringify({
      fields: [
        {
          key: 'processTitle',
          type: 'string',
          label: 'Process Title',
          default: 'Paper Recycling',
          description: 'Name of the process being illustrated',
        },
        {
          key: 'processSteps',
          type: 'string',
          multiline: true,
          rows: 8,
          label: 'Process Steps (one per line)',
          default: 'Collect used paper\nSort and shred\nMix with water to make pulp\nClean pulp remove ink and glue\nRoll into thin sheets\nDry and cut\nNew paper products',
          description: 'Steps of the process, one per line',
        },
      ],
    });

    const sampleData = JSON.stringify({
      processTitle: 'Paper Recycling',
      processSteps: [
        'Collect used paper',
        'Sort and shred',
        'Mix with water to make pulp',
        'Clean pulp remove ink and glue',
        'Roll into thin sheets',
        'Dry and cut',
        'New paper products',
      ],
    });

    const instanceDataSchema = JSON.stringify({
      fields: [
        { name: 'correctCount', type: 'number', required: false, description: 'Number of steps correctly identified' },
        { name: 'totalSteps', type: 'number', required: false, description: 'Total number of steps in the process' },
        { name: 'movieTheme', type: 'string', required: false, description: 'Movie/TV show entered by the user' },
        { name: 'cached', type: 'boolean', required: false, description: 'Whether the image was served from cache' },
      ],
    });

    const userProgressSchema = JSON.stringify({
      customFields: [
        { name: 'bestScore', type: 'number', required: false, description: 'Best score achieved' },
        { name: 'attemptsCount', type: 'number', required: false, description: 'Number of attempts' },
        { name: 'lastMovieTheme', type: 'string', required: false, description: 'Last movie/show theme used' },
      ],
    });

    const iframeConfig = JSON.stringify({
      noScroll: true,
      minWidth: 640,
      minHeight: 404
    });

    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, html_code, css_code, js_code,
        config_schema, sample_data, instance_data_schema, user_progress_schema, iframe_config, is_active
      ) VALUES (
        'process-explorer',
        'Image Explorer',
        'Generates a themed image of lesson content and quizzes the user to identify each region by clicking. Tests content caching, component map labelling, and dictionary labels.',
        'absorb-show',
        '{}',
        'Create a themed illustration of a process with distinct visual regions for each step.',
        'html',
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        html_code = EXCLUDED.html_code,
        css_code = EXCLUDED.css_code,
        js_code = EXCLUDED.js_code,
        config_schema = EXCLUDED.config_schema,
        sample_data = EXCLUDED.sample_data,
        instance_data_schema = EXCLUDED.instance_data_schema,
        user_progress_schema = EXCLUDED.user_progress_schema,
        iframe_config = EXCLUDED.iframe_config;
    `, [htmlCode, cssCode, jsCode, configSchema, sampleData, instanceDataSchema, userProgressSchema, iframeConfig]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'process-explorer'`);
  }
}
