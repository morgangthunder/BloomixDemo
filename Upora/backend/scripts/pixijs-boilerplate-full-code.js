// PixiJS Interaction Boilerplate
// Provides: SDK, image generation pipeline, responsive viewport, pause system,
// background music, results popup, test mode, and input handling.
// Replace the GAME LOGIC section with your custom interaction.

(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 1: PIXI.JS LOADER
  // ═══════════════════════════════════════════════════════════════════════
  if (window.PIXI) {
    setTimeout(initGame, 10);
  } else {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js";
    s.onload = function () { setTimeout(initGame, 10); };
    s.onerror = function () {
      document.body.innerHTML = '<p style="color:red;padding:20px">Failed to load PixiJS</p>';
    };
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 2: IFRAME AI SDK
  // ═══════════════════════════════════════════════════════════════════════
  var createIframeAISDK = function () {
    var requestCounter = 0;
    var generateRequestId = function () { return "req-" + Date.now() + "-" + ++requestCounter; };
    var sendMessage = function (type, data, callback) {
      var requestId = generateRequestId();
      var message = { type: type, requestId: requestId };
      for (var k in data) { if (data.hasOwnProperty(k)) message[k] = data[k]; }
      if (callback) {
        var listener = function (event) {
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
      emitEvent: function (event, pid) { sendMessage("ai-sdk-emit-event", { event: event, processedContentId: pid }); },
      updateState: function (k, v) { sendMessage("ai-sdk-update-state", { key: k, value: v }); },
      getState: function (cb) { sendMessage("ai-sdk-get-state", {}, function (r) { cb(r.state); }); },
      showSnack: function (content, dur, hide, actions, cb) {
        sendMessage("ai-sdk-show-snack", { content: content, duration: dur, hideFromChatUI: hide || false, actions: actions || [] }, function (r) { if (cb && r.snackId) cb(r.snackId); });
      },
      hideSnack: function () { sendMessage("ai-sdk-hide-snack", {}); },
      generateImage: function (opts, cb) { sendMessage("ai-sdk-generate-image", { options: opts }, function (r) { if (cb) cb(r); }); },
      saveUserProgress: function (d, cb) { sendMessage("ai-sdk-save-user-progress", { data: d }, function (r) { if (cb) cb(r.progress, r.error); }); },
      getUserProgress: function (cb) { sendMessage("ai-sdk-get-user-progress", {}, function (r) { if (cb) cb(r.progress, r.error); }); },
      postToChat: function (c, role, open) { sendMessage("ai-sdk-post-to-chat", { content: c, role: role || "assistant", openChat: open || false }); },
      setInteractionInfo: function (c) { sendMessage("ai-sdk-set-interaction-info", { content: c }); },
      getLessonImages: function (cb) { sendMessage("ai-sdk-get-lesson-images", {}, function (r) { if (cb) cb(r.images || [], r.error); }); },
      findImagePair: function (opts, cb) { sendMessage("ai-sdk-find-image-pair", { options: opts }, function (r) { if (cb) cb(r); }); },
      selectBestTheme: function (opts, cb) { sendMessage("ai-sdk-select-theme", { options: opts }, function (r) { if (cb) cb(r); }); },
      playSfx: function (n) { sendMessage("ai-sdk-play-sfx", { name: n }); },
      startBgMusic: function (st) { sendMessage("ai-sdk-start-bg-music", { style: st || "calm" }); },
      startBgMusicFromUrl: function (url, lc) { sendMessage("ai-sdk-start-bg-music-url", { url: url, loopConfig: lc }); },
      stopBgMusic: function () { sendMessage("ai-sdk-stop-bg-music", {}); },
      setAudioVolume: function (ch, lv) { sendMessage("ai-sdk-set-audio-volume", { channel: ch, level: lv }); },
      navigateToSubstage: function (sid, ssid) { sendMessage("ai-sdk-navigate-to-substage", { stageId: sid, substageId: ssid }); },
      getLessonStructure: function (cb) { sendMessage("ai-sdk-get-lesson-structure", {}, function (r) { if (cb) cb(r.structure); }); },
      setSharedData: function (k, v, cb) { sendMessage("ai-sdk-set-shared-data", { key: k, value: v }, function () { if (cb) cb(); }); },
      getSharedData: function (k, cb) { sendMessage("ai-sdk-get-shared-data", { key: k }, function (r) { if (cb) cb(r.value); }); },
      getPrefetchResult: function (k, cb) { sendMessage("ai-sdk-get-prefetch-result", { key: k }, function (r) { if (cb) cb({ result: r.result, status: r.status, error: r.error }); }); },
      saveInstanceData: function (d, cb) { sendMessage("ai-sdk-save-instance-data", { data: d }, function (r) { if (cb) cb(r.success, r.error); }); },
      getInstanceDataHistory: function (f, cb) { sendMessage("ai-sdk-get-instance-data-history", { filters: f || {} }, function (r) { if (cb) cb(r.data, r.error); }); },
      markCompleted: function (cb) { sendMessage("ai-sdk-mark-completed", {}, function (r) { if (cb) cb(r.progress, r.error); }); },
      incrementAttempts: function (cb) { sendMessage("ai-sdk-increment-attempts", {}, function (r) { if (cb) cb(r.progress, r.error); }); },
    };
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 3: STATE
  // ═══════════════════════════════════════════════════════════════════════
  var aiSDK = null;
  var config = {};
  var title = "PixiJS Interaction";
  var imageDescription = "";
  var isTestMode = true;
  var bgMusicStyle = "calm";
  var bgMusicVolume = 0.04;

  var isPreview = false;
  var personalisation = true;
  var desktopImageUrl = null;
  var mobileImageUrl = null;
  var parentIsMobile = window.innerWidth < 768;

  // PixiJS core
  var app = null;
  var gameStarted = false;
  var gamePaused = false;
  var gameOver = false;
  var gameScale = 1;
  var pausedByParent = false;
  var pauseStartTime = 0;

  // Game timer
  var startTime = 0;
  var elapsedSeconds = 0;

  // Game dimensions (set once in startPixiGame, never changed — CSS transform handles resize)
  var W = 0, H = 0;
  var cx = 0, cy = 0;

  // PixiJS display objects
  var gameLayer = null;
  var uiLayer = null;

  // DOM helpers
  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 4: VIEWPORT LOCK (no-scroll)
  // ═══════════════════════════════════════════════════════════════════════
  function reportNoOverflow() {
    window.parent.postMessage({ type: "ai-sdk-content-overflow", overflow: false, scrollHeight: window.innerHeight, viewportHeight: window.innerHeight }, "*");
  }

  var scrollLocked = false;
  function preventScrollEv(e) { e.preventDefault(); }

  function lockViewport() {
    if (!document.querySelector('meta[name="viewport"]')) {
      var meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";
      document.head.appendChild(meta);
    }
    document.documentElement.style.cssText = "overflow:hidden!important;position:fixed!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;touch-action:none!important;-webkit-overflow-scrolling:auto!important;";
    document.body.style.cssText = "overflow:hidden!important;position:fixed!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;touch-action:none!important;-webkit-overflow-scrolling:auto!important;background:#0a0a1a;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";
    var gc = document.getElementById("game-container");
    if (gc) gc.style.cssText = "width:100vw;height:100vh;max-width:100vw;max-height:100vh;position:fixed;top:0;left:0;overflow:hidden;display:flex;align-items:center;justify-content:center;";
    var pc = document.getElementById("pixi-container");
    if (pc) pc.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden;";
    if (!scrollLocked) {
      scrollLocked = true;
      document.addEventListener("touchmove", preventScrollEv, { passive: false });
      document.addEventListener("wheel", preventScrollEv, { passive: false });
      window.addEventListener("scroll", function () { window.scrollTo(0, 0); });
    }
  }

  // ── Preview placeholder ─────────────────────────────────────────────
  function generatePreviewPlaceholder() {
    var c = document.createElement("canvas");
    c.width = 800; c.height = 600;
    var ctx = c.getContext("2d");
    var grad = ctx.createRadialGradient(400, 300, 50, 400, 300, 400);
    grad.addColorStop(0, "#3a1c71"); grad.addColorStop(0.5, "#d76d77"); grad.addColorStop(1, "#ffaf7b");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 48px 'Segoe UI',system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10;
    ctx.fillText("Preview Image", 400, 300);
    ctx.font = "24px 'Segoe UI',system-ui,sans-serif"; ctx.shadowBlur = 5;
    ctx.fillText("Configure in lesson builder", 400, 360);
    return c.toDataURL("image/png");
  }

  // ── Try cached image (for personalisation OFF) ─────────────────────
  function tryUseCachedImage(cb) {
    var label = getCacheLabel();
    aiSDK.findImagePair({ dictionaryLabel: label, interests: [] }, function (r) {
      if (r && r.found && r.pair) { useCachedImagePair(r.pair); cb(true); return; }
      aiSDK.getLessonImages(function (images) {
        var match = (images || []).filter(function (img) { return img.dictionaryLabels && img.dictionaryLabels.indexOf(label) !== -1; });
        if (match.length > 0) { useCachedImage(match[0]); cb(true); return; }
        cb(false);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 5: INIT & CONFIG
  // ═══════════════════════════════════════════════════════════════════════
  function initGame() {
    console.log("[PixiJS] initGame");
    lockViewport();
    aiSDK = createIframeAISDK();
    config = window.interactionConfig || {};
    var data = window.interactionData || {};

    title = config.title || data.subject || "PixiJS Interaction";
    imageDescription = config.imageDescription || data.imageDescription || data.image_description || "";
    isTestMode = config.testMode !== false;
    isPreview = config.isPreview === true;
    personalisation = config.personalisation !== false;
    bgMusicStyle = config.bgMusicStyle || "calm";
    bgMusicVolume = config.bgMusicVolume != null ? config.bgMusicVolume : 0.04;

    console.log("[PixiJS] Config:", { title: title, testMode: isTestMode, isPreview: isPreview, bgMusicStyle: bgMusicStyle });

    aiSDK.setInteractionInfo("PixiJS Interaction: " + title);

    if (isPreview) {
      show($("loading-section"));
      hide($("input-section"));
      $("loading-text").textContent = "Loading preview...";
      startPixiGame(generatePreviewPlaceholder());
      return;
    }

    if (isTestMode) {
      if (!personalisation) {
        show($("loading-section")); hide($("input-section"));
        $("loading-text").textContent = "Checking for existing image...";
        tryUseCachedImage(function (found) {
          if (found) return;
          show($("input-section")); hide($("loading-section"));
          $("topic-label").textContent = title;
          $("generate-btn").addEventListener("click", onTestGenerate);
          $("movie-input").addEventListener("keydown", function (e) { if (e.key === "Enter") onTestGenerate(); });
        });
      } else {
        show($("input-section"));
        hide($("loading-section"));
        $("topic-label").textContent = title;
        $("generate-btn").addEventListener("click", onTestGenerate);
        $("movie-input").addEventListener("keydown", function (e) { if (e.key === "Enter") onTestGenerate(); });
      }
    } else {
      show($("loading-section"));
      hide($("input-section"));
      $("loading-text").textContent = "Preparing...";
      aiSDK.getPrefetchResult("imageExplorerPreload", function (pf) {
        if (pf && pf.status === "ready" && pf.result) {
          usePrefetchedResult(pf.result);
        } else {
          runPersonalisationPipeline();
        }
      });
    }
    reportNoOverflow();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 6: IMAGE GENERATION PIPELINE
  // ═══════════════════════════════════════════════════════════════════════
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

  function contentFingerprint() {
    var str = imageDescription || title;
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getCacheLabel() {
    return title.toLowerCase().replace(/\s+/g, "-") + "-" + contentFingerprint();
  }

  function runPersonalisationPipeline() {
    var label = getCacheLabel();
    aiSDK.findImagePair({ dictionaryLabel: label, interests: [] }, function (r) {
      if (r && r.found && r.pair) { useCachedImagePair(r.pair); return; }
      aiSDK.getLessonImages(function (images) {
        var match = (images || []).filter(function (img) { return img.dictionaryLabels && img.dictionaryLabels.indexOf(label) !== -1; });
        if (match.length > 0) { useCachedImage(match[0]); return; }
        $("loading-text").textContent = "Choosing art style...";
        aiSDK.selectBestTheme({ contentItems: [title], contentTitle: title }, function (tr) {
          var theme = (tr && tr.theme) || "Studio Ghibli";
          $("loading-text").textContent = "Generating in the style of " + theme + "...";
          generateWithTheme(theme);
        });
      });
    });
  }

  function useCachedImagePair(pair) {
    $("loading-text").textContent = "Loading cached image...";
    desktopImageUrl = pair.desktop.imageUrl;
    mobileImageUrl = pair.mobile ? pair.mobile.imageUrl : null;
    startPixiGame(pickImageUrl());
  }

  function useCachedImage(rec) {
    $("loading-text").textContent = "Loading cached image...";
    desktopImageUrl = rec.imageUrl || rec.url;
    mobileImageUrl = null;
    startPixiGame(pickImageUrl());
  }

  function pickImageUrl() {
    return (parentIsMobile && mobileImageUrl) ? mobileImageUrl : desktopImageUrl;
  }

  function buildImageRequest(styleName) {
    var desc = imageDescription
      ? "The painting depicts: " + imageDescription + ". "
      : "An atmospheric, educational scene that visually represents the concept of '" + title + "'. ";
    var prompt =
      "IMPORTANT: NO text, labels, captions or numbers. " +
      "Create a single detailed illustration in the visual style and aesthetic of '" + styleName + "'. " +
      desc +
      "Use rich colours and strong visual elements. " +
      "Dark backgrounds (#0f0f23 or near-black) blend with the game UI. " +
      "FRAMING: Full-bleed artwork touching all four edges. 4:3 aspect ratio.";
    return {
      prompt: prompt,
      userInput: styleName,
      customInstructions: "Single cohesive scene. 4:3 aspect ratio. Full-bleed, zero margins. Zero text.",
      dictionaryLabels: [getCacheLabel()],
      width: 1024, height: 768,
      dualViewport: true,
      mobileWidth: 768, mobileHeight: 1024,
      testMode: isTestMode,
    };
  }

  function generateWithTheme(theme) {
    aiSDK.generateImage(buildImageRequest(theme), onImageResponse);
  }

  function onTestGenerate() {
    var movie = $("movie-input").value.trim();
    if (!movie) { $("movie-input").style.animation = "shake 0.3s"; setTimeout(function () { $("movie-input").style.animation = ""; }, 350); return; }
    hide($("input-section"));
    show($("loading-section"));
    $("loading-text").textContent = "Generating in the style of " + movie + "...";
    aiSDK.generateImage(buildImageRequest(movie), onImageResponse);
  }

  function onImageResponse(response) {
    if (!response.success) {
      $("loading-text").textContent = "Error: " + (response.error || "Image generation failed");
      var btn = document.createElement("button");
      btn.textContent = "Try Again";
      btn.className = "retry-btn";
      btn.onclick = function () { btn.remove(); hide($("loading-section")); show($("input-section")); };
      $("loading-section").appendChild(btn);
      return;
    }
    desktopImageUrl = response.imageUrl || response.imageData;
    mobileImageUrl = response.mobileVariant ? response.mobileVariant.imageUrl : null;
    startPixiGame(pickImageUrl());
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 7: PIXI APP SETUP
  // ═══════════════════════════════════════════════════════════════════════
  function startPixiGame(imageUrl) {
    console.log("[PixiJS] Starting game, imageUrl:", imageUrl ? (imageUrl.substring(0, 100) + "...") : "null");
    hide($("loading-section"));
    hide($("input-section"));
    show($("pixi-container"));

    W = window.innerWidth;
    H = window.innerHeight;

    if (W < 320 || H < 280) {
      hide($("pixi-container"));
      var errDiv = document.createElement("div");
      errDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a1a;color:#ff6666;text-align:center;padding:20px;font-family:Segoe UI,system-ui,sans-serif;font-size:14px;line-height:1.5;";
      errDiv.innerHTML = "Screen too small for this interaction.<br>Please use a larger window or rotate your device.";
      document.body.appendChild(errDiv);
      reportNoOverflow();
      return;
    }

    cx = W / 2;
    cy = H / 2;

    app = new PIXI.Application({
      width: W, height: H,
      backgroundColor: 0x0a0a1a,
      antialias: true,
      resolution: 1,
    });
    var cv = app.view;
    cv.style.cssText = "display:block;touch-action:none;";
    $("pixi-container").appendChild(cv);
    rescaleCanvas();

    // Load target image via Image element for cross-origin safety in srcdoc iframes
    if (!imageUrl) { buildGame(null); return; }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      console.log("[PixiJS] Image loaded:", img.width, "x", img.height);
      var baseTex = new PIXI.BaseTexture(img);
      var tex = new PIXI.Texture(baseTex);
      buildGame(tex);
    };
    img.onerror = function () {
      console.warn("[PixiJS] crossOrigin load failed, retrying without...");
      var img2 = new Image();
      img2.onload = function () {
        var baseTex = new PIXI.BaseTexture(img2);
        var tex = new PIXI.Texture(baseTex);
        buildGame(tex);
      };
      img2.onerror = function () {
        console.warn("[PixiJS] Image load completely failed, using fallback");
        buildGame(null);
      };
      img2.src = imageUrl;
    };
    img.src = imageUrl;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 8: BUILD GAME (starfield + image + your custom logic)
  // ═══════════════════════════════════════════════════════════════════════
  function buildGame(targetTexture) {
    if (gameStarted) return;
    gameStarted = true;

    // Starfield background
    var stars = new PIXI.Graphics();
    var starCount = Math.max(400, Math.floor((W * H) / 1200));
    var starColors = [0xffffff, 0xddddff, 0xffddcc, 0xccddff, 0xffeedd];
    for (var i = 0; i < starCount; i++) {
      var sx = Math.random() * W;
      var sy = Math.random() * H;
      var sr = 0.3 + Math.random() * 1.8;
      var sa = 0.15 + Math.random() * 0.85;
      var sc = starColors[Math.floor(Math.random() * starColors.length)];
      stars.beginFill(sc, sa);
      stars.drawCircle(sx, sy, sr);
      stars.endFill();
    }
    app.stage.addChild(stars);

    // Game layer (your custom game objects go here)
    gameLayer = new PIXI.Container();
    app.stage.addChild(gameLayer);

    // UI layer (timer, text overlays)
    uiLayer = new PIXI.Container();
    app.stage.addChild(uiLayer);

    // Timer display
    var timerText = new PIXI.Text("0.0s", { fontSize: 18, fill: 0x00d4ff, fontFamily: "monospace" });
    timerText.anchor.set(1, 0);
    timerText.x = W - 12;
    timerText.y = 12;
    uiLayer.addChild(timerText);
    uiLayer._timerText = timerText;

    // ─── DEMO INTERACTION: display image, click to complete ───────────
    // Replace this section with your custom game logic.
    var imageSprite = null;
    if (targetTexture) {
      imageSprite = new PIXI.Sprite(targetTexture);
      var maxDim = Math.min(W, H) * 0.6;
      var imgScale = Math.min(maxDim / targetTexture.width, maxDim / targetTexture.height);
      imageSprite.scale.set(imgScale);
      imageSprite.anchor.set(0.5);
      imageSprite.x = cx;
      imageSprite.y = cy;
      imageSprite.eventMode = "static";
      imageSprite.cursor = "pointer";
      imageSprite.on("pointerdown", function () {
        if (gamePaused || gameOver) return;
        completeInteraction();
      });
      gameLayer.addChild(imageSprite);
    } else {
      var placeholder = new PIXI.Graphics();
      placeholder.beginFill(0x2244aa);
      placeholder.drawRoundedRect(cx - 100, cy - 80, 200, 160, 12);
      placeholder.endFill();
      placeholder.eventMode = "static";
      placeholder.cursor = "pointer";
      placeholder.on("pointerdown", function () {
        if (gamePaused || gameOver) return;
        completeInteraction();
      });
      gameLayer.addChild(placeholder);
    }

    // Instruction text
    var instrText = new PIXI.Text(
      "This is a boilerplate PixiJS interaction.\nClick the image to complete.",
      { fontSize: 15, fill: 0x99bbdd, align: "center", fontFamily: "Segoe UI, system-ui, sans-serif", lineHeight: 22 }
    );
    instrText.anchor.set(0.5);
    instrText.x = cx;
    instrText.y = cy + (targetTexture ? Math.min(W, H) * 0.35 : 110);
    uiLayer.addChild(instrText);
    // ─── END DEMO INTERACTION ────────────────────────────────────────

    // Input handling
    setupInput();

    // Start timer and music
    startTime = Date.now();
    if (bgMusicStyle && bgMusicStyle !== "none") {
      aiSDK.startBgMusic(bgMusicStyle);
      aiSDK.setAudioVolume("bg", bgMusicVolume);
    }

    // Start game loop
    app.ticker.add(gameLoop);
    reportNoOverflow();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 9: GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════
  function gameLoop(delta) {
    if (gamePaused || gameOver) return;
    var dt = app.ticker.deltaMS;

    elapsedSeconds = (Date.now() - startTime) / 1000;
    if (uiLayer && uiLayer._timerText) {
      uiLayer._timerText.text = elapsedSeconds.toFixed(1) + "s";
    }

    // ─── YOUR GAME UPDATE LOGIC HERE ─────────────────────────────────
    // e.g. updateShip(dt), updateMissiles(dt), updateEnemies(dt), etc.
    // ─────────────────────────────────────────────────────────────────
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 10: COMPLETION & RESULTS
  // ═══════════════════════════════════════════════════════════════════════
  function completeInteraction() {
    if (gameOver) return;
    gameOver = true;
    gamePaused = true;
    var finalTime = elapsedSeconds;
    aiSDK.playSfx("complete");
    aiSDK.stopBgMusic();
    showResults(finalTime, true);
  }

  function showResults(finalTime, isCorrect) {
    var heading = isCorrect ? "Complete!" : "Try Again";
    var headColor = isCorrect ? "#44ff44" : "#ff4444";
    var borderColor = isCorrect ? "rgba(0,212,255,0.3)" : "rgba(255,68,68,0.3)";

    var overlay = document.createElement("div");
    overlay.id = "result-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;";

    var card = document.createElement("div");
    card.style.cssText = "background:rgba(10,15,40,0.95);border:1px solid " + borderColor + ";border-radius:16px;padding:24px 28px;max-width:340px;width:90%;text-align:center;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";

    var h = '<h2 style="color:' + headColor + ';margin:0 0 14px;font-size:22px;">' + heading + '</h2>';
    h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Time: ' + finalTime.toFixed(1) + 's</p>';
    card.innerHTML = h;

    // Benchmark section
    var benchDiv = document.createElement("div");
    benchDiv.style.cssText = "margin:12px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.1);";
    benchDiv.innerHTML = '<p style="color:#666;font-size:12px;margin:0;">Loading scores\u2026</p>';
    card.appendChild(benchDiv);

    // Buttons
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:18px;";

    var retryBtn = document.createElement("button");
    retryBtn.textContent = "Retry";
    retryBtn.style.cssText = "padding:10px 28px;border-radius:8px;border:1px solid #00d4ff;background:transparent;color:#00d4ff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    retryBtn.onmouseenter = function () { retryBtn.style.opacity = "0.7"; };
    retryBtn.onmouseleave = function () { retryBtn.style.opacity = "1"; };
    retryBtn.addEventListener("click", function () { location.reload(); });
    btnRow.appendChild(retryBtn);

    var nextBtn = document.createElement("button");
    nextBtn.textContent = "Next \u2192";
    nextBtn.style.cssText = "padding:10px 28px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    nextBtn.onmouseenter = function () { nextBtn.style.opacity = "0.85"; };
    nextBtn.onmouseleave = function () { nextBtn.style.opacity = "1"; };
    nextBtn.addEventListener("click", function () {
      window.parent.postMessage({ type: "ai-sdk-complete-interaction" }, "*");
    });
    btnRow.appendChild(nextBtn);
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Save data
    var resultData = { time: finalTime, correct: isCorrect };
    aiSDK.saveInstanceData(resultData);
    aiSDK.saveUserProgress({
      score: isCorrect ? Math.max(0, Math.round(100 - finalTime * 2)) : 0,
      completed: true,
      customData: resultData,
    });
    aiSDK.markCompleted();
    aiSDK.emitEvent({ type: "INTERACTION_COMPLETED", data: resultData, requiresLLMResponse: true });

    // Fetch benchmarks
    aiSDK.getInstanceDataHistory({ limit: 100 }, function (history) {
      if (!history || history.length < 2) {
        benchDiv.innerHTML = '<p style="color:#888;font-size:12px;margin:0;">Be the first to set a benchmark!</p>';
        return;
      }
      var times = history.filter(function (r) { return r.instance_data && r.instance_data.correct; }).map(function (r) { return r.instance_data.time; });
      if (times.length < 2) {
        benchDiv.innerHTML = '<p style="color:#888;font-size:12px;margin:0;">Not enough data for benchmarks yet.</p>';
        return;
      }
      var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length;
      var fasterCount = times.filter(function (t) { return finalTime < t; }).length;
      var pct = Math.round((fasterCount / times.length) * 100);
      benchDiv.innerHTML =
        '<p style="color:#00d4ff;font-size:13px;margin:0 0 4px;">Average time: ' + avg.toFixed(1) + 's</p>' +
        '<p style="color:#aaa;font-size:12px;margin:0;">Faster than ' + pct + '% of learners</p>';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 11: PAUSE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  var pauseOverlay = null;
  var unpauseModal = null;

  function showPauseOverlay() {
    if (pauseOverlay) return;
    pauseOverlay = document.createElement("div");
    pauseOverlay.id = "pause-overlay";
    pauseOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:90;pointer-events:none;";
    var label = document.createElement("div");
    label.style.cssText = "color:rgba(255,255,255,0.7);font-size:28px;font-weight:700;font-family:Segoe UI,system-ui,sans-serif;letter-spacing:6px;text-transform:uppercase;text-shadow:0 0 20px rgba(0,212,255,0.4);";
    label.textContent = "PAUSED";
    pauseOverlay.appendChild(label);
    document.body.appendChild(pauseOverlay);
  }

  function hidePauseOverlay() {
    if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; }
    hideUnpauseModal();
  }

  function showUnpauseModal() {
    if (unpauseModal || !gamePaused || gameOver) return;
    unpauseModal = document.createElement("div");
    unpauseModal.id = "unpause-modal";
    unpauseModal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:95;";

    var card = document.createElement("div");
    card.style.cssText = "background:rgba(10,15,40,0.95);border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:24px 28px;max-width:300px;width:85%;text-align:center;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";

    var heading = document.createElement("h3");
    heading.style.cssText = "color:#00d4ff;margin:0 0 16px;font-size:18px;";
    heading.textContent = "Game Paused";
    card.appendChild(heading);

    var msg = document.createElement("p");
    msg.style.cssText = "color:#ccc;margin:0 0 20px;font-size:14px;";
    msg.textContent = "Do you want to unpause the game?";
    card.appendChild(msg);

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";

    var noBtn = document.createElement("button");
    noBtn.textContent = "Stay Paused";
    noBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:1px solid #555;background:transparent;color:#aaa;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    noBtn.onmouseenter = function () { noBtn.style.opacity = "0.7"; };
    noBtn.onmouseleave = function () { noBtn.style.opacity = "1"; };
    noBtn.addEventListener("click", function (e) { e.stopPropagation(); hideUnpauseModal(); });
    btnRow.appendChild(noBtn);

    var yesBtn = document.createElement("button");
    yesBtn.textContent = "Resume";
    yesBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    yesBtn.onmouseenter = function () { yesBtn.style.opacity = "0.85"; };
    yesBtn.onmouseleave = function () { yesBtn.style.opacity = "1"; };
    yesBtn.addEventListener("click", function (e) { e.stopPropagation(); resumeGame(); });
    btnRow.appendChild(yesBtn);

    card.appendChild(btnRow);
    unpauseModal.appendChild(card);
    unpauseModal.addEventListener("click", function (e) { if (e.target === unpauseModal) hideUnpauseModal(); });
    document.body.appendChild(unpauseModal);
  }

  function hideUnpauseModal() {
    if (unpauseModal) { unpauseModal.remove(); unpauseModal = null; }
  }

  function pauseGame() {
    if (gamePaused || gameOver || !gameStarted) return;
    gamePaused = true;
    pauseStartTime = Date.now();
    if (app) app.ticker.stop();
    aiSDK.stopBgMusic();
    showPauseOverlay();
  }

  function resumeGame() {
    if (!gamePaused || gameOver) return;
    gamePaused = false;
    pausedByParent = false;
    startTime += (Date.now() - pauseStartTime);
    hidePauseOverlay();
    if (app) app.ticker.start();
    if (bgMusicStyle && bgMusicStyle !== "none") {
      aiSDK.startBgMusic(bgMusicStyle);
      aiSDK.setAudioVolume("bg", bgMusicVolume);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 12: INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════════
  function setupInput() {
    var view = app.view;
    view.style.touchAction = "none";

    function toGameCoord(clientX, clientY) {
      var rect = view.getBoundingClientRect();
      return { x: (clientX - rect.left) / gameScale, y: (clientY - rect.top) / gameScale };
    }

    view.addEventListener("mousemove", function (e) {
      var g = toGameCoord(e.clientX, e.clientY);
      onPointerMove(g.x, g.y);
    });

    view.addEventListener("mousedown", function (e) {
      if (gameOver) return;
      if (gamePaused) { showUnpauseModal(); return; }
      var g = toGameCoord(e.clientX, e.clientY);
      onPointerDown(g.x, g.y);
    });

    view.addEventListener("mouseup", function (e) {
      if (gameOver || gamePaused) return;
      var g = toGameCoord(e.clientX, e.clientY);
      onPointerUp(g.x, g.y);
    });

    view.addEventListener("touchmove", function (e) {
      e.preventDefault();
      var t = e.touches[0];
      var g = toGameCoord(t.clientX, t.clientY);
      onPointerMove(g.x, g.y);
    }, { passive: false });

    view.addEventListener("touchstart", function (e) {
      e.preventDefault();
      if (gameOver) return;
      if (gamePaused) { showUnpauseModal(); return; }
      var t = e.touches[0];
      var g = toGameCoord(t.clientX, t.clientY);
      onPointerDown(g.x, g.y);
    }, { passive: false });

    view.addEventListener("touchend", function (e) {
      e.preventDefault();
      if (gameOver || gamePaused) return;
      var t = e.changedTouches[0];
      var g = toGameCoord(t.clientX, t.clientY);
      onPointerUp(g.x, g.y);
    }, { passive: false });
  }

  // ─── Override these for your custom input handling ──────────────────
  function onPointerMove(gx, gy) {
    // e.g. update ship target angle, track cursor position
  }

  function onPointerDown(gx, gy) {
    // e.g. start charging a shot, begin drag
  }

  function onPointerUp(gx, gy) {
    // e.g. fire missile, complete drag, check hit targets
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 13: RESPONSIVE VIEW (CSS transform + reload on view change)
  // ═══════════════════════════════════════════════════════════════════════
  function rescaleCanvas() {
    if (!app) return;
    lockViewport();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var sx = vw / W;
    var sy = vh / H;
    gameScale = Math.min(sx, sy);
    var cv = app.view;
    cv.style.transformOrigin = "0 0";
    cv.style.transform = "scale(" + gameScale + ")";
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    cv.style.position = "absolute";
    cv.style.left = Math.floor((vw - W * gameScale) / 2) + "px";
    cv.style.top = Math.floor((vh - H * gameScale) / 2) + "px";
    reportNoOverflow();
  }

  var viewChangeTimer = null;
  var initIsMobile = W < 768 || (W < H && W < 900);
  function scheduleViewReload() {
    if (!gameStarted) return;
    rescaleCanvas();
    clearTimeout(viewChangeTimer);
    viewChangeTimer = setTimeout(function () {
      var newW = window.innerWidth;
      var newH = window.innerHeight;
      var nowIsMobile = newW < 768 || (newW < newH && newW < 900);
      if (nowIsMobile !== initIsMobile) {
        console.log("[PixiJS] Device class changed (mobile=" + initIsMobile + " -> " + nowIsMobile + "), reloading...");
        location.reload();
      }
    }, 500);
  }
  window.addEventListener("resize", scheduleViewReload);

  // Listen for parent messages (container resize, pause/resume)
  window.addEventListener("message", function (ev) {
    if (ev.data && ev.data.type === "container-dimensions") {
      scheduleViewReload();
    }
    if (ev.data && ev.data.type === "interaction-action") {
      if (ev.data.action === "pause") {
        pausedByParent = true;
        pauseGame();
      } else if (ev.data.action === "resume") {
        resumeGame();
      }
    }
  });
})();
