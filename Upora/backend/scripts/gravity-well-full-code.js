// Gravity Well — Match floating concept orbs to reveal a hidden image
// Explore-stage interaction: pairs of concepts drift in zero-gravity space.
// Click orbs to send them into the central gravity well. Matching pairs
// fuse and burn away fog to reveal the target image beneath.

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
  var title = "Gravity Well";
  var imageDescription = "";
  var isTestMode = true;
  var isPreview = false;
  var personalisation = true;
  var bgMusicStyle = "ambient";
  var bgMusicVolume = 0.03;

  var desktopImageUrl = null;
  var mobileImageUrl = null;
  var parentIsMobile = window.innerWidth < 768;

  var app = null;
  var gameStarted = false;
  var gamePaused = false;
  var gameOver = false;
  var gameScale = 1;
  var pausedByParent = false;
  var pauseStartTime = 0;

  var startTime = 0;
  var elapsedSeconds = 0;

  var W = 0, H = 0;
  var cx = 0, cy = 0;

  var gameLayer = null;
  var uiLayer = null;

  // Gravity Well specific state
  var pairs = [];
  var orbs = [];
  var wellOrb = null;
  var matchedCount = 0;
  var totalPairs = 0;
  var wrongAttempts = 0;
  var pointerX = 0, pointerY = 0;

  var fogRT = null;
  var fogSprite = null;
  var revealPositions = [];
  var constellationLines = null;
  var coreOrb = null;
  var timerText = null;
  var pairsText = null;

  var WELL_RADIUS = 0;
  var ORB_MARGIN = 60;
  var PASSIVE_GRAVITY_RANGE = 90;
  var PASSIVE_GRAVITY_STRENGTH = 0.04;
  var FLY_SPEED = 6;
  var DRIFT_SPEED = 0.4;
  var DAMPING = 0.993;
  var MAX_ORB_SPEED = 1.4;
  var FUSE_SPEED = 2.0;
  var pendingReveals = [];

  var wellPulse = 0;
  var particles = [];
  var introShowing = false;

  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 4: VIEWPORT LOCK
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
    document.documentElement.style.cssText = "overflow:hidden!important;position:fixed!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;touch-action:none!important;";
    document.body.style.cssText = "overflow:hidden!important;position:fixed!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;touch-action:none!important;background:#0a0a1a;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";
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
    console.log("[GravityWell] initGame");
    lockViewport();
    aiSDK = createIframeAISDK();
    config = window.interactionConfig || {};
    var data = window.interactionData || {};

    title = config.title || data.title || data.subject || "Gravity Well";
    imageDescription = config.imageDescription || data.imageDescription || data.image_description || "";
    isTestMode = config.testMode !== false;
    isPreview = config.isPreview === true;
    personalisation = config.personalisation !== false;
    bgMusicStyle = config.bgMusicStyle || "ambient";
    bgMusicVolume = config.bgMusicVolume != null ? config.bgMusicVolume : 0.04;

    // Parse pairs
    if (config.pairs) {
      if (typeof config.pairs === "string") {
        try { pairs = JSON.parse(config.pairs); } catch (e) { pairs = []; }
      } else if (Array.isArray(config.pairs)) {
        pairs = config.pairs;
      }
    }
    if ((!pairs || pairs.length === 0) && Array.isArray(data.pairs)) {
      pairs = data.pairs;
    }
    if (!pairs || pairs.length === 0) {
      pairs = [
        { a: "H\u2082O", b: "Water" },
        { a: "NaCl", b: "Salt" },
        { a: "CO\u2082", b: "Carbon Dioxide" },
        { a: "O\u2082", b: "Oxygen" },
        { a: "Fe", b: "Iron" },
      ];
      if (!imageDescription) imageDescription = "A vibrant, richly detailed periodic table of chemical elements with colourful glowing symbols, floating in a cosmic space background with nebulae and stars.";
    }
    totalPairs = pairs.length;

    console.log("[GravityWell] Config:", { title: title, testMode: isTestMode, pairs: totalPairs });
    aiSDK.setInteractionInfo("Gravity Well: match floating concept orbs to reveal the hidden image. " + totalPairs + " pairs to match.");

    if (isPreview) {
      show($("loading-section")); hide($("input-section"));
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
        show($("input-section")); hide($("loading-section"));
        $("topic-label").textContent = title;
        $("generate-btn").addEventListener("click", onTestGenerate);
        $("movie-input").addEventListener("keydown", function (e) { if (e.key === "Enter") onTestGenerate(); });
      }
    } else {
      show($("loading-section")); hide($("input-section"));
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
    if (result.source === "cachedPair" && result.pair) { useCachedImagePair(result.pair); }
    else if (result.source === "cachedImage" && result.image) { useCachedImage(result.image); }
    else if (result.source === "generated" && result.imageResult) {
      if (!result.imageResult.success) { runPersonalisationPipeline(); return; }
      onImageResponse(result.imageResult);
    } else { runPersonalisationPipeline(); }
  }

  function contentFingerprint() {
    var str = (imageDescription || "") + "|" + pairs.map(function (p) { return p.a + ":" + p.b; }).join(",");
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; }
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
      prompt: prompt, userInput: styleName,
      customInstructions: "Single cohesive scene. 4:3 aspect ratio. Full-bleed, zero margins. Zero text.",
      dictionaryLabels: [getCacheLabel()],
      width: 1024, height: 768, dualViewport: true,
      mobileWidth: 768, mobileHeight: 1024, testMode: isTestMode,
    };
  }

  function generateWithTheme(theme) { aiSDK.generateImage(buildImageRequest(theme), onImageResponse); }

  function onTestGenerate() {
    var movie = $("movie-input").value.trim();
    if (!movie) { $("movie-input").style.animation = "shake 0.3s"; setTimeout(function () { $("movie-input").style.animation = ""; }, 350); return; }
    hide($("input-section")); show($("loading-section"));
    $("loading-text").textContent = "Generating in the style of " + movie + "...";
    aiSDK.generateImage(buildImageRequest(movie), onImageResponse);
  }

  function onImageResponse(response) {
    if (!response.success) {
      $("loading-text").textContent = "Error: " + (response.error || "Image generation failed");
      var btn = document.createElement("button"); btn.textContent = "Try Again"; btn.className = "retry-btn";
      btn.onclick = function () { btn.remove(); hide($("loading-section")); show($("input-section")); };
      $("loading-section").appendChild(btn); return;
    }
    desktopImageUrl = response.imageUrl || response.imageData;
    mobileImageUrl = response.mobileVariant ? response.mobileVariant.imageUrl : null;
    startPixiGame(pickImageUrl());
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 7: PIXI APP SETUP
  // ═══════════════════════════════════════════════════════════════════════
  function startPixiGame(imageUrl) {
    console.log("[GravityWell] Starting game");
    hide($("loading-section")); hide($("input-section")); show($("pixi-container"));

    W = window.innerWidth; H = window.innerHeight;
    if (W < 320 || H < 280) {
      hide($("pixi-container"));
      var errDiv = document.createElement("div");
      errDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a1a;color:#ff6666;text-align:center;padding:20px;font-size:14px;line-height:1.5;";
      errDiv.innerHTML = "Screen too small for this interaction.<br>Please use a larger window or rotate your device.";
      document.body.appendChild(errDiv); reportNoOverflow(); return;
    }
    cx = W / 2; cy = H / 2;
    WELL_RADIUS = Math.min(W, H) * 0.06;

    app = new PIXI.Application({ width: W, height: H, backgroundColor: 0x0a0a1a, antialias: true, resolution: 1 });
    var cv = app.view; cv.style.cssText = "display:block;touch-action:none;";
    $("pixi-container").appendChild(cv);
    rescaleCanvas();

    if (!imageUrl) { buildGame(null); return; }
    var img = new Image(); img.crossOrigin = "anonymous";
    img.onload = function () {
      var baseTex = new PIXI.BaseTexture(img);
      buildGame(new PIXI.Texture(baseTex));
    };
    img.onerror = function () {
      var img2 = new Image();
      img2.onload = function () { buildGame(new PIXI.Texture(new PIXI.BaseTexture(img2))); };
      img2.onerror = function () { buildGame(null); };
      img2.src = imageUrl;
    };
    img.src = imageUrl;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 8: BUILD GAME
  // ═══════════════════════════════════════════════════════════════════════
  function buildGame(targetTexture) {
    if (gameStarted) return;
    gameStarted = true;

    // --- Starfield ---
    var stars = new PIXI.Graphics();
    var starCount = Math.max(400, Math.floor((W * H) / 1200));
    var starColors = [0xffffff, 0xddddff, 0xffddcc, 0xccddff, 0xffeedd];
    for (var i = 0; i < starCount; i++) {
      stars.beginFill(starColors[Math.floor(Math.random() * starColors.length)], 0.15 + Math.random() * 0.85);
      stars.drawCircle(Math.random() * W, Math.random() * H, 0.3 + Math.random() * 1.8);
      stars.endFill();
    }
    app.stage.addChild(stars);

    // --- Target image (behind fog) ---
    var imageLayer = new PIXI.Container();
    app.stage.addChild(imageLayer);

    if (targetTexture) {
      var imgSprite = new PIXI.Sprite(targetTexture);
      var sclX = W / targetTexture.width;
      var sclY = H / targetTexture.height;
      var scl = Math.max(sclX, sclY);
      imgSprite.scale.set(scl);
      imgSprite.anchor.set(0.5);
      imgSprite.x = cx; imgSprite.y = cy;
      imageLayer.addChild(imgSprite);
    } else {
      var placeholder = new PIXI.Graphics();
      var grad1 = 0x3a1c71, grad2 = 0xd76d77;
      placeholder.beginFill(grad1); placeholder.drawRect(0, 0, W, H); placeholder.endFill();
      imageLayer.addChild(placeholder);
    }

    // --- Fog mask (covers image, erased on match) ---
    fogRT = PIXI.RenderTexture.create({ width: W, height: H });
    var fogFill = new PIXI.Graphics();
    fogFill.beginFill(0x0a0a1a, 1);
    fogFill.drawRect(0, 0, W, H);
    fogFill.endFill();
    app.renderer.render(fogFill, { renderTexture: fogRT });
    fogFill.destroy();

    // Subtle fog texture noise
    var fogNoise = new PIXI.Graphics();
    for (var n = 0; n < 200; n++) {
      fogNoise.beginFill(0x111122, 0.1 + Math.random() * 0.15);
      fogNoise.drawCircle(Math.random() * W, Math.random() * H, 5 + Math.random() * 30);
      fogNoise.endFill();
    }
    app.renderer.render(fogNoise, { renderTexture: fogRT, clear: false });
    fogNoise.destroy();

    fogSprite = new PIXI.Sprite(fogRT);
    app.stage.addChild(fogSprite);

    // --- Game layer (orbs, well, particles) ---
    gameLayer = new PIXI.Container();
    app.stage.addChild(gameLayer);

    // --- UI layer ---
    uiLayer = new PIXI.Container();
    app.stage.addChild(uiLayer);

    // Timer
    timerText = new PIXI.Text("0.0s", { fontSize: 18, fill: 0x00d4ff, fontFamily: "monospace" });
    timerText.anchor.set(1, 0); timerText.x = W - 12; timerText.y = 12;
    uiLayer.addChild(timerText);

    // Pairs remaining
    pairsText = new PIXI.Text(matchedCount + " / " + totalPairs, { fontSize: 16, fill: 0x88aacc, fontFamily: "Segoe UI, system-ui, sans-serif" });
    pairsText.anchor.set(0, 0); pairsText.x = 12; pairsText.y = 12;
    uiLayer.addChild(pairsText);

    // Instruction panel — DOM-based so it stays within viewport regardless of scaling
    var instrDiv = document.createElement("div");
    instrDiv.id = "instr-panel";
    instrDiv.style.cssText = "position:fixed;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);border-radius:10px;padding:6px 16px;color:#99bbdd;font-size:13px;font-family:'Segoe UI',system-ui,sans-serif;text-align:center;z-index:20;max-width:92vw;pointer-events:none;line-height:1.4;";
    instrDiv.textContent = parentIsMobile
      ? "Tap an orb \u2192 well  \u2022  Tap another to match  \u2022  Reveal the image"
      : "Click an orb to send it to the well  \u2022  Click another to match  \u2022  Reveal the hidden image";
    document.body.appendChild(instrDiv);

    // --- Gravity well visual ---
    drawWell();

    // --- Pre-compute reveal positions (distributed around image) ---
    computeRevealPositions();

    // --- Create orbs ---
    createOrbs();

    // --- Input ---
    setupInput();

    // --- Ticker paused until intro dismissed ---
    app.ticker.add(gameLoop);
    gamePaused = true;
    app.ticker.stop();
    reportNoOverflow();

    if (isPreview) {
      gamePaused = false; startTime = Date.now(); app.ticker.start();
      if (bgMusicStyle && bgMusicStyle !== "none") { aiSDK.startBgMusic(bgMusicStyle); aiSDK.setAudioVolume("bg", bgMusicVolume); }
    } else {
      showIntroModal();
    }
  }

  // --- Well visual ---
  var wellGfx = null;
  function drawWell() {
    wellGfx = new PIXI.Graphics();
    wellGfx.x = cx; wellGfx.y = cy;
    gameLayer.addChild(wellGfx);
    updateWellVisual(0);
  }

  function updateWellVisual(pulse) {
    if (!wellGfx) return;
    wellGfx.clear();
    var r = WELL_RADIUS + Math.sin(pulse) * 3;
    wellGfx.lineStyle(2, 0x00d4ff, 0.25 + Math.sin(pulse) * 0.15);
    wellGfx.drawCircle(0, 0, r);
    wellGfx.lineStyle(1, 0x00d4ff, 0.12);
    wellGfx.drawCircle(0, 0, r * 1.5);
    wellGfx.beginFill(0x00d4ff, 0.04 + Math.sin(pulse) * 0.02);
    wellGfx.drawCircle(0, 0, r);
    wellGfx.endFill();
  }

  // --- Reveal positions (spread around image) ---
  function computeRevealPositions() {
    revealPositions = [];
    var margin = Math.min(W, H) * 0.15;
    var usableW = W - margin * 2;
    var usableH = H - margin * 2;
    var cols = Math.ceil(Math.sqrt(totalPairs * (usableW / usableH)));
    var rows = Math.ceil(totalPairs / cols);
    var cellW = usableW / cols;
    var cellH = usableH / rows;
    for (var idx = 0; idx < totalPairs; idx++) {
      var col = idx % cols;
      var row = Math.floor(idx / cols);
      revealPositions.push({
        x: margin + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.3,
        y: margin + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.3,
      });
    }
  }

  // --- Create orbs from pairs ---
  function createOrbs() {
    orbs = [];
    var allItems = [];
    for (var i = 0; i < pairs.length; i++) {
      allItems.push({ text: pairs[i].a, pairId: i, side: "a" });
      allItems.push({ text: pairs[i].b, pairId: i, side: "b" });
    }
    // Shuffle
    for (var j = allItems.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = allItems[j]; allItems[j] = allItems[k]; allItems[k] = tmp;
    }

    var orbZone = { x: ORB_MARGIN, y: ORB_MARGIN + 40, w: W - ORB_MARGIN * 2, h: H - ORB_MARGIN * 2 - 80 };
    var wellExclude = WELL_RADIUS * 3;

    for (var m = 0; m < allItems.length; m++) {
      var item = allItems[m];
      var ox, oy, tries = 0;
      do {
        ox = orbZone.x + Math.random() * orbZone.w;
        oy = orbZone.y + Math.random() * orbZone.h;
        tries++;
      } while (Math.hypot(ox - cx, oy - cy) < wellExclude && tries < 50);

      var orb = {
        text: item.text,
        pairId: item.pairId,
        side: item.side,
        x: ox, y: oy,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
        state: "floating",
        matched: false,
        gfx: null,
        bg: null,
        label: null,
        targetX: 0, targetY: 0,
        flyTimer: 0,
      };

      // PixiJS container for the orb
      var container = new PIXI.Container();
      container.x = orb.x; container.y = orb.y;

      var fontSize = Math.min(14, Math.max(10, Math.floor(W / 70)));
      var textObj = new PIXI.Text(orb.text, {
        fontSize: fontSize, fill: 0xffffff, fontFamily: "Segoe UI, system-ui, sans-serif",
        fontWeight: "600", align: "center",
      });
      textObj.anchor.set(0.5);

      var padX = 16, padY = 10;
      var bw = textObj.width + padX * 2;
      var bh = textObj.height + padY * 2;

      var bg = new PIXI.Graphics();
      var orbColor = orb.side === "a" ? 0x1a3366 : 0x2a1a44;
      var borderColor = orb.side === "a" ? 0x3388ff : 0xaa55ff;
      bg.lineStyle(1.5, borderColor, 0.7);
      bg.beginFill(orbColor, 0.85);
      bg.drawRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
      bg.endFill();

      container.addChild(bg);
      container.addChild(textObj);
      gameLayer.addChild(container);

      orb.gfx = container;
      orb.bg = bg;
      orb.label = textObj;
      orb.halfW = bw / 2;
      orb.halfH = bh / 2;
      orbs.push(orb);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 9: GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════
  function gameLoop(delta) {
    if (gamePaused || gameOver) return;
    var dt = app.ticker.deltaMS;

    elapsedSeconds = (Date.now() - startTime) / 1000;
    if (timerText) timerText.text = elapsedSeconds.toFixed(1) + "s";
    if (pairsText) pairsText.text = matchedCount + " / " + totalPairs;

    // Well pulse
    wellPulse += dt * 0.003;
    updateWellVisual(wellPulse);

    // Update orbs
    for (var i = 0; i < orbs.length; i++) {
      var orb = orbs[i];
      if (orb.matched) continue;

      if (orb.state === "floating") {
        // Passive gravity toward cursor (very subtle)
        var dx = pointerX - orb.x;
        var dy = pointerY - orb.y;
        var dist = Math.hypot(dx, dy);
        if (dist < PASSIVE_GRAVITY_RANGE && dist > 1) {
          var pull = PASSIVE_GRAVITY_STRENGTH * (1 - dist / PASSIVE_GRAVITY_RANGE);
          orb.vx += (dx / dist) * pull;
          orb.vy += (dy / dist) * pull;
        }

        // Drift
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.vx *= DAMPING;
        orb.vy *= DAMPING;

        // Clamp max speed to keep motion gentle
        var spd = Math.hypot(orb.vx, orb.vy);
        if (spd > MAX_ORB_SPEED) {
          orb.vx = (orb.vx / spd) * MAX_ORB_SPEED;
          orb.vy = (orb.vy / spd) * MAX_ORB_SPEED;
        }

        // Edge bounce — gentle but preserves momentum
        if (orb.x < orb.halfW + 5) { orb.x = orb.halfW + 5; orb.vx = Math.abs(orb.vx) * 0.7 + 0.1; }
        if (orb.x > W - orb.halfW - 5) { orb.x = W - orb.halfW - 5; orb.vx = -(Math.abs(orb.vx) * 0.7 + 0.1); }
        if (orb.y < orb.halfH + 5) { orb.y = orb.halfH + 5; orb.vy = Math.abs(orb.vy) * 0.7 + 0.1; }
        if (orb.y > H - orb.halfH - 40) { orb.y = H - orb.halfH - 40; orb.vy = -(Math.abs(orb.vy) * 0.7 + 0.1); }

        // Avoid well center when floating
        var wdx = orb.x - cx;
        var wdy = orb.y - cy;
        var wdist = Math.hypot(wdx, wdy);
        if (wdist < WELL_RADIUS * 2.5 && wdist > 1) {
          var pushForce = 0.3 * (1 - wdist / (WELL_RADIUS * 2.5));
          orb.vx += (wdx / wdist) * pushForce;
          orb.vy += (wdy / wdist) * pushForce;
        }

        // Orb-orb collision: soft bounce apart
        for (var j = i + 1; j < orbs.length; j++) {
          var other = orbs[j];
          if (other.matched || other.state !== "floating") continue;
          var odx = orb.x - other.x;
          var ody = orb.y - other.y;
          var odist = Math.hypot(odx, ody);
          var minSep = (orb.halfW + other.halfW) * 1.15;
          if (odist < minSep && odist > 0.1) {
            var overlap = (minSep - odist) * 0.5;
            var nx = odx / odist;
            var ny = ody / odist;
            orb.x += nx * overlap * 0.6;
            orb.y += ny * overlap * 0.6;
            other.x -= nx * overlap * 0.6;
            other.y -= ny * overlap * 0.6;
            var sepPush = 0.35;
            orb.vx += nx * sepPush;
            orb.vy += ny * sepPush;
            other.vx -= nx * sepPush;
            other.vy -= ny * sepPush;
          }
        }

        // Continuous gentle drift nudge — keeps orbs circulating
        if (Math.random() < 0.02) {
          orb.vx += (Math.random() - 0.5) * 0.4;
          orb.vy += (Math.random() - 0.5) * 0.4;
        }

      } else if (orb.state === "flying-to-well") {
        var tdx = orb.targetX - orb.x;
        var tdy = orb.targetY - orb.y;
        var tdist = Math.hypot(tdx, tdy);
        if (tdist < 5) {
          orb.x = orb.targetX; orb.y = orb.targetY;
          orb.vx = 0; orb.vy = 0;
          orb.state = "in-well";
        } else {
          var speed = FLY_SPEED + tdist * 0.05;
          orb.x += (tdx / tdist) * Math.min(speed, tdist);
          orb.y += (tdy / tdist) * Math.min(speed, tdist);
        }

      } else if (orb.state === "repelling") {
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.vx *= 0.95;
        orb.vy *= 0.95;
        orb.flyTimer -= dt;
        if (orb.flyTimer <= 0) {
          orb.state = "floating";
          orb.vx = (Math.random() - 0.5) * DRIFT_SPEED;
          orb.vy = (Math.random() - 0.5) * DRIFT_SPEED;
        }
        // Edge bounce during repel
        if (orb.x < orb.halfW + 5 || orb.x > W - orb.halfW - 5) orb.vx *= -0.8;
        if (orb.y < orb.halfH + 5 || orb.y > H - orb.halfH - 40) orb.vy *= -0.8;
        orb.x = Math.max(orb.halfW + 5, Math.min(W - orb.halfW - 5, orb.x));
        orb.y = Math.max(orb.halfH + 5, Math.min(H - orb.halfH - 40, orb.y));

      } else if (orb.state === "fusing") {
        var fdx = orb.targetX - orb.x;
        var fdy = orb.targetY - orb.y;
        var fdist = Math.hypot(fdx, fdy);
        if (fdist < 4) {
          orb.state = "fuse-arrived";
          orb.x = orb.targetX; orb.y = orb.targetY;
          orb.gfx.alpha = 0.3;
          checkFuseReveal(orb.pairId);
        } else {
          orb.x += (fdx / fdist) * Math.min(FUSE_SPEED, fdist);
          orb.y += (fdy / fdist) * Math.min(FUSE_SPEED, fdist);
        }
        orb.gfx.alpha *= 0.988;
      } else if (orb.state === "fuse-arrived") {
        orb.gfx.alpha *= 0.96;
        if (orb.gfx.alpha < 0.05) {
          orb.matched = true;
          orb.gfx.visible = false;
        }
      }

      orb.gfx.x = orb.x;
      orb.gfx.y = orb.y;
    }

    // Update particles
    for (var p = particles.length - 1; p >= 0; p--) {
      var part = particles[p];
      part.life -= dt;
      if (part.life <= 0) {
        part.gfx.destroy();
        particles.splice(p, 1);
        continue;
      }
      part.x += part.vx;
      part.y += part.vy;
      part.vy += 0.02;
      part.gfx.x = part.x;
      part.gfx.y = part.y;
      part.gfx.alpha = Math.max(0, part.life / part.maxLife);
      part.gfx.scale.set(part.gfx.alpha * part.size);
    }

    // Check if core orb needs to appear
    if (matchedCount >= totalPairs && !coreOrb && !gameOver) {
      showConstellationAndCore();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 10: GAME MECHANICS — MATCH / REPEL / REVEAL
  // ═══════════════════════════════════════════════════════════════════════
  function sendOrbToWell(orb) {
    if (orb.state !== "floating" || orb.matched) return;

    if (!wellOrb) {
      wellOrb = orb;
      orb.state = "flying-to-well";
      orb.targetX = cx - 30;
      orb.targetY = cy;
      aiSDK.playSfx("pop");
    } else {
      // Second orb — check match
      aiSDK.playSfx("pop");
      orb.state = "flying-to-well";
      orb.targetX = cx + 30;
      orb.targetY = cy;

      var firstOrb = wellOrb;
      wellOrb = null;

      // Wait for second orb to arrive, then resolve
      var checkInterval = setInterval(function () {
        if (orb.state === "in-well" || Math.hypot(orb.x - orb.targetX, orb.y - orb.targetY) < 10) {
          clearInterval(checkInterval);
          resolveMatch(firstOrb, orb);
        }
      }, 50);
    }
  }

  function ejectWellOrb() {
    if (!wellOrb) return;
    var orb = wellOrb;
    wellOrb = null;
    orb.state = "repelling";
    var angle = Math.random() * Math.PI * 2;
    orb.vx = Math.cos(angle) * 4;
    orb.vy = Math.sin(angle) * 4;
    orb.flyTimer = 600;
    aiSDK.playSfx("pop");
  }

  function resolveMatch(orbA, orbB) {
    if (orbA.pairId === orbB.pairId && orbA.side !== orbB.side) {
      // MATCH — chime on snap, reveal sound comes later when fog burns
      aiSDK.playSfx("success");
      matchedCount++;

      var revealPos = revealPositions[orbA.pairId] || { x: cx, y: cy };

      orbA.state = "fusing";
      orbA.targetX = revealPos.x;
      orbA.targetY = revealPos.y;
      orbB.state = "fusing";
      orbB.targetX = revealPos.x;
      orbB.targetY = revealPos.y;

      spawnParticles(cx, cy, 0x00ffcc, 15);

    } else {
      // NO MATCH — repel
      aiSDK.playSfx("error");
      wrongAttempts++;

      var angleA = Math.atan2(orbA.y - cy, orbA.x - cx) || Math.random() * Math.PI * 2;
      var angleB = Math.atan2(orbB.y - cy, orbB.x - cx) || (angleA + Math.PI);

      orbA.state = "repelling";
      orbA.vx = Math.cos(angleA) * 6;
      orbA.vy = Math.sin(angleA) * 6;
      orbA.flyTimer = 800;

      orbB.state = "repelling";
      orbB.vx = Math.cos(angleB) * 6;
      orbB.vy = Math.sin(angleB) * 6;
      orbB.flyTimer = 800;

      spawnParticles(cx, cy, 0xff4444, 8);
    }
  }

  function checkFuseReveal(pairId) {
    var bothArrived = true;
    for (var k = 0; k < orbs.length; k++) {
      if (orbs[k].pairId === pairId && !orbs[k].matched && orbs[k].state !== "fuse-arrived") {
        bothArrived = false;
        break;
      }
    }
    if (!bothArrived) return;
    var revealPos = revealPositions[pairId] || { x: cx, y: cy };
    burnFog(revealPos.x, revealPos.y);
    spawnParticles(revealPos.x, revealPos.y, 0xffaa44, 20);
    aiSDK.playSfx("complete");
  }

  function burnFog(fx, fy) {
    if (!fogRT) return;
    var eraser = new PIXI.Graphics();
    eraser.blendMode = PIXI.BLEND_MODES.ERASE;

    var radius = Math.min(W, H) / (Math.sqrt(totalPairs) * 1.4);
    var steps = 8;
    for (var s = 0; s < steps; s++) {
      var r = radius * (1 - s / steps);
      var alpha = 0.3 + (s / steps) * 0.7;
      eraser.beginFill(0xffffff, alpha);
      eraser.drawCircle(fx, fy, r);
      eraser.endFill();
    }

    app.renderer.render(eraser, { renderTexture: fogRT, clear: false });
    eraser.destroy();
  }

  function spawnParticles(px, py, color, count) {
    for (var i = 0; i < count; i++) {
      var pg = new PIXI.Graphics();
      pg.beginFill(color); pg.drawCircle(0, 0, 1); pg.endFill();
      pg.x = px; pg.y = py;
      gameLayer.addChild(pg);
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 4;
      particles.push({
        gfx: pg, x: px, y: py,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 500, maxLife: 1000, size: 0.5 + Math.random() * 1.5,
      });
    }
  }

  // --- Constellation + Core ---
  function showConstellationAndCore() {
    // Draw lines between reveal positions
    constellationLines = new PIXI.Graphics();
    constellationLines.lineStyle(1.5, 0x00d4ff, 0.4);
    if (revealPositions.length > 1) {
      constellationLines.moveTo(revealPositions[0].x, revealPositions[0].y);
      for (var i = 1; i < revealPositions.length; i++) {
        constellationLines.lineTo(revealPositions[i].x, revealPositions[i].y);
      }
      constellationLines.lineTo(revealPositions[0].x, revealPositions[0].y);
    }

    // Small dots at each node
    for (var d = 0; d < revealPositions.length; d++) {
      constellationLines.beginFill(0x00d4ff, 0.7);
      constellationLines.drawCircle(revealPositions[d].x, revealPositions[d].y, 4);
      constellationLines.endFill();
    }
    gameLayer.addChild(constellationLines);

    // Core orb at center
    coreOrb = new PIXI.Graphics();
    coreOrb.beginFill(0x00ffcc, 0.8);
    coreOrb.drawCircle(0, 0, WELL_RADIUS * 0.8);
    coreOrb.endFill();
    coreOrb.lineStyle(2, 0xffffff, 0.6);
    coreOrb.drawCircle(0, 0, WELL_RADIUS * 0.8);
    coreOrb.x = cx; coreOrb.y = cy;
    gameLayer.addChild(coreOrb);

    // Pulsing label
    var coreLabel = new PIXI.Text("ABSORB", {
      fontSize: 12, fill: 0xffffff, fontFamily: "Segoe UI, system-ui, sans-serif", fontWeight: "700",
    });
    coreLabel.anchor.set(0.5);
    coreLabel.x = cx; coreLabel.y = cy;
    gameLayer.addChild(coreLabel);

    spawnParticles(cx, cy, 0x00ffcc, 25);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 11: COMPLETION & RESULTS
  // ═══════════════════════════════════════════════════════════════════════
  function completeInteraction() {
    if (gameOver) return;
    gameOver = true;
    gamePaused = true;
    var finalTime = elapsedSeconds;
    aiSDK.playSfx("complete");
    aiSDK.stopBgMusic();
    showResults(finalTime);
  }

  function showResults(finalTime) {
    var heading = "Image Revealed!";
    var headColor = "#44ff44";

    var overlay = document.createElement("div");
    overlay.id = "result-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;";

    var card = document.createElement("div");
    card.style.cssText = "background:rgba(10,15,40,0.95);border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:24px 28px;max-width:340px;width:90%;text-align:center;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";

    var h = '<h2 style="color:' + headColor + ';margin:0 0 14px;font-size:22px;">' + heading + '</h2>';
    h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Time: ' + finalTime.toFixed(1) + 's</p>';
    h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Pairs: ' + totalPairs + '  |  Wrong attempts: ' + wrongAttempts + '</p>';
    card.innerHTML = h;

    var benchDiv = document.createElement("div");
    benchDiv.style.cssText = "margin:12px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.1);";
    benchDiv.innerHTML = '<p style="color:#666;font-size:12px;margin:0;">Loading scores\u2026</p>';
    card.appendChild(benchDiv);

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:18px;";

    var retryBtn = document.createElement("button");
    retryBtn.textContent = "Retry";
    retryBtn.style.cssText = "padding:10px 28px;border-radius:8px;border:1px solid #00d4ff;background:transparent;color:#00d4ff;font-size:15px;font-weight:600;cursor:pointer;";
    retryBtn.addEventListener("click", function () { location.reload(); });
    btnRow.appendChild(retryBtn);

    var nextBtn = document.createElement("button");
    nextBtn.textContent = "Next \u2192";
    nextBtn.style.cssText = "padding:10px 28px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:15px;font-weight:600;cursor:pointer;";
    nextBtn.addEventListener("click", function () {
      window.parent.postMessage({ type: "ai-sdk-complete-interaction" }, "*");
    });
    btnRow.appendChild(nextBtn);
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var resultData = { time: finalTime, pairs: totalPairs, wrongAttempts: wrongAttempts };
    aiSDK.saveInstanceData(resultData);
    aiSDK.saveUserProgress({
      score: Math.max(0, Math.round(100 - finalTime * 1.5 - wrongAttempts * 5)),
      completed: true,
      customData: resultData,
    });
    aiSDK.markCompleted();
    aiSDK.emitEvent({ type: "INTERACTION_COMPLETED", data: resultData, requiresLLMResponse: true });

    aiSDK.getInstanceDataHistory({ limit: 100 }, function (history) {
      if (!history || history.length < 2) {
        benchDiv.innerHTML = '<p style="color:#888;font-size:12px;margin:0;">Be the first to set a benchmark!</p>';
        return;
      }
      var times = history.map(function (r) { return r.instance_data && r.instance_data.time; }).filter(function (t) { return t > 0; });
      if (times.length < 2) { benchDiv.innerHTML = '<p style="color:#888;font-size:12px;margin:0;">Not enough data yet.</p>'; return; }
      var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length;
      var fasterCount = times.filter(function (t) { return finalTime < t; }).length;
      var pct = Math.round((fasterCount / times.length) * 100);
      benchDiv.innerHTML =
        '<p style="color:#00d4ff;font-size:13px;margin:0 0 4px;">Average: ' + avg.toFixed(1) + 's</p>' +
        '<p style="color:#aaa;font-size:12px;margin:0;">Faster than ' + pct + '% of learners</p>';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 12: INTRO MODAL
  // ═══════════════════════════════════════════════════════════════════════
  function showIntroModal() {
    introShowing = true;
    window.parent.postMessage({ type: "ai-sdk-block-controls", blocked: true }, "*");

    var overlay = document.createElement("div");
    overlay.id = "intro-modal-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,5,20,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'Segoe UI',system-ui,sans-serif;overflow-y:auto;padding:12px;";

    var card = document.createElement("div");
    card.style.cssText = "background:linear-gradient(145deg,#0d1b3e,#162350);border:1px solid rgba(0,180,255,0.3);border-radius:16px;padding:24px 20px;max-width:420px;width:100%;text-align:center;box-shadow:0 0 40px rgba(0,120,255,0.15);margin:auto;";

    var titleEl = document.createElement("div");
    titleEl.textContent = "Gravity Well";
    titleEl.style.cssText = "font-size:26px;font-weight:700;color:#00d4ff;margin-bottom:18px;letter-spacing:0.5px;text-shadow:0 0 12px rgba(0,180,255,0.4);";
    card.appendChild(titleEl);

    var steps = [
      { icon: "\uD83D\uDD2E", text: "Concept orbs float in space above a hidden image." },
      { icon: "\uD83D\uDC49", text: "Click an orb to pull it into the gravity well at the centre." },
      { icon: "\u2728", text: "Click a second orb \u2014 if they match, they fuse and reveal part of the image!" },
      { icon: "\uD83D\uDCA5", text: "Wrong match? Both orbs bounce back out." },
      { icon: "\uD83C\uDF1F", text: "Match all " + totalPairs + " pairs to fully reveal the image and complete the interaction." },
    ];
    for (var i = 0; i < steps.length; i++) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;text-align:left;";
      var ico = document.createElement("span");
      ico.textContent = steps[i].icon;
      ico.style.cssText = "font-size:20px;flex-shrink:0;margin-top:1px;";
      var txt = document.createElement("span");
      txt.textContent = steps[i].text;
      txt.style.cssText = "color:#c0d8f0;font-size:14px;line-height:1.45;";
      row.appendChild(ico); row.appendChild(txt);
      card.appendChild(row);
    }

    var playBtn = document.createElement("button");
    playBtn.textContent = "\u25B6  Play";
    playBtn.style.cssText = "margin-top:20px;padding:14px 48px;border:none;border-radius:10px;background:linear-gradient(135deg,#00b4ff,#0066cc);color:#fff;font-size:18px;font-weight:700;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 20px rgba(0,120,255,0.35);transition:transform 0.15s,box-shadow 0.15s;";
    playBtn.onmouseenter = function () { playBtn.style.transform = "scale(1.05)"; };
    playBtn.onmouseleave = function () { playBtn.style.transform = "scale(1)"; };
    playBtn.onclick = function () {
      introShowing = false;
      overlay.remove();
      gamePaused = false;
      startTime = Date.now();
      app.ticker.start();
      window.parent.postMessage({ type: "ai-sdk-block-controls", blocked: false }, "*");
      if (bgMusicStyle && bgMusicStyle !== "none") { aiSDK.startBgMusic(bgMusicStyle); aiSDK.setAudioVolume("bg", bgMusicVolume); }
    };
    card.appendChild(playBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 13: PAUSE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  var pauseOverlay = null;
  var unpauseModal = null;

  function showPauseOverlay() {
    if (pauseOverlay) return;
    pauseOverlay = document.createElement("div");
    pauseOverlay.id = "pause-overlay";
    pauseOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:90;pointer-events:none;";
    var label = document.createElement("div");
    label.style.cssText = "color:rgba(255,255,255,0.7);font-size:28px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 0 20px rgba(0,212,255,0.4);";
    label.textContent = "PAUSED";
    pauseOverlay.appendChild(label);
    document.body.appendChild(pauseOverlay);
  }
  function hidePauseOverlay() { if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; } hideUnpauseModal(); }

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
    msg.textContent = "Do you want to unpause?";
    card.appendChild(msg);
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";
    var noBtn = document.createElement("button");
    noBtn.textContent = "Stay Paused";
    noBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:1px solid #555;background:transparent;color:#aaa;font-size:14px;font-weight:600;cursor:pointer;";
    noBtn.addEventListener("click", function (e) { e.stopPropagation(); hideUnpauseModal(); });
    btnRow.appendChild(noBtn);
    var yesBtn = document.createElement("button");
    yesBtn.textContent = "Resume";
    yesBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:14px;font-weight:600;cursor:pointer;";
    yesBtn.addEventListener("click", function (e) { e.stopPropagation(); resumeGame(); });
    btnRow.appendChild(yesBtn);
    card.appendChild(btnRow);
    unpauseModal.appendChild(card);
    unpauseModal.addEventListener("click", function (e) { if (e.target === unpauseModal) hideUnpauseModal(); });
    document.body.appendChild(unpauseModal);
  }
  function hideUnpauseModal() { if (unpauseModal) { unpauseModal.remove(); unpauseModal = null; } }

  function pauseGame() {
    if (gamePaused || gameOver || !gameStarted) return;
    gamePaused = true;
    pauseStartTime = Date.now();
    if (app) app.ticker.stop();
    aiSDK.stopBgMusic();
    showPauseOverlay();
  }
  function resumeGame() {
    if (!gamePaused || gameOver || introShowing) return;
    gamePaused = false;
    pausedByParent = false;
    startTime += (Date.now() - pauseStartTime);
    hidePauseOverlay();
    if (app) app.ticker.start();
    if (bgMusicStyle && bgMusicStyle !== "none") { aiSDK.startBgMusic(bgMusicStyle); aiSDK.setAudioVolume("bg", bgMusicVolume); }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 14: INPUT HANDLING
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

  function onPointerMove(gx, gy) {
    pointerX = gx;
    pointerY = gy;
  }

  function onPointerDown(gx, gy) {
    if (gameOver || gamePaused) return;

    // Check if clicking the core orb (all matched)
    if (coreOrb && matchedCount >= totalPairs) {
      var coreDist = Math.hypot(gx - cx, gy - cy);
      if (coreDist < WELL_RADIUS * 1.5) {
        completeInteraction();
        return;
      }
    }

    // Check if clicking the orb already in the well (to eject)
    if (wellOrb && wellOrb.state === "in-well") {
      var wellDist = Math.hypot(gx - wellOrb.x, gy - wellOrb.y);
      if (wellDist < wellOrb.halfW * 2) {
        ejectWellOrb();
        return;
      }
    }

    // Find nearest floating orb to click
    var bestOrb = null;
    var bestDist = Infinity;
    for (var i = 0; i < orbs.length; i++) {
      var orb = orbs[i];
      if (orb.matched || orb.state === "fusing") continue;
      if (orb.state !== "floating") continue;
      var dx = gx - orb.x;
      var dy = gy - orb.y;
      if (Math.abs(dx) < orb.halfW + 15 && Math.abs(dy) < orb.halfH + 15) {
        var d = Math.hypot(dx, dy);
        if (d < bestDist) { bestDist = d; bestOrb = orb; }
      }
    }

    if (bestOrb) {
      sendOrbToWell(bestOrb);
    }
  }

  function onPointerUp(gx, gy) {
    // No action needed on pointer up for this interaction
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 15: RESPONSIVE VIEW
  // ═══════════════════════════════════════════════════════════════════════
  function rescaleCanvas() {
    if (!app) return;
    lockViewport();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    gameScale = Math.min(vw / W, vh / H);
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
        location.reload();
      }
    }, 500);
  }
  window.addEventListener("resize", scheduleViewReload);

  window.addEventListener("message", function (ev) {
    if (ev.data && ev.data.type === "container-dimensions") scheduleViewReload();
    if (ev.data && ev.data.type === "interaction-action") {
      if (ev.data.action === "pause") { pausedByParent = true; pauseGame(); }
      else if (ev.data.action === "resume") { resumeGame(); }
    }
  });
})();
