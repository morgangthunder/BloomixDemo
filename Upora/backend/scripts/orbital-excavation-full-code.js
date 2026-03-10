// Orbital Excavation – Explore Stage PixiJS Interaction
// Uncover a hidden Target Image beneath a procedural asteroid by orbiting and firing.
// Choose the correct thematic portal to complete the stage.
// Uses the same image-generation personalisation pipeline as process-explorer / image-with-questions.

(function () {
  "use strict";

  // ── PixiJS CDN loader ───────────────────────────────────────────────
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

  // ── SDK bootstrap (shared with other interactions) ──────────────────
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
      startBgMusic: function (st) { sendMessage("ai-sdk-start-bg-music", { style: st || "retro" }); },
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

  // ── State & config ──────────────────────────────────────────────────
  var aiSDK = null;
  var config = {};
  var title = "Orbital Excavation";
  var imageDescription = "";
  var portals = [];
  var triggerHint = "";
  var isTestMode = true;
  var bgMusicStyle = "retro";

  var isPreview = false;
  var personalisation = true;
  var desktopImageUrl = null;
  var mobileImageUrl = null;
  var parentIsMobile = window.innerWidth < 768;

  // PixiJS references
  var app = null;
  var gameStarted = false;
  var gamePaused = false;
  var gameOver = false;

  // Game timer
  var startTime = 0;
  var elapsedSeconds = 0;
  var penaltySeconds = 0;
  var wrongAttempts = 0;
  var shieldHP = 3;

  // Erosion tracking
  var totalAsteroidArea = 0;
  var erasedArea = 0;
  var revealPercent = 0;
  var hintShown = false;

  // Ship state — start at NE diagonal (between North and East portals)
  var shipAngle = -Math.PI / 4;
  var shipTargetAngle = -Math.PI / 4;
  var shipSpeed = 3.5;
  var shipInSpin = false;
  var spinTimer = 0;
  var spinDuration = 2500;
  var knockbackAngle = 0;
  var knockbackForce = 0;
  var shipFaceAngle = 0;

  // Fire state
  var pointerDown = false;
  var pointerDownTime = 0;
  var chargeThreshold = 600;
  var fireCooldown = 0;
  var fireCooldownMax = 250;
  var drillCooldown = 0;
  var drillCooldownMax = 1200;

  // Collections
  var missiles = [];
  var drillShots = [];
  var enemies = [];
  var particles = [];

  // Spawn timers
  var enemySpawnTimer = 0;
  var enemySpawnInterval = 8000;

  // Grace period — portals are inactive until player has had time to orient
  var portalGraceTimer = 3000;

  // Fly-to-portal animation
  var flyingToPortal = false;
  var flyingBack = false;
  var flyTarget = null;
  var flyStartX = 0, flyStartY = 0;
  var flyEndX = 0, flyEndY = 0;
  var flyProgress = 0;
  var flyDuration = 600;
  var flyBackDuration = 400;
  var portalSize = 0;
  var portalHitRadius = 0;
  var lastPointerX = 0, lastPointerY = 0;
  var instructionPanel = null;
  var instructionTimer = 10000;
  var gameScale = 1;
  var pausedByParent = false;
  var pauseStartTime = 0;

  // Power-ups
  var powerUpLevel = 0;
  var maxPowerUpLevel = 3;
  var baseImpactRadius = 0;
  var enemyKillBoost = 0;
  var powerUps = [];
  var powerUpSpawnTimer = 5000;
  var powerUpSpawnInterval = 10000;
  var powerUpText = null;

  // Game dimensions
  var W = 0, H = 0;
  var cx = 0, cy = 0;
  var orbitRadius = 0;
  var asteroidRadius = 0;

  // PixiJS objects
  var shipGfx = null;
  var asteroidRT = null;
  var asteroidSprite = null;
  var targetImageSprite = null;
  var portalObjects = [];
  var timerText = null;
  var shieldText = null;
  var chargeBar = null;
  var hintText = null;
  var gameLayer = null;
  var uiLayer = null;
  var resultOverlay = null;

  // DOM helpers
  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ── Overflow: report false and enforce no-scroll ───────────────────
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

  // ── Init ────────────────────────────────────────────────────────────
  function initGame() {
    console.log("[OrbExcav] initGame");
    lockViewport();
    aiSDK = createIframeAISDK();
    config = window.interactionConfig || {};
    var data = window.interactionData || {};

    title = config.title || data.subject || "Orbital Excavation";
    imageDescription = config.imageDescription || data.imageDescription || data.image_description || "";
    triggerHint = data.triggerHint || data.trigger_hint || config.triggerHint || "";
    isTestMode = config.testMode !== false;
    bgMusicStyle = config.bgMusicStyle || "retro";

    // Parse portals from data or config
    if (Array.isArray(data.portals) && data.portals.length > 0) {
      portals = data.portals;
    } else if (config.portals) {
      try { portals = typeof config.portals === "string" ? JSON.parse(config.portals) : config.portals; } catch (e) { portals = []; }
    }
    if (!portals.length) {
      portals = [
        { label: "A Red Dragon", correct: false },
        { label: "A Volcanic Crater", correct: false },
        { label: "A Strawberry", correct: true },
        { label: "A Microscopic Virus", correct: false },
      ];
      if (!imageDescription) imageDescription = "A large, ripe strawberry with vivid red skin, tiny yellow seeds, and a green leafy stem. Close-up, richly detailed, with water droplets on the surface.";
      if (!triggerHint) triggerHint = "Look at the colour and the tiny dots on the surface...";
    }

    console.log("[OrbExcav] Config:", { title: title, testMode: isTestMode, portals: portals.length });

    isPreview = config.isPreview === true;
    personalisation = config.personalisation !== false;

    // Set interaction info for AI context
    aiSDK.setInteractionInfo("Orbital Excavation: uncover a hidden image by shooting at a space asteroid, then choose the correct portal.");

    if (isPreview) {
      show($("loading-section"));
      hide($("input-section"));
      $("loading-text").textContent = "Loading preview...";
      startPixiGame(generatePreviewPlaceholder());
      reportNoOverflow();
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
      $("loading-text").textContent = "Preparing mission...";
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

  // ── Prefetch result ─────────────────────────────────────────────────
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

  // ── Content fingerprint (ensures cache invalidation when config changes) ──
  function contentFingerprint() {
    var str = (imageDescription || "") + "|" + portals.map(function (p) { return p.label; }).join(",");
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getCacheLabel() {
    return title.toLowerCase().replace(/\s+/g, "-") + "-" + contentFingerprint();
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

  // ── Personalisation pipeline ────────────────────────────────────────
  function runPersonalisationPipeline() {
    var label = getCacheLabel();
    aiSDK.findImagePair({ dictionaryLabel: label, interests: [] }, function (r) {
      if (r && r.found && r.pair) { useCachedImagePair(r.pair); return; }
      aiSDK.getLessonImages(function (images) {
        var match = (images || []).filter(function (img) { return img.dictionaryLabels && img.dictionaryLabels.indexOf(label) !== -1; });
        if (match.length > 0) { useCachedImage(match[0]); return; }
        $("loading-text").textContent = "Choosing art style...";
        var portalLabels = portals.map(function (p) { return p.label; });
        aiSDK.selectBestTheme({ contentItems: portalLabels, contentTitle: title }, function (tr) {
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

  // ── Image request builder ───────────────────────────────────────────
  function buildImageRequest(styleName) {
    var desc = imageDescription
      ? "The painting depicts: " + imageDescription + ". "
      : "An atmospheric, educational scene that visually represents the concept of '" + title + "'. ";

    var prompt =
      "IMPORTANT: NO text, labels, captions or numbers. " +
      "Create a single detailed illustration in the visual style and aesthetic of '" + styleName + "'. " +
      desc +
      "This image will be hidden beneath a space rock — it must be a clear, identifiable visual that represents a key concept. " +
      "Use rich colours and strong visual elements so the concept is recognisable even when partially obscured. " +
      "Dark backgrounds (#0f0f23 or near-black) blend with the game UI. " +
      "FRAMING: Full-bleed artwork touching all four edges. 4:3 aspect ratio.";

    return {
      prompt: prompt,
      userInput: styleName,
      customInstructions: "Single cohesive scene. 4:3 aspect ratio. Full-bleed, zero margins. Zero text. " +
        "The image must be clearly identifiable even when only partially visible.",
      dictionaryLabels: [getCacheLabel()],
      width: 1024,
      height: 768,
      dualViewport: true,
      mobileWidth: 768,
      mobileHeight: 1024,
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

  // ══════════════════════════════════════════════════════════════════════
  //  PIXI GAME
  // ══════════════════════════════════════════════════════════════════════

  function startPixiGame(imageUrl) {
    console.log("[OrbExcav] Starting PixiJS game");
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
    var minDim = Math.min(W, H);
    asteroidRadius = minDim * 0.28;
    orbitRadius = minDim * 0.42;
    portalSize = minDim * 0.03;
    portalHitRadius = Math.max(28, portalSize * 2.5);
    baseImpactRadius = asteroidRadius * 0.055;
    totalAsteroidArea = Math.PI * asteroidRadius * asteroidRadius;

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
    console.log("[OrbExcav] Loading image:", imageUrl ? (imageUrl.substring(0, 100) + "...") : "null");
    if (!imageUrl) { buildGame(null); return; }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      console.log("[OrbExcav] Image loaded:", img.width, "x", img.height);
      var baseTex = new PIXI.BaseTexture(img);
      var tex = new PIXI.Texture(baseTex);
      buildGame(tex);
    };
    img.onerror = function () {
      console.warn("[OrbExcav] crossOrigin load failed, retrying without...");
      var img2 = new Image();
      img2.onload = function () {
        console.log("[OrbExcav] Image loaded (retry):", img2.width, "x", img2.height);
        var baseTex = new PIXI.BaseTexture(img2);
        var tex = new PIXI.Texture(baseTex);
        buildGame(tex);
      };
      img2.onerror = function () {
        console.warn("[OrbExcav] Image load completely failed, using fallback");
        buildGame(null);
      };
      img2.src = imageUrl;
    };
    img.src = imageUrl;
  }

  function buildGame(targetTexture) {
    if (gameStarted) return;
    gameStarted = true;

    // Background starfield — dense for immersive space feel
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

    // Target image — circular crop with soft gradient edge
    if (targetTexture) {
      targetImageSprite = new PIXI.Sprite(targetTexture);
      var imgDiameter = asteroidRadius * 1.7;
      var scale = Math.max(imgDiameter / targetTexture.width, imgDiameter / targetTexture.height);
      targetImageSprite.scale.set(scale);
      targetImageSprite.anchor.set(0.5);
      targetImageSprite.x = cx;
      targetImageSprite.y = cy;
      app.stage.addChild(targetImageSprite);

      var imgClip = new PIXI.Graphics();
      imgClip.beginFill(0xffffff);
      imgClip.drawCircle(cx, cy, asteroidRadius * 0.82);
      imgClip.endFill();
      app.stage.addChild(imgClip);
      targetImageSprite.mask = imgClip;

      var vignette = new PIXI.Graphics();
      var vigSteps = 20;
      var vigInner = asteroidRadius * 0.5;
      var vigOuter = asteroidRadius * 0.85;
      for (var vi = 0; vi < vigSteps; vi++) {
        var vt = vi / vigSteps;
        var vr = vigInner + (vigOuter - vigInner) * vt;
        vignette.lineStyle((vigOuter - vigInner) / vigSteps + 1, 0x0a0a1a, vt * vt * 0.85);
        vignette.drawCircle(cx, cy, vr);
      }
      app.stage.addChild(vignette);
    } else {
      var fb = new PIXI.Graphics();
      fb.beginFill(0x2244aa);
      fb.drawCircle(cx, cy, asteroidRadius * 0.8);
      fb.endFill();
      app.stage.addChild(fb);
    }

    // Build asteroid RenderTexture
    buildAsteroid();

    // Game layer (ship, missiles, enemies, portals)
    gameLayer = new PIXI.Container();
    app.stage.addChild(gameLayer);

    // Portals
    createPortals();

    // Ship
    shipGfx = createShipGraphic();
    gameLayer.addChild(shipGfx);

    // UI layer
    uiLayer = new PIXI.Container();
    app.stage.addChild(uiLayer);

    timerText = new PIXI.Text("0.0s", { fontSize: 18, fill: 0x00d4ff, fontFamily: "monospace" });
    timerText.anchor.set(1, 0);
    timerText.x = W - 12;
    timerText.y = 12;
    uiLayer.addChild(timerText);

    shieldText = new PIXI.Text("Shields: " + shieldHP, { fontSize: 14, fill: 0x44ff44, fontFamily: "monospace" });
    shieldText.anchor.set(0, 0);
    shieldText.x = 12;
    shieldText.y = 12;
    uiLayer.addChild(shieldText);

    var revealText = new PIXI.Text("Revealed: 0%", { fontSize: 14, fill: 0xaaaaaa, fontFamily: "monospace" });
    revealText.anchor.set(0, 0);
    revealText.x = 12;
    revealText.y = 32;
    uiLayer.addChild(revealText);
    uiLayer._revealText = revealText;

    powerUpText = new PIXI.Text("", { fontSize: 13, fill: 0x44ff44, fontFamily: "monospace" });
    powerUpText.anchor.set(0, 0);
    powerUpText.x = 12;
    powerUpText.y = 52;
    uiLayer.addChild(powerUpText);
    updatePowerUpUI();

    // Charge bar (hidden by default)
    chargeBar = new PIXI.Graphics();
    chargeBar.visible = false;
    uiLayer.addChild(chargeBar);

    // Instruction panel
    instructionPanel = new PIXI.Container();
    var panelBg = new PIXI.Graphics();
    panelBg.beginFill(0x000000, 0.55);
    panelBg.drawRoundedRect(-W * 0.44, -22, W * 0.88, 44, 10);
    panelBg.endFill();
    instructionPanel.addChild(panelBg);
    var instrBorder = new PIXI.Graphics();
    instrBorder.lineStyle(1, 0x334466, 0.4);
    instrBorder.drawRoundedRect(-W * 0.44, -22, W * 0.88, 44, 10);
    instructionPanel.addChild(instrBorder);
    var instrText = new PIXI.Text(
      parentIsMobile
        ? "Tap to fire  \u2022  Hold longer to shoot deeper  \u2022  Tap a portal to answer what the image is"
        : "Click to fire  \u2022  Hold longer to shoot deeper  \u2022  Click a portal to answer what the image is",
      { fontSize: 15, fill: 0x99bbdd, align: "center", fontFamily: "Segoe UI, system-ui, sans-serif" }
    );
    instrText.anchor.set(0.5);
    instructionPanel.addChild(instrText);
    instructionPanel.x = cx;
    instructionPanel.y = H - 32;
    uiLayer.addChild(instructionPanel);

    // Result overlay container (hidden)
    resultOverlay = new PIXI.Container();
    resultOverlay.visible = false;
    app.stage.addChild(resultOverlay);

    // Input
    setupInput();

    // Game ticker (add but don't start playing yet)
    app.ticker.add(gameLoop);
    gamePaused = true;
    app.ticker.stop();

    reportNoOverflow();

    // Show intro modal (unless preview mode)
    if (isPreview) {
      gamePaused = false;
      startTime = Date.now();
      app.ticker.start();
      if (bgMusicStyle && bgMusicStyle !== "none") { aiSDK.startBgMusic(bgMusicStyle); aiSDK.setAudioVolume("bg", 0.025); }
    } else {
      showIntroModal();
    }
  }

  function showIntroModal() {
    window.parent.postMessage({ type: "ai-sdk-block-controls", blocked: true }, "*");
    var overlay = document.createElement("div");
    overlay.id = "intro-modal-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,5,20,0.85);display:flex;align-items:center;justify-content:center;z-index:100;font-family:'Segoe UI',system-ui,sans-serif;";

    var card = document.createElement("div");
    card.style.cssText = "background:linear-gradient(145deg,#0d1b3e,#162350);border:1px solid rgba(0,180,255,0.3);border-radius:16px;padding:32px 36px;max-width:420px;width:90%;text-align:center;box-shadow:0 0 40px rgba(0,120,255,0.15);";

    var titleEl = document.createElement("div");
    titleEl.textContent = "Orbital Excavation";
    titleEl.style.cssText = "font-size:26px;font-weight:700;color:#00d4ff;margin-bottom:18px;letter-spacing:0.5px;text-shadow:0 0 12px rgba(0,180,255,0.4);";
    card.appendChild(titleEl);

    var steps = [
      { icon: "\uD83D\uDE80", text: "Your ship orbits the asteroid automatically." },
      { icon: "\uD83D\uDD2B", text: "Tap or click to fire at the asteroid and reveal the hidden image beneath." },
      { icon: "\u23F3", text: "Hold longer to charge a deeper shot that reaches the centre." },
      { icon: "\uD83D\uDEAA", text: "When you think you know what the image is, fly into one of the 4 portals to answer." },
      { icon: "\u26A0\uFE0F", text: "Watch out for enemy ships \u2014 collect power-ups to boost your impact!" },
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
      row.appendChild(ico);
      row.appendChild(txt);
      card.appendChild(row);
    }

    var playBtn = document.createElement("button");
    playBtn.textContent = "\u25B6  Play";
    playBtn.style.cssText = "margin-top:20px;padding:14px 48px;border:none;border-radius:10px;background:linear-gradient(135deg,#00b4ff,#0066cc);color:#fff;font-size:18px;font-weight:700;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 20px rgba(0,120,255,0.35);transition:transform 0.15s,box-shadow 0.15s;";
    playBtn.onmouseenter = function () { playBtn.style.transform = "scale(1.05)"; playBtn.style.boxShadow = "0 6px 28px rgba(0,150,255,0.5)"; };
    playBtn.onmouseleave = function () { playBtn.style.transform = "scale(1)"; playBtn.style.boxShadow = "0 4px 20px rgba(0,120,255,0.35)"; };
    playBtn.onclick = function () {
      overlay.remove();
      gamePaused = false;
      startTime = Date.now();
      app.ticker.start();
      window.parent.postMessage({ type: "ai-sdk-block-controls", blocked: false }, "*");
      console.log("[OrbExcav] Starting bg music, style:", bgMusicStyle);
      if (bgMusicStyle && bgMusicStyle !== "none") { aiSDK.startBgMusic(bgMusicStyle); aiSDK.setAudioVolume("bg", 0.025); }
    };
    card.appendChild(playBtn);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ── Asteroid generation ─────────────────────────────────────────────
  function buildAsteroid() {
    asteroidRT = PIXI.RenderTexture.create({ width: W, height: H });

    var rock = new PIXI.Graphics();
    var numVerts = 28;
    var radii = [];
    for (var i = 0; i < numVerts; i++) {
      radii.push(asteroidRadius * (0.95 + Math.random() * 0.2));
    }
    // Smooth pass
    for (var i = 0; i < numVerts; i++) {
      var prev = radii[(i - 1 + numVerts) % numVerts];
      var next = radii[(i + 1) % numVerts];
      radii[i] = radii[i] * 0.5 + (prev + next) * 0.25;
    }

    // Solid core circle — guarantees no gaps over the image
    rock.beginFill(0x665544);
    rock.drawCircle(cx, cy, asteroidRadius * 0.88);
    rock.endFill();

    // Irregular outer edge
    rock.beginFill(0x665544);
    var pts = [];
    for (var i = 0; i < numVerts; i++) {
      var a = (i / numVerts) * Math.PI * 2;
      pts.push(cx + Math.cos(a) * radii[i], cy + Math.sin(a) * radii[i]);
    }
    rock.drawPolygon(pts);
    rock.endFill();

    // Surface shading layers
    rock.beginFill(0x554433, 0.6);
    var pts2 = [];
    for (var i = 0; i < numVerts; i++) {
      var a = (i / numVerts) * Math.PI * 2;
      pts2.push(cx + Math.cos(a) * radii[i] * 0.85, cy + Math.sin(a) * radii[i] * 0.9);
    }
    rock.drawPolygon(pts2);
    rock.endFill();

    // Craters
    for (var i = 0; i < 12; i++) {
      var ca = Math.random() * Math.PI * 2;
      var cd = Math.random() * asteroidRadius * 0.7;
      var cr = asteroidRadius * (0.04 + Math.random() * 0.08);
      rock.beginFill(0x443322, 0.7);
      rock.drawCircle(cx + Math.cos(ca) * cd, cy + Math.sin(ca) * cd, cr);
      rock.endFill();
    }

    // Highlight spots
    for (var i = 0; i < 6; i++) {
      var ha = Math.random() * Math.PI * 2;
      var hd = Math.random() * asteroidRadius * 0.6;
      var hr = asteroidRadius * (0.02 + Math.random() * 0.04);
      rock.beginFill(0x887766, 0.4);
      rock.drawCircle(cx + Math.cos(ha) * hd, cy + Math.sin(ha) * hd, hr);
      rock.endFill();
    }

    app.renderer.render(rock, { renderTexture: asteroidRT });
    rock.destroy();

    asteroidSprite = new PIXI.Sprite(asteroidRT);
    app.stage.addChild(asteroidSprite);
  }

  function eraseAt(x, y, radius) {
    var eraser = new PIXI.Graphics();
    eraser.blendMode = PIXI.BLEND_MODES.ERASE;
    eraser.beginFill(0xffffff);
    // Slightly irregular chunk
    var n = 7;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var r = radius * (0.75 + Math.random() * 0.5);
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    eraser.drawPolygon(pts);
    eraser.endFill();
    app.renderer.render(eraser, { renderTexture: asteroidRT, clear: false });
    eraser.destroy();

    erasedArea += Math.PI * radius * radius;
    revealPercent = Math.min(100, (erasedArea / totalAsteroidArea) * 100);

    if (revealPercent >= 30 && !hintShown && triggerHint) {
      hintShown = true;
      aiSDK.showSnack(triggerHint, 6000, false);
    }
  }

  // ── Ship ────────────────────────────────────────────────────────────
  function createShipGraphic() {
    var c = new PIXI.Container();
    var g = new PIXI.Graphics();
    g.beginFill(0x3399ff);
    g.moveTo(16, 0);
    g.lineTo(6, -4);
    g.lineTo(-6, -7);
    g.lineTo(-12, -13);
    g.lineTo(-9, -5);
    g.lineTo(-11, -2);
    g.lineTo(-11, 2);
    g.lineTo(-9, 5);
    g.lineTo(-12, 13);
    g.lineTo(-6, 7);
    g.lineTo(6, 4);
    g.closePath();
    g.endFill();
    g.beginFill(0x66ccff, 0.8);
    g.moveTo(14, 0);
    g.lineTo(6, -2.5);
    g.lineTo(6, 2.5);
    g.closePath();
    g.endFill();
    g.beginFill(0xff6600, 0.9);
    g.drawEllipse(-12, 0, 3, 4);
    g.endFill();
    g.beginFill(0xffaa00, 0.35);
    g.drawEllipse(-15, 0, 4, 3);
    g.endFill();
    c.addChild(g);
    return c;
  }

  function updateShip(dt) {
    if (flyingToPortal || flyingBack) return;
    if (shipInSpin) {
      spinTimer -= dt;
      shipAngle += 12 * dt / 1000;
      if (spinTimer <= 0) {
        shipInSpin = false;
        spinTimer = 0;
      }
    } else {
      // Smooth toward target
      var diff = shipTargetAngle - shipAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      shipAngle += diff * Math.min(1, shipSpeed * dt / 1000);
    }

    // Knockback decay
    if (knockbackForce > 0) {
      shipAngle += knockbackAngle * knockbackForce * dt / 1000;
      knockbackForce *= 0.92;
      if (knockbackForce < 0.01) knockbackForce = 0;
    }

    var effectiveRadius = orbitRadius;
    for (var pi = 0; pi < portalObjects.length; pi++) {
      var po = portalObjects[pi];
      var toPortalX = cx + Math.cos(shipAngle) * orbitRadius - po.x;
      var toPortalY = cy + Math.sin(shipAngle) * orbitRadius - po.y;
      var pDist = Math.sqrt(toPortalX * toPortalX + toPortalY * toPortalY);
      var safeZone = portalHitRadius + 20;
      if (pDist < safeZone) {
        var pushFactor = 1 - (safeZone - pDist) / safeZone;
        effectiveRadius = Math.min(effectiveRadius, orbitRadius * (0.65 + 0.35 * pushFactor));
      }
    }

    var sx = cx + Math.cos(shipAngle) * effectiveRadius;
    var sy = cy + Math.sin(shipAngle) * effectiveRadius;
    shipGfx.x = sx;
    shipGfx.y = sy;

    var faceAngle = shipAngle + Math.PI;
    var nearestEnemyDist = orbitRadius * 0.8;
    var nearestEnemyIdx = -1;
    for (var ei = 0; ei < enemies.length; ei++) {
      var edx = enemies[ei].x - sx;
      var edy = enemies[ei].y - sy;
      var ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < nearestEnemyDist) {
        nearestEnemyDist = ed;
        nearestEnemyIdx = ei;
        faceAngle = Math.atan2(edy, edx);
      }
    }
    shipFaceAngle = faceAngle;
    shipGfx.rotation = faceAngle;
  }

  // ── Portals (vortex visuals, click-to-fly-in) ──────────────────────
  function createPortals() {
    var pad = portalSize * 2 + 24;
    var layoutPositions = [
      { x: pad, y: H * 0.2 },
      { x: W - pad, y: H * 0.2 },
      { x: pad, y: H * 0.8 },
      { x: W - pad, y: H * 0.8 },
    ];

    portals.forEach(function (p, idx) {
      var pos = layoutPositions[idx % layoutPositions.length];
      var container = new PIXI.Container();
      container.x = pos.x;
      container.y = pos.y;

      var outerAura = new PIXI.Graphics();
      outerAura.beginFill(0x6633ff, 0.08);
      outerAura.drawCircle(0, 0, portalSize * 1.8);
      outerAura.endFill();
      container.addChild(outerAura);

      var ring1 = new PIXI.Graphics();
      ring1.lineStyle(2.5, 0x8855ff, 0.65);
      ring1.drawEllipse(0, 0, portalSize, portalSize * 0.7);
      container.addChild(ring1);

      var ring2 = new PIXI.Graphics();
      ring2.lineStyle(2, 0x44aaff, 0.5);
      ring2.drawEllipse(0, 0, portalSize * 0.72, portalSize * 0.55);
      ring2.rotation = 0.5;
      container.addChild(ring2);

      var ring3 = new PIXI.Graphics();
      ring3.lineStyle(1.5, 0x99ccff, 0.4);
      ring3.drawEllipse(0, 0, portalSize * 0.45, portalSize * 0.35);
      ring3.rotation = -0.3;
      container.addChild(ring3);

      var innerGlow = new PIXI.Graphics();
      innerGlow.beginFill(0xaabbff, 0.25);
      innerGlow.drawCircle(0, 0, portalSize * 0.3);
      innerGlow.endFill();
      innerGlow.beginFill(0xccddff, 0.15);
      innerGlow.drawCircle(0, 0, portalSize * 0.15);
      innerGlow.endFill();
      container.addChild(innerGlow);

      var isLeft = pos.x < cx;
      var labelOff = portalSize + 14;
      var lx = isLeft ? labelOff : -labelOff;
      var ax = isLeft ? 0 : 1;

      var txt = new PIXI.Text(p.label, {
        fontSize: 11, fill: 0xccddff, align: "center",
        wordWrap: true, wordWrapWidth: 100,
        fontFamily: "Segoe UI, system-ui, sans-serif",
      });
      txt.anchor.set(ax, 0.5);
      txt.x = lx;
      txt.y = 0;
      container.addChild(txt);

      container._portalData = p;
      container._outerAura = outerAura;
      container._ring1 = ring1;
      container._ring2 = ring2;
      container._ring3 = ring3;
      container._innerGlow = innerGlow;
      gameLayer.addChild(container);
      portalObjects.push(container);
    });
  }

  function getPortalAtPoint(px, py) {
    for (var i = 0; i < portalObjects.length; i++) {
      var po = portalObjects[i];
      var dx = px - po.x;
      var dy = py - po.y;
      if (Math.sqrt(dx * dx + dy * dy) < portalHitRadius) return po;
    }
    return null;
  }

  function startFlyToPortal(portalObj) {
    if (portalGraceTimer > 0 || flyingToPortal || flyingBack || shipInSpin || gameOver) return;
    flyingToPortal = true;
    flyingBack = false;
    flyTarget = portalObj;
    flyStartX = shipGfx.x;
    flyStartY = shipGfx.y;
    flyEndX = portalObj.x;
    flyEndY = portalObj.y;
    flyProgress = 0;
    aiSDK.playSfx("click");
  }

  function updateFlyToPortal(dt) {
    if (!flyingToPortal && !flyingBack) return;
    var dur = flyingToPortal ? flyDuration : flyBackDuration;
    flyProgress += dt / dur;

    if (flyProgress >= 1) {
      flyProgress = 0;
      shipGfx.x = flyEndX;
      shipGfx.y = flyEndY;
      if (flyingToPortal) {
        flyingToPortal = false;
        enterPortal(flyTarget._portalData);
      } else {
        flyingBack = false;
        shipAngle = Math.atan2(flyEndY - cy, flyEndX - cx);
        shipTargetAngle = shipAngle;
      }
      return;
    }

    var t = 1 - Math.pow(1 - flyProgress, 3);
    shipGfx.x = flyStartX + (flyEndX - flyStartX) * t;
    shipGfx.y = flyStartY + (flyEndY - flyStartY) * t;
    shipGfx.rotation = Math.atan2(flyEndY - shipGfx.y, flyEndX - shipGfx.x);
  }

  function enterPortal(portal) {
    if (gameOver) return;

    if (portal.correct) {
      gameOver = true;
      gamePaused = true;
      var finalTime = elapsedSeconds + penaltySeconds;
      aiSDK.playSfx("complete");
      aiSDK.stopBgMusic();
      showResults(portal, finalTime);
    } else {
      wrongAttempts++;
      penaltySeconds += 5;
      shieldHP = Math.max(0, shieldHP - 1);
      shieldText.text = "Shields: " + shieldHP;
      aiSDK.playSfx("incorrect");
      aiSDK.showSnack("Wrong portal! Shield hit. +5s penalty.", 3000, false);

      // Flash portal red
      if (flyTarget) {
        var ft = flyTarget;
        ft._ring1.tint = 0xff3333;
        ft._ring2.tint = 0xff3333;
        setTimeout(function () { ft._ring1.tint = 0xffffff; ft._ring2.tint = 0xffffff; }, 600);
      }

      if (shieldHP <= 0) {
        gameOver = true;
        gamePaused = true;
        aiSDK.stopBgMusic();
        showResults(null, elapsedSeconds + penaltySeconds);
        return;
      }

      // Fly back to orbit
      var angle = Math.atan2(shipGfx.y - cy, shipGfx.x - cx);
      flyingBack = true;
      flyingToPortal = false;
      flyStartX = shipGfx.x;
      flyStartY = shipGfx.y;
      flyEndX = cx + Math.cos(angle) * orbitRadius;
      flyEndY = cy + Math.sin(angle) * orbitRadius;
      flyProgress = 0;
    }
  }

  // ── Weapons (unified charge-based missiles) ────────────────────────
  function fireMissile(chargePct) {
    if (fireCooldown > 0 || shipInSpin || gameOver || flyingToPortal || flyingBack) return;
    fireCooldown = fireCooldownMax;

    var sx = shipGfx.x;
    var sy = shipGfx.y;
    var angle = shipFaceAngle;
    var speed = 350 + chargePct * 150;

    var m = new PIXI.Graphics();
    var mSize = 2.5 + chargePct * 2.5;
    var mColor = chargePct >= 0.85 ? 0xff6600 : 0x00ffff;
    m.beginFill(mColor);
    m.drawCircle(0, 0, mSize);
    m.endFill();
    if (chargePct > 0.4) {
      m.beginFill(mColor, 0.2);
      m.drawCircle(0, 0, mSize * 2);
      m.endFill();
    }

    m.x = sx;
    m.y = sy;
    m._vx = Math.cos(angle) * speed;
    m._vy = Math.sin(angle) * speed;
    m._life = 3000;
    m._targetDist = asteroidRadius * (1 - chargePct * 0.95);
    var impactMult = 2;
    if (powerUpLevel > 0) impactMult = 2 + powerUpLevel * 0.67;
    if (enemyKillBoost > 0) { impactMult += 1; enemyKillBoost--; }
    m._impactRadius = baseImpactRadius * impactMult + Math.random() * baseImpactRadius * 0.4;
    m._chargePct = chargePct;
    gameLayer.addChild(m);
    missiles.push(m);

    aiSDK.playSfx(chargePct >= 0.85 ? "correct" : "click");
  }

  function updateMissiles(dt) {
    var dtSec = dt / 1000;
    for (var i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      if (m._isDisruptor) continue;

      m.x += m._vx * dtSec;
      m.y += m._vy * dtSec;
      m._life -= dt;

      var hitEnemy = false;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        var edx = m.x - e.x;
        var edy = m.y - e.y;
        if (Math.sqrt(edx * edx + edy * edy) < 18) {
          spawnExplosion(e.x, e.y);
          aiSDK.playSfx("complete");
          enemyKillBoost += 2;
          gameLayer.removeChild(e);
          e.destroy();
          enemies.splice(j, 1);
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) {
        gameLayer.removeChild(m);
        m.destroy();
        missiles.splice(i, 1);
        continue;
      }

      var dx = m.x - cx;
      var dy = m.y - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= m._targetDist) {
        eraseAt(m.x, m.y, m._impactRadius);
        spawnDebris(m.x, m.y, 4 + Math.floor((m._chargePct || 0) * 4));
        playImpactSound(m._impactRadius);
        gameLayer.removeChild(m);
        m.destroy();
        missiles.splice(i, 1);
        continue;
      }

      if (dist < 10) {
        eraseAt(m.x, m.y, m._impactRadius);
        spawnDebris(m.x, m.y, 6);
        playImpactSound(m._impactRadius);
        gameLayer.removeChild(m);
        m.destroy();
        missiles.splice(i, 1);
        continue;
      }

      if (m._life <= 0 || m.x < -20 || m.x > W + 20 || m.y < -20 || m.y > H + 20) {
        gameLayer.removeChild(m);
        m.destroy();
        missiles.splice(i, 1);
      }
    }
  }

  // ── Enemies ─────────────────────────────────────────────────────────
  function spawnEnemy() {
    var angle = Math.random() * Math.PI * 2;
    var spawnDist = Math.max(W, H) * 0.6;
    var ex = cx + Math.cos(angle) * spawnDist;
    var ey = cy + Math.sin(angle) * spawnDist;

    var e = new PIXI.Graphics();
    e.beginFill(0xff3333);
    e.moveTo(10, 0);
    e.lineTo(3, -4);
    e.lineTo(-5, -10);
    e.lineTo(-3, -3);
    e.lineTo(-8, -2);
    e.lineTo(-8, 2);
    e.lineTo(-3, 3);
    e.lineTo(-5, 10);
    e.lineTo(3, 4);
    e.closePath();
    e.endFill();
    e.beginFill(0xff6666, 0.7);
    e.moveTo(8, 0);
    e.lineTo(3, -2);
    e.lineTo(3, 2);
    e.closePath();
    e.endFill();
    e.beginFill(0xff4400, 0.6);
    e.drawEllipse(-9, 0, 2, 3);
    e.endFill();

    e.x = ex;
    e.y = ey;
    e._life = 18000;
    e._speed = 50 + Math.random() * 40;
    e._canShoot = Math.random() < 0.2;
    e._shootTimer = 3000 + Math.random() * 5000;
    gameLayer.addChild(e);
    enemies.push(e);
  }

  function updateEnemies(dt) {
    var dtSec = dt / 1000;
    var sx = shipGfx.x;
    var sy = shipGfx.y;

    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      e._life -= dt;

      // Move toward player
      var dx = sx - e.x;
      var dy = sy - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        e.x += (dx / dist) * e._speed * dtSec;
        e.y += (dy / dist) * e._speed * dtSec;
        e.rotation = Math.atan2(dy, dx);
      }

      // Collision with player ship
      if (dist < 25 && !shipInSpin) {
        knockbackAngle = Math.random() > 0.5 ? 1 : -1;
        knockbackForce = 3;
        if (powerUpLevel > 0) { powerUpLevel = 0; updatePowerUpUI(); aiSDK.showSnack("Power-up lost!", 1500, true); }
        aiSDK.playSfx("incorrect");
        spawnDebris(e.x, e.y, 5);
        gameLayer.removeChild(e);
        e.destroy();
        enemies.splice(i, 1);
        continue;
      }

      // Rare disruptor shot
      if (e._canShoot && dist < orbitRadius * 1.2) {
        e._shootTimer -= dt;
        if (e._shootTimer <= 0) {
          e._canShoot = false;
          fireDisruptor(e.x, e.y, sx, sy);
        }
      }

      if (e._life <= 0) {
        gameLayer.removeChild(e);
        e.destroy();
        enemies.splice(i, 1);
      }
    }
  }

  function fireDisruptor(ex, ey, tx, ty) {
    var angle = Math.atan2(ty - ey, tx - ex);
    var speed = 200;
    var d = new PIXI.Graphics();
    d.beginFill(0xff00ff, 0.8);
    d.drawCircle(0, 0, 4);
    d.endFill();
    d.beginFill(0xff00ff, 0.2);
    d.drawCircle(0, 0, 8);
    d.endFill();
    d.x = ex;
    d.y = ey;
    d._vx = Math.cos(angle) * speed;
    d._vy = Math.sin(angle) * speed;
    d._life = 4000;
    d._isDisruptor = true;
    gameLayer.addChild(d);
    missiles.push(d);
  }

  function checkDisruptorHits(dt) {
    var sx = shipGfx.x;
    var sy = shipGfx.y;
    for (var i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      if (!m._isDisruptor) continue;
      var dx = sx - m.x;
      var dy = sy - m.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20 && !shipInSpin) {
        shipInSpin = true;
        spinTimer = spinDuration;
        if (powerUpLevel > 0) { powerUpLevel = 0; updatePowerUpUI(); }
        aiSDK.showSnack("Ship hit! Systems disrupted!", 2000, true);
        spawnDebris(m.x, m.y, 6);
        gameLayer.removeChild(m);
        m.destroy();
        missiles.splice(i, 1);
      }
    }
  }

  // ── Particles ───────────────────────────────────────────────────────
  function spawnDebris(x, y, count) {
    for (var i = 0; i < count; i++) {
      var p = new PIXI.Graphics();
      var size = 2 + Math.random() * 3;
      p.beginFill(0xaa8866);
      p.drawRect(-size / 2, -size / 2, size, size);
      p.endFill();
      p.x = x;
      p.y = y;
      var angle = Math.random() * Math.PI * 2;
      var speed = 80 + Math.random() * 160;
      p._vx = Math.cos(angle) * speed;
      p._vy = Math.sin(angle) * speed;
      p._life = 400 + Math.random() * 300;
      p._maxLife = p._life;
      gameLayer.addChild(p);
      particles.push(p);
    }
  }

  function spawnExplosion(x, y) {
    var colors = [0xff4400, 0xff6600, 0xffaa00, 0xff2200, 0xffcc44];
    for (var i = 0; i < 14; i++) {
      var p = new PIXI.Graphics();
      var size = 2 + Math.random() * 5;
      var c = colors[Math.floor(Math.random() * colors.length)];
      p.beginFill(c);
      p.drawCircle(0, 0, size);
      p.endFill();
      if (size > 3) { p.beginFill(0xffffff, 0.5); p.drawCircle(0, 0, size * 0.4); p.endFill(); }
      p.x = x;
      p.y = y;
      var angle = Math.random() * Math.PI * 2;
      var speed = 120 + Math.random() * 250;
      p._vx = Math.cos(angle) * speed;
      p._vy = Math.sin(angle) * speed;
      p._life = 500 + Math.random() * 500;
      p._maxLife = p._life;
      gameLayer.addChild(p);
      particles.push(p);
    }
  }

  function playImpactSound(radius) {
    if (radius > baseImpactRadius * 3) {
      aiSDK.playSfx("levelup");
    } else if (radius > baseImpactRadius * 1.8) {
      aiSDK.playSfx("pop");
    } else {
      aiSDK.playSfx("click");
    }
  }

  function updateParticles(dt) {
    var dtSec = dt / 1000;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p._vx * dtSec;
      p.y += p._vy * dtSec;
      p._vy += 200 * dtSec;
      p._life -= dt;
      p.alpha = Math.max(0, p._life / p._maxLife);
      if (p._life <= 0) {
        gameLayer.removeChild(p);
        p.destroy();
        particles.splice(i, 1);
      }
    }
  }

  // ── Power-ups ──────────────────────────────────────────────────────
  function spawnPowerUp() {
    if (powerUps.length >= 2) return;
    var angle = Math.random() * Math.PI * 2;
    var pu = new PIXI.Graphics();
    pu.beginFill(0x44ff44, 0.8);
    pu.drawCircle(0, 0, 5);
    pu.endFill();
    pu.beginFill(0x44ff44, 0.15);
    pu.drawCircle(0, 0, 11);
    pu.endFill();
    pu.beginFill(0xaaffaa, 0.5);
    pu.drawCircle(0, 0, 2);
    pu.endFill();
    pu.x = cx + Math.cos(angle) * orbitRadius;
    pu.y = cy + Math.sin(angle) * orbitRadius;
    pu._life = 8000;
    gameLayer.addChild(pu);
    powerUps.push(pu);
  }

  function updatePowerUps(dt) {
    var sx = shipGfx.x;
    var sy = shipGfx.y;
    for (var i = powerUps.length - 1; i >= 0; i--) {
      var pu = powerUps[i];
      pu._life -= dt;
      pu.alpha = pu._life < 2000 ? pu._life / 2000 : 1;
      var dx = sx - pu.x;
      var dy = sy - pu.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22 && powerUpLevel < maxPowerUpLevel && !flyingToPortal && !flyingBack) {
        powerUpLevel++;
        updatePowerUpUI();
        aiSDK.playSfx("correct");
        aiSDK.showSnack("Impact boost! (" + powerUpLevel + "/" + maxPowerUpLevel + ")", 1500, true);
        gameLayer.removeChild(pu);
        pu.destroy();
        powerUps.splice(i, 1);
        continue;
      }
      if (pu._life <= 0) {
        gameLayer.removeChild(pu);
        pu.destroy();
        powerUps.splice(i, 1);
      }
    }
  }

  function updatePowerUpUI() {
    if (!powerUpText) return;
    if (powerUpLevel > 0) {
      var dots = "";
      for (var i = 0; i < maxPowerUpLevel; i++) dots += i < powerUpLevel ? "\u25C9 " : "\u25CB ";
      powerUpText.text = "Boost: " + dots.trim();
    } else {
      powerUpText.text = "";
    }
  }

  // ── Input ───────────────────────────────────────────────────────────
  function setupInput() {
    var view = app.view;
    view.style.touchAction = "none";

    var onPointerMove = function (px, py) {
      lastPointerX = px;
      lastPointerY = py;
      if (gameOver || gamePaused || flyingToPortal || flyingBack) return;
      shipTargetAngle = Math.atan2(py - cy, px - cx);
    };

    var onPointerUp = function (px, py) {
      if (gameOver || gamePaused) return;
      var held = Date.now() - pointerDownTime;
      if (pointerDown) {
        var portal = getPortalAtPoint(px, py);
        if (portal && !flyingToPortal && !flyingBack) {
          startFlyToPortal(portal);
        } else if (!flyingToPortal && !flyingBack) {
          var chargePct = Math.min(1, held / chargeThreshold);
          fireMissile(chargePct);
        }
      }
      pointerDown = false;
      pointerDownTime = 0;
      chargeBar.visible = false;
    };

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
      pointerDown = true;
      pointerDownTime = Date.now();
      var g = toGameCoord(e.clientX, e.clientY);
      lastPointerX = g.x;
      lastPointerY = g.y;
    });

    view.addEventListener("mouseup", function (e) {
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
      pointerDown = true;
      pointerDownTime = Date.now();
      var t = e.touches[0];
      var g = toGameCoord(t.clientX, t.clientY);
      onPointerMove(g.x, g.y);
    }, { passive: false });

    view.addEventListener("touchend", function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      var g = toGameCoord(t.clientX, t.clientY);
      onPointerUp(g.x, g.y);
    }, { passive: false });
  }

  // ── Charge bar UI ───────────────────────────────────────────────────
  function updateChargeBar() {
    if (!pointerDown || shipInSpin || gameOver || flyingToPortal || flyingBack) {
      chargeBar.visible = false;
      return;
    }
    var held = Date.now() - pointerDownTime;
    if (held < 150) { chargeBar.visible = false; return; }

    chargeBar.visible = true;
    chargeBar.clear();
    var pct = Math.min(1, held / chargeThreshold);
    var barW = 50;
    var barH = 6;
    var bx = shipGfx.x - barW / 2;
    var by = shipGfx.y - 22;

    chargeBar.beginFill(0x333333, 0.6);
    chargeBar.drawRoundedRect(bx, by, barW, barH, 3);
    chargeBar.endFill();

    var fillColor = pct >= 1 ? 0xff6600 : 0x00d4ff;
    chargeBar.beginFill(fillColor);
    chargeBar.drawRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 2);
    chargeBar.endFill();
  }

  // ── Pause overlay & unpause modal ──────────────────────────────────
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
    noBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      hideUnpauseModal();
    });
    btnRow.appendChild(noBtn);

    var yesBtn = document.createElement("button");
    yesBtn.textContent = "Resume";
    yesBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    yesBtn.onmouseenter = function () { yesBtn.style.opacity = "0.85"; };
    yesBtn.onmouseleave = function () { yesBtn.style.opacity = "1"; };
    yesBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      resumeGame();
    });
    btnRow.appendChild(yesBtn);

    card.appendChild(btnRow);
    unpauseModal.appendChild(card);

    unpauseModal.addEventListener("click", function (e) {
      if (e.target === unpauseModal) hideUnpauseModal();
    });

    document.body.appendChild(unpauseModal);
  }

  function hideUnpauseModal() {
    if (unpauseModal) { unpauseModal.remove(); unpauseModal = null; }
  }

  function pauseGame() {
    if (gamePaused || gameOver) return;
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
      aiSDK.setAudioVolume("bg", 0.025);
    }
  }

  // ── Game loop ───────────────────────────────────────────────────────
  function gameLoop(delta) {
    if (gamePaused || gameOver) return;
    var dt = app.ticker.deltaMS;

    // Timer
    elapsedSeconds = (Date.now() - startTime) / 1000;
    var totalTime = elapsedSeconds + penaltySeconds;
    timerText.text = totalTime.toFixed(1) + "s";

    // Update reveal display
    if (uiLayer._revealText) {
      uiLayer._revealText.text = "Revealed: " + Math.floor(revealPercent) + "%";
    }

    // Cooldowns
    fireCooldown = Math.max(0, fireCooldown - dt);
    drillCooldown = Math.max(0, drillCooldown - dt);
    portalGraceTimer = Math.max(0, portalGraceTimer - dt);

    updateShip(dt);
    updateFlyToPortal(dt);
    updateMissiles(dt);
    updateEnemies(dt);
    checkDisruptorHits(dt);
    updateParticles(dt);
    updatePowerUps(dt);
    updateChargeBar();

    // Enemy spawning
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0 && enemies.length < 6) {
      spawnEnemy();
      enemySpawnTimer = enemySpawnInterval * 0.8 + Math.random() * 3000;
    }

    // Power-up spawning
    powerUpSpawnTimer -= dt;
    if (powerUpSpawnTimer <= 0) {
      spawnPowerUp();
      powerUpSpawnTimer = powerUpSpawnInterval + Math.random() * 5000;
    }

    // Animate portal vortex rings
    var normDt = dt / 16.67;
    for (var i = 0; i < portalObjects.length; i++) {
      var po = portalObjects[i];
      po._ring1.rotation += 0.008 * normDt;
      po._ring2.rotation -= 0.012 * normDt;
      po._ring3.rotation += 0.006 * normDt;
      po._innerGlow.alpha = 0.2 + Math.sin(Date.now() / 600 + i * 1.5) * 0.12;
      po._outerAura.alpha = 0.06 + Math.sin(Date.now() / 1000 + i) * 0.04;
    }

    // Instructions stay visible permanently
  }

  // ── Results (DOM popup with Next button) ────────────────────────────
  function showResults(portal, finalTime) {
    gamePaused = true;

    var isCorrect = portal && portal.correct;
    var heading = isCorrect ? "Mission Complete!" : "Shields Depleted";
    var headColor = isCorrect ? "#44ff44" : "#ff4444";
    var borderColor = isCorrect ? "rgba(0,212,255,0.3)" : "rgba(255,68,68,0.3)";

    var overlay = document.createElement("div");
    overlay.id = "result-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;";

    var card = document.createElement("div");
    card.style.cssText = "background:rgba(10,15,40,0.95);border:1px solid " + borderColor + ";border-radius:16px;padding:24px 28px;max-width:340px;width:90%;text-align:center;color:#fff;font-family:Segoe UI,system-ui,sans-serif;";

    var h = '<h2 style="color:' + headColor + ';margin:0 0 14px;font-size:22px;">' + heading + '</h2>';

    if (isCorrect) {
      h += '<p style="color:#ccc;margin:0 0 6px;font-size:14px;">You identified: <strong style="color:#fff;">' + portal.label + '</strong></p>';
      h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Time: ' + finalTime.toFixed(1) + 's' + (penaltySeconds > 0 ? ' (incl. ' + penaltySeconds + 's penalty)' : '') + '</p>';
      h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Asteroid revealed: ' + Math.floor(revealPercent) + '%</p>';
      if (wrongAttempts > 0) h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Wrong portals: ' + wrongAttempts + '</p>';
    } else {
      h += '<p style="color:#ccc;margin:0 0 6px;font-size:14px;">All shields lost</p>';
      h += '<p style="color:#aaa;margin:0 0 4px;font-size:13px;">Time: ' + finalTime.toFixed(1) + 's</p>';
      var correctP = portals.find(function (p) { return p.correct; });
      if (correctP) h += '<p style="color:#ffaa00;margin:0 0 4px;font-size:13px;">Answer: ' + correctP.label + '</p>';
    }

    card.innerHTML = h;

    var benchDiv = document.createElement("div");
    benchDiv.style.cssText = "margin:12px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.1);";
    benchDiv.innerHTML = '<p style="color:#666;font-size:12px;margin:0;">Loading scores\u2026</p>';
    card.appendChild(benchDiv);

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:18px;";

    var retryBtn = document.createElement("button");
    retryBtn.textContent = "Retry";
    retryBtn.style.cssText = "padding:10px 28px;border-radius:8px;border:1px solid #00d4ff;background:transparent;color:#00d4ff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s;";
    retryBtn.onmouseenter = function () { retryBtn.style.opacity = "0.7"; };
    retryBtn.onmouseleave = function () { retryBtn.style.opacity = "1"; };
    retryBtn.addEventListener("click", function () {
      location.reload();
    });
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
    var resultData = { time: finalTime, revealPercent: Math.floor(revealPercent), wrongAttempts: wrongAttempts, correct: isCorrect };
    aiSDK.saveInstanceData(resultData);
    aiSDK.saveUserProgress({
      score: isCorrect ? Math.max(0, Math.round(100 - finalTime * 2 - wrongAttempts * 10)) : 0,
      completed: true,
      customData: resultData,
    });
    aiSDK.markCompleted();

    aiSDK.emitEvent({
      type: "INTERACTION_COMPLETED",
      data: resultData,
      requiresLLMResponse: true,
    });

    // Fetch average scores
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

  // ── Resize — reload game on view change for correct layout ─────────
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
        console.log("[OrbExcav] Device class changed (mobile=" + initIsMobile + " -> " + nowIsMobile + "), reloading...");
        location.reload();
      }
    }, 500);
  }
  window.addEventListener("resize", scheduleViewReload);

  // Listen for parent messages
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
