// Image Explorer Interaction
// Generates a themed image of content and quizzes the user to identify regions by clicking
// Tests Phase 4: content caching, component map labelling, dictionary labels, dual-viewport
//
// How it works:
// 1. User enters a movie/TV show name (temporary input; later from personalisation)
// 2. Calls aiSDK.generateImage() with includeComponentMap + dualViewport
// 3. Picks desktop (16:9) or mobile (9:16) image based on iframe aspect ratio
// 4. Displays image in a zoom/pan viewer (pinch on mobile, wheel on desktop)
// 5. Asks user to click the region representing a randomly selected step
// 6. Checks click against componentMap bounding boxes with tolerance
// 7. Shows feedback: confetti on correct, "try again or skip" on incorrect
// 8. Quiz questions and feedback are sent to parent via setInteractionInfo (shown in control bar)

(function () {
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
      // Cross-interaction navigation
      navigateToSubstage: (stageId, substageId) => {
        sendMessage("ai-sdk-navigate-to-substage", { stageId, substageId });
      },
      getLessonStructure: (callback) => {
        sendMessage("ai-sdk-get-lesson-structure", {}, (r) => {
          if (callback) callback(r.structure);
        });
      },
      // Shared lesson data
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
      // Prefetch results
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
    };
  };

  // ── State ───────────────────────────────────────────────────────────
  let aiSDK = null;
  let steps = [];
  let processTitle = "";
  let contentType = "process"; // "process" (grid/panel) or "items" (single scene)
  let componentMap = null;
  let imageUrl = null;
  let desktopResponse = null;
  let mobileResponse = null;
  let quizOrder = [];
  let currentQuizIndex = 0;
  let correctCount = 0;
  let attempts = 0;

  // Parent state (received via container-dimensions)
  let parentIsFullscreen = false;
  let parentIsMobile = false;
  let isTestMode = true;

  // Zoom / pan state
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let fitZoom = 1;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let lastPanX = 0;
  let lastPanY = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  const MAX_ZOOM_FACTOR = 5; // max zoom = fitZoom * MAX_ZOOM_FACTOR
  const CLICK_TOLERANCE = 8; // percentage points tolerance for bounding-box hit

  // ── Audio (delegates to parent SDK AudioService) ───────────────────
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
  function stopBgMusic()  { if (aiSDK) aiSDK.stopBgMusic(); }

  // ── DOM helpers ─────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ── Quiz messaging: persistent snack with action buttons + AI chat ──
  function sendQuizInfo(text, feedbackText, feedbackType, progress, actions) {
    if (!aiSDK) return;

    var display = "";
    if (progress) display += "[" + progress + "] ";
    display += text || "";
    if (feedbackText) display += " — " + feedbackText;

    aiSDK.showSnack(display, 0, true, actions || []);
  }

  function clearQuizInfo() {
    if (!aiSDK) return;
    aiSDK.hideSnack();
    aiSDK.setInteractionInfo(null);
  }

  function checkContentOverflow() {
    var doCheck = function () {
      var app = $("app");
      if (!app) return;
      var viewportH = window.innerHeight;

      // Temporarily unlock height constraints to measure natural content size.
      // The iframe is visibility:hidden in the parent until this check completes,
      // so the user never sees the momentary layout shift.
      app.style.height = "auto";
      app.style.overflow = "visible";
      var naturalH = app.scrollHeight;
      app.style.height = "";
      app.style.overflow = "";

      var overflows = naturalH > viewportH + 2;
      window.parent.postMessage({
        type: "ai-sdk-content-overflow",
        overflow: overflows,
        scrollHeight: naturalH,
        viewportHeight: viewportH
      }, "*");
      console.log("[ImageExplorer] Overflow check: naturalH=" + naturalH +
        " viewportH=" + viewportH + " overflows=" + overflows);
    };
    requestAnimationFrame(function () {
      doCheck();
      setTimeout(doCheck, 200);
    });
  }

  // ── Listen for container-dimensions from parent ─────────────────────
  function setupContainerDimensionsListener() {
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "container-dimensions") {
        var wasMobile = parentIsMobile;
        parentIsFullscreen = !!event.data.isFullscreen;
        parentIsMobile = !!event.data.isMobile;
        console.log("[ImageExplorer] Container dims:", event.data.width + "x" + event.data.height,
          "fullscreen:", parentIsFullscreen, "mobile:", parentIsMobile);

        if (wasMobile !== parentIsMobile && desktopResponse) {
          switchViewportImage();
        }
      }
    });
  }

  // ── Switch between desktop/mobile image when viewport changes ──────
  function switchViewportImage() {
    var shouldUseMobile = parentIsMobile && mobileResponse;
    var newActive = shouldUseMobile ? mobileResponse : desktopResponse;
    var newUrl = newActive.imageUrl;

    if (newUrl === imageUrl) return;

    console.log("[ImageExplorer] Viewport switch → " +
      (shouldUseMobile ? "mobile (9:16)" : "desktop (16:9)"));
    imageUrl = newUrl;
    componentMap = newActive.componentMap;

    var imgEl = $("explore-image");
    if (imgEl && $("explore-section") && $("explore-section").style.display !== "none") {
      imgEl.onload = function () {
        calculateFitZoom();
        checkContentOverflow();
      };
      imgEl.src = newUrl;
    } else {
      checkContentOverflow();
    }
  }

  // ── Listen for actions from parent (Skip, Retry) ───────────────────
  function setupParentActionListener() {
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "interaction-action") {
        var action = event.data.action;
        console.log("[ImageExplorer] Received action from parent:", action);
        if (action === "Skip") {
          nextQuestion();
        } else if (action === "Retry") {
          onRetry();
        }
      }
    });
  }

  // ── Initialise ──────────────────────────────────────────────────────
  function init() {
    aiSDK = createIframeAISDK();

    // Read config / sample data injected by the host
    const config = window.interactionConfig || {};
    const data = window.interactionData || {};

    // testMode: true (default) shows the movie/TV input prompt for manual testing
    // testMode: false uses personalisation data to auto-select or generate images
    isTestMode = config.testMode !== false; // default true for backward compat

    processTitle = config.processTitle || data.processTitle || "Process";

    // Steps can come from config (newline-separated string) or sampleData (array)
    if (config.processSteps && typeof config.processSteps === "string") {
      steps = config.processSteps.split("\n").map((s) => s.trim()).filter(Boolean);
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

    // Detect content type: "process" (grid panels) or "items" (single scene)
    if (config.contentType === "process" || config.contentType === "items") {
      contentType = config.contentType;
      console.log("[ImageExplorer] Content type from config override:", contentType);
    } else {
      contentType = detectContentType(processTitle, steps);
      console.log("[ImageExplorer] Content type auto-detected:", contentType, "for title:", processTitle);
    }

    // Read audio config (lesson-builder config overrides interaction-type iframeConfig)
    bgMusicStyle = config.bgMusicStyle || "calm";
    bgMusicUrl = config.bgMusicUrl || null;
    if (bgMusicStyle === "custom" && bgMusicUrl) {
      bgMusicLoopConfig = {
        loopStart: config.bgMusicLoopStart || 0,
        loopEnd: config.bgMusicLoopEnd || 0,
        crossfade: config.bgMusicCrossfade != null ? config.bgMusicCrossfade : 2,
      };
    }
    console.log("[ImageExplorer] Audio config:", bgMusicStyle, bgMusicUrl ? "(custom URL)" : "(synthesised)");

    $("title-text").textContent = processTitle;
    $("step-count").textContent = steps.length + (contentType === "items" ? " items" : " steps");

    // Wire up generate button (used in test mode)
    $("generate-btn").addEventListener("click", onGenerate);
    $("movie-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onGenerate();
    });

    // Zoom overlay buttons
    $("zoom-in-btn").addEventListener("click", () => { setZoom(scale * 1.3); });
    $("zoom-out-btn").addEventListener("click", () => { setZoom(scale / 1.3); });
    $("zoom-reset-btn").addEventListener("click", () => { resetZoom(); });

    setupImageInteraction();
    setupParentActionListener();
    setupContainerDimensionsListener();

    if (isTestMode) {
      console.log("[ImageExplorer] Test mode enabled — showing manual input");
      $("intro-start-btn").addEventListener("click", function () {
        hide($("intro-section"));
        show($("input-section"));
        $("movie-input").focus();
        checkContentOverflow();
      });
      show($("intro-section"));
      hide($("input-section"));
    } else {
      console.log("[ImageExplorer] Production mode — using personalisation data");
      $("intro-start-btn").addEventListener("click", function () {
        hide($("intro-section"));
        generateFromPersonalisation();
      });
      show($("intro-section"));
      hide($("input-section"));
    }

    checkContentOverflow();
  }

  // ── Zoom helpers ──────────────────────────────────────────────────
  function setZoom(newScale) {
    scale = Math.max(fitZoom, Math.min(fitZoom * MAX_ZOOM_FACTOR, newScale));
    constrainPan();
    applyTransform();
  }

  function resetZoom() {
    scale = fitZoom;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function calculateFitZoom() {
    var container = $("image-viewer");
    var imgEl = $("explore-image");
    if (!container || !imgEl || !imgEl.naturalWidth) return;
    var cw = container.clientWidth;
    var ch = container.clientHeight;
    fitZoom = Math.min(cw / imgEl.naturalWidth, ch / imgEl.naturalHeight);
    scale = fitZoom;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function constrainPan() {
    var container = $("image-viewer");
    var imgEl = $("explore-image");
    if (!container || !imgEl || !imgEl.naturalWidth) return;
    var cw = container.clientWidth;
    var ch = container.clientHeight;
    var imgW = imgEl.naturalWidth * scale;
    var imgH = imgEl.naturalHeight * scale;

    // If image is smaller than container at current zoom, center it
    if (imgW <= cw) {
      panX = 0;
    } else {
      var maxPanX = (imgW - cw) / 2;
      panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    }
    if (imgH <= ch) {
      panY = 0;
    } else {
      var maxPanY = (imgH - ch) / 2;
      panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    }
  }

  // ── Auto-generate from personalisation data ────────────────────────
  function generateFromPersonalisation() {
    show($("loading-section"));
    $("loading-text").textContent = "Finding the best image for you...";
    clearQuizInfo();

    // Check if lesson-load prefetch already prepared our images
    if (aiSDK && aiSDK.getPrefetchResult) {
      aiSDK.getPrefetchResult("personalisedImage", function (prefetch) {
        if (prefetch && prefetch.status === "ready" && prefetch.result) {
          console.log("[ImageExplorer] ✅ Using prefetched result (source: " + prefetch.result.source + ")");
          usePrefetchedResult(prefetch.result);
          return;
        }
        if (prefetch && prefetch.status === "pending") {
          console.log("[ImageExplorer] ⏳ Prefetch still pending, polling...");
          pollPrefetch(0);
          return;
        }
        // No prefetch or error — fall through to normal pipeline
        console.log("[ImageExplorer] No prefetch available (status: " + (prefetch ? prefetch.status : "none") + "), running normal pipeline");
        runPersonalisationPipeline();
      });
    } else {
      runPersonalisationPipeline();
    }
  }

  function pollPrefetch(attempt) {
    if (attempt > 60) {
      console.warn("[ImageExplorer] Prefetch poll timeout, falling back to normal pipeline");
      runPersonalisationPipeline();
      return;
    }
    setTimeout(function () {
      aiSDK.getPrefetchResult("personalisedImage", function (prefetch) {
        if (prefetch && prefetch.status === "ready" && prefetch.result) {
          console.log("[ImageExplorer] ✅ Prefetch ready after " + (attempt + 1) + " poll(s)");
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
      var resp = result.imageResult;
      if (!resp.success) {
        console.warn("[ImageExplorer] Prefetched generation failed, running normal pipeline");
        runPersonalisationPipeline();
        return;
      }
      onImageResponse(resp);
    } else {
      console.warn("[ImageExplorer] Unknown prefetch result format, running normal pipeline");
      runPersonalisationPipeline();
    }
  }

  function runPersonalisationPipeline() {
    var interactionLabel = processTitle.toLowerCase().replace(/\s+/g, "-");

    // Step 1: Try to find an existing image pair via the dedicated pair-lookup API
    aiSDK.findImagePair(
      { dictionaryLabel: interactionLabel, interests: [] },
      function (response) {
        if (response && response.found && response.pair) {
          console.log("[ImageExplorer] Found cached image pair via findImagePair");
          useCachedImagePair(response.pair);
          return;
        }

        console.log("[ImageExplorer] No cached pair found, falling back to getLessonImages");

        // Step 2: Fall back to getLessonImages for any matching image
        aiSDK.getLessonImages(function (images, err) {
          if (err) console.warn("[ImageExplorer] getLessonImages error:", err);

          var matchingPairs = (images || []).filter(function (img) {
            return img.dictionaryLabels && img.dictionaryLabels.indexOf(interactionLabel) !== -1;
          });

          if (matchingPairs.length > 0) {
            console.log("[ImageExplorer] Found " + matchingPairs.length + " cached images for label:", interactionLabel);
            var picked = matchingPairs[Math.floor(Math.random() * matchingPairs.length)];
            useCachedImage(picked);
            return;
          }

          // Step 3: No cached images — ask LLM to pick the best theme from user prefs
          console.log("[ImageExplorer] No cached images, selecting best theme via LLM...");
          $("loading-text").textContent = "Choosing the best style for you...";
          aiSDK.selectBestTheme(
            { contentItems: steps, contentTitle: processTitle },
            function (themeResult) {
              var theme = (themeResult && themeResult.theme) || "Studio Ghibli";
              var source = (themeResult && themeResult.source) || "fallback";
              console.log("[ImageExplorer] Selected theme:", theme, "(source:", source + ")");
              $("loading-text").textContent = "Generating illustration in the style of " + theme + "...";
              generateWithTheme(theme);
            }
          );
        });
      }
    );
  }

  function useCachedImagePair(pair) {
    console.log("[ImageExplorer] Using cached image pair — desktop:", pair.desktop?.imageId, "mobile:", pair.mobile?.imageId);
    $("loading-text").textContent = "Loading cached image...";

    desktopResponse = {
      imageUrl: pair.desktop.imageUrl,
      imageId: pair.desktop.imageId,
      componentMap: pair.desktop.componentMap || null,
    };
    mobileResponse = pair.mobile ? {
      imageUrl: pair.mobile.imageUrl,
      imageId: pair.mobile.imageId,
      componentMap: pair.mobile.componentMap || null,
    } : null;

    var useMobile = parentIsMobile && mobileResponse;
    var active = useMobile ? mobileResponse : desktopResponse;
    imageUrl = active.imageUrl;
    componentMap = active.componentMap;

    $("cache-badge").textContent = "Cached";
    $("cache-badge").className = "cache-badge cached";
    show($("cache-badge"));

    var imgEl = $("explore-image");
    imgEl.onload = function () {
      hide($("loading-section"));
      show($("explore-section"));
      calculateFitZoom();
      startQuiz();
      checkContentOverflow();
    };
    imgEl.onerror = function () {
      $("loading-text").textContent = "Failed to load cached image — generating fresh...";
      var fallbackThemes = ["Studio Ghibli", "Pixar", "Watercolor", "Comic Book", "Retro Cartoon"];
      var theme = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
      generateWithTheme(theme);
    };
    imgEl.src = active.imageUrl;
  }

  function useCachedImage(imageRecord) {
    console.log("[ImageExplorer] Using cached image:", imageRecord.id);
    $("loading-text").textContent = "Loading cached image...";

    desktopResponse = {
      imageUrl: imageRecord.imageUrl || imageRecord.url,
      imageId: imageRecord.id,
      componentMap: imageRecord.componentMap || null,
    };
    mobileResponse = null;

    imageUrl = desktopResponse.imageUrl;
    componentMap = desktopResponse.componentMap;

    // Show cache badge
    $("cache-badge").textContent = "Cached";
    $("cache-badge").className = "cache-badge cached";
    show($("cache-badge"));

    // Load image into display
    var imgEl = $("explore-image");
    imgEl.onload = function () {
      hide($("loading-section"));
      show($("explore-section"));
      calculateFitZoom();
      startQuiz();
      checkContentOverflow();
    };
    imgEl.onerror = function () {
      $("loading-text").textContent = "Failed to load cached image — generating fresh...";
      var fallbackThemes = ["Studio Ghibli", "Pixar", "Watercolor", "Comic Book", "Retro Cartoon"];
      var theme = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
      generateWithTheme(theme);
    };
    imgEl.src = imageRecord.imageUrl || imageRecord.url;
  }

  // ── Content type detection ──────────────────────────────────────────
  function detectContentType(title, items) {
    var t = (title || "").toLowerCase();

    // Title keywords strongly indicate type
    var processKeywords = ["process", "steps", "how to", "procedure", "cycle", "workflow", "stages", "recipe", "method", "sequence", "instructions"];
    var itemKeywords = ["find", "spot", "items", "objects", "things", "identify", "locate", "parts", "components", "elements", "ingredients", "animals", "tools", "features"];
    for (var i = 0; i < processKeywords.length; i++) {
      if (t.indexOf(processKeywords[i]) !== -1) return "process";
    }
    for (var j = 0; j < itemKeywords.length; j++) {
      if (t.indexOf(itemKeywords[j]) !== -1) return "items";
    }

    // Analyse the items themselves
    var verbStarters = 0;
    var shortNouns = 0;
    var actionVerbs = ["add", "apply", "arrange", "assemble", "attach", "bake", "blend", "boil", "build", "check", "chop", "clean", "close", "coat", "collect", "combine", "connect", "cook", "cool", "cover", "create", "crush", "cut", "deliver", "design", "dig", "dip", "drain", "draw", "drill", "dry", "dust", "edit", "empty", "enter", "examine", "fill", "filter", "finish", "fix", "fold", "form", "freeze", "gather", "glue", "grind", "grow", "hang", "heat", "hold", "insert", "install", "iron", "join", "keep", "knead", "knit", "label", "lay", "level", "lift", "light", "load", "lock", "make", "mark", "measure", "melt", "mix", "mold", "mount", "move", "nail", "observe", "open", "order", "organise", "organize", "pack", "paint", "paste", "peel", "pick", "place", "plant", "plug", "polish", "pour", "prepare", "press", "print", "pull", "pump", "push", "put", "raise", "read", "record", "remove", "repair", "replace", "review", "rinse", "roll", "run", "sand", "saw", "screw", "seal", "secure", "select", "send", "separate", "serve", "set", "sew", "shake", "shape", "sharpen", "shred", "sift", "slice", "smooth", "soak", "sort", "spread", "squeeze", "stack", "stain", "stamp", "start", "stir", "store", "strain", "stretch", "strip", "submit", "test", "tighten", "trim", "turn", "twist", "unpack", "upload", "wash", "water", "weave", "weigh", "weld", "wind", "wipe", "wrap"];

    for (var k = 0; k < items.length; k++) {
      var words = items[k].trim().toLowerCase().split(/\s+/);
      if (words.length <= 2 && words[0].length <= 12) shortNouns++;
      if (words.length >= 2 && actionVerbs.indexOf(words[0]) !== -1) verbStarters++;
    }

    // If most items start with verbs, it's a process
    if (verbStarters >= items.length * 0.5) return "process";
    // If most items are short noun phrases, it's an item list
    if (shortNouns >= items.length * 0.7 && verbStarters < items.length * 0.3) return "items";

    return "process"; // default: backward-compatible
  }

  function computeGridLayout(n, landscape) {
    if (landscape) {
      if (n <= 3) return { rows: 1, cols: n };
      var rows = 2;
      var cols = Math.ceil(n / rows);
      return { rows: rows, cols: cols };
    } else {
      if (n <= 3) return { rows: n, cols: 1 };
      var cols2 = 2;
      var rows2 = Math.ceil(n / cols2);
      return { rows: rows2, cols: cols2 };
    }
  }

  function buildImageRequest(styleName) {
    var itemsList = steps.join(", ");
    var componentPrompt = itemsList;
    // Give the model REASONS why text and margins ruin the image.
    var gameContext =
      "IMPORTANT CONTEXT: This image is for a visual matching game. Two rules are critical:\n" +
      "1. NO TEXT: Players must guess which painted scene matches which concept — any text, label, caption, or number gives away answers and breaks the game.\n" +
      "2. NO MARGINS: The game runs on a screen with very limited space. Any margin, padding, border, or blank space around or between scenes wastes precious screen area and damages the experience.\n" +
      "The image must contain ONLY painted imagery filling the entire canvas edge-to-edge. ";
    var framingRules =
      "FRAMING: Full-bleed artwork — the painting touches all four edges of the canvas. " +
      "Adjacent scenes share a painted edge with artwork touching directly. " +
      "Dark backgrounds (#0f0f23 or near-black) blend with the dark UI.";
    var prompt, customInstr;

    var scenesText = steps.join(", ");

    if (contentType === "items") {
      prompt = gameContext +
        "Create a single wide landscape painted illustration inspired by the visual style and aesthetic of '" +
        styleName +
        "'. Use a similar color palette, art style, and character design sensibility. " +
        "The painting is a SINGLE COHESIVE SCENE that contains ALL of the following objects clearly visible and identifiable: " +
        scenesText + ". " +
        "Paint ONE continuous scene where each object appears naturally within the environment but is clearly distinct and easy to spot. " +
        "EVERY object must be VISUALLY UNIQUE — no two objects may look alike. Each must be instantly distinguishable from all others. " +
        "Each object must be large enough to tap/click on and visually unambiguous. " +
        "Remember: this is for a game — the player must identify each object by its visual appearance alone, so there must be zero text anywhere in the image. " +
        framingRules;
      customInstr = "Single scene painting (not a grid) for a 16:9 landscape screen. " +
        "Contains " + steps.length + " distinct identifiable objects within one illustration. " +
        "Each object must be clearly visible and separately clickable. " +
        "FOR THE GAME TO WORK: (1) zero text/labels/captions/numbers — only painted visuals. (2) zero margins/padding/borders — screen space is limited. " +
        "Full-bleed artwork edge-to-edge. Any background uses very dark (#0f0f23).";
    } else {
      var grid = computeGridLayout(steps.length, true);
      var layoutInstruction;
      if (grid.rows === 1) {
        layoutInstruction = "LAYOUT: Arrange all " + steps.length + " scenes in a single row left-to-right, each taking equal width. ";
      } else {
        var topCount = grid.cols;
        var bottomCount = steps.length - topCount;
        layoutInstruction = "LAYOUT: Arrange the " + steps.length + " scenes in a grid with " +
          topCount + " painted regions on the top row and " + bottomCount + " on the bottom row. ";
        if (bottomCount < topCount) {
          layoutInstruction += "The bottom row has fewer regions, so stretch those " + bottomCount +
            " regions wider so they span the full width — there must be no empty or blank space. ";
        }
        layoutInstruction += "Every region must be filled with artwork. The grid fills the ENTIRE canvas edge-to-edge. ";
      }
      prompt = gameContext +
        "Create a single wide landscape painted illustration inspired by the visual style and aesthetic of '" +
        styleName +
        "'. Use a similar color palette, art style, and character design sensibility. " +
        "The painting depicts these concepts as distinct painted scenes (each conveyed ONLY through imagery, with zero text): " +
        scenesText +
        ". The player will try to match each painted scene to the correct concept, so each scene must clearly represent its concept through visual imagery alone. " +
        "EVERY scene must be VISUALLY UNIQUE — no two scenes may look alike or use the same composition. " +
        layoutInstruction +
        framingRules;
      customInstr = "Grid layout painting for a 16:9 landscape screen with " + steps.length + " painted scenes. ";
      if (grid.rows > 1) {
        var topN = grid.cols;
        var botN = steps.length - topN;
        if (botN < topN) {
          customInstr += "Top row: " + topN + " equal scenes. Bottom row: " + botN + " scenes stretched wider to fill the full width. Every region is filled. ";
        }
      }
      customInstr += "FOR THE GAME TO WORK: (1) zero text/labels/captions/numbers — only painted visuals. (2) zero margins/padding/borders — screen space is limited. " +
        "Full-bleed artwork edge-to-edge. Any background uses very dark (#0f0f23).";
    }

    return {
      prompt: prompt,
      userInput: styleName,
      customInstructions: customInstr,
      includeComponentMap: true,
      componentPromptContent: componentPrompt,
      dictionaryLabels: [processTitle.toLowerCase().replace(/\s+/g, "-")],
      width: 1440,
      height: 810,
      dualViewport: true,
      mobileWidth: 720,
      mobileHeight: 1280,
      testMode: isTestMode,
    };
  }

  function generateWithTheme(theme) {
    var req = buildImageRequest(theme);
    console.log("[ImageExplorer] Generating (" + contentType + ") with theme:", theme);
    aiSDK.generateImage(req, onImageResponse);
  }

  // ── Generate image (test mode) ────────────────────────────────────
  function onGenerate() {
    const movie = $("movie-input").value.trim();
    if (!movie) {
      shakeElement($("movie-input"));
      return;
    }

    hide($("input-section"));
    show($("loading-section"));
    $("loading-text").textContent = "Generating " + processTitle + " illustration in the style of " + movie + "...";

    var req = buildImageRequest(movie);

    console.log("[ImageExplorer] Generating (" + contentType + ") with prompt:", req.prompt.substring(0, 120) + "...");
    console.log("[ImageExplorer] componentPromptContent:", req.componentPromptContent);

    clearQuizInfo();

    aiSDK.generateImage(req, onImageResponse);
  }

  function onImageResponse(response) {
    console.log("[ImageExplorer] Image response:", {
      success: response.success,
      cached: response.cached,
      hasComponentMap: !!response.componentMap,
      hasMobileVariant: !!response.mobileVariant,
      imageId: response.imageId,
      error: response.error || null,
    });

    if (!response.success) {
      var errMsg = response.error || "Image generation failed";
      console.error("[ImageExplorer] Image generation FAILED:", errMsg);
      console.error("[ImageExplorer] Full error response:", JSON.stringify(response, null, 2));
      $("loading-text").textContent = "Error: " + errMsg;
      $("loading-spinner").style.display = "none";

      sendQuizInfo("Image generation failed. Try again.", null, null, null, ["Retry"]);

      var retryBtn = document.createElement("button");
      retryBtn.textContent = "Try Again";
      retryBtn.style.cssText = "margin-top:12px;padding:8px 20px;border-radius:8px;background:#ff6b6b;color:#fff;border:none;cursor:pointer;font-size:14px;";
      retryBtn.onclick = function () {
        retryBtn.remove();
        $("loading-spinner").style.display = "";
        hide($("loading-section"));
        show($("input-section"));
        clearQuizInfo();
      };
      $("loading-section").appendChild(retryBtn);
      return;
    }

    // Log cache status
    if (response.cached) {
      console.log("%c[ImageExplorer] IMAGE SERVED FROM CACHE", "color: #00ff88; font-size: 14px; font-weight: bold;");
    } else {
      console.log("%c[ImageExplorer] FRESH IMAGE GENERATED", "color: #ffaa00; font-size: 14px; font-weight: bold;");
    }

    // Store both variants
    desktopResponse = {
      imageUrl: response.imageUrl || response.imageData,
      imageId: response.imageId,
      componentMap: response.componentMap || null,
    };
    mobileResponse = response.mobileVariant
      ? {
          imageUrl: response.mobileVariant.imageUrl,
          imageId: response.mobileVariant.imageId,
          componentMap: response.mobileVariant.componentMap || null,
        }
      : null;

    var useMobile = parentIsMobile && mobileResponse;
    var active = useMobile ? mobileResponse : desktopResponse;
    console.log("[ImageExplorer] Image selection: parentMobile=" + parentIsMobile +
      " using=" + (useMobile ? "mobile (9:16)" : "desktop (16:9)"));
    imageUrl = active.imageUrl;
    componentMap = active.componentMap;

    if (componentMap && componentMap.components) {
      // Enforce minimum box sizes for items mode (AI sometimes returns tiny boxes)
      if (contentType === "items") {
        var MIN_BOX = 8; // minimum 8% width and height
        componentMap.components.forEach(function (c) {
          if (c.width < MIN_BOX) {
            var expand = (MIN_BOX - c.width) / 2;
            c.x = Math.max(0, c.x - expand);
            c.width = MIN_BOX;
          }
          if (c.height < MIN_BOX) {
            var expandH = (MIN_BOX - c.height) / 2;
            c.y = Math.max(0, c.y - expandH);
            c.height = MIN_BOX;
          }
        });
      }
      console.log("[ImageExplorer] Component map received:", componentMap.components.length, "components (" + contentType + ")");
      componentMap.components.forEach(function (c) {
        console.log("  -", c.label, "at", c.x.toFixed(1) + "," + c.y.toFixed(1), "size", c.width.toFixed(1) + "x" + c.height.toFixed(1) + "%");
      });
    } else {
      console.warn("[ImageExplorer] No component map returned - quiz will use fallback grid");
    }

    // Show cache badge
    if (response.cached) {
      $("cache-badge").textContent = "Cached";
      $("cache-badge").className = "cache-badge cached";
    } else {
      $("cache-badge").textContent = "Fresh";
      $("cache-badge").className = "cache-badge fresh";
    }
    show($("cache-badge"));

    if (isTestMode && response.cached && aiSDK) {
      aiSDK.showSnack("Loaded from cache", 4000);
    }

    // Load image into display
    var imgEl = $("explore-image");
    imgEl.onload = function () {
      hide($("loading-section"));
      show($("explore-section"));
      calculateFitZoom();
      startQuiz();
      checkContentOverflow();
    };
    imgEl.onerror = function () {
      $("loading-text").textContent = "Failed to load image";
      setTimeout(function () {
        hide($("loading-section"));
        show($("input-section"));
        clearQuizInfo();
      }, 2000);
    };

    if (active.imageUrl && active.imageUrl.indexOf("data:") !== 0) {
      imgEl.src = active.imageUrl;
    } else if (response.imageData) {
      imgEl.src = "data:image/png;base64," + response.imageData;
    } else {
      imgEl.src = active.imageUrl;
    }
  }

  // ── Quiz logic ──────────────────────────────────────────────────────
  function startQuiz() {
    quizOrder = shuffleArray([...Array(steps.length).keys()]);
    currentQuizIndex = 0;
    correctCount = 0;
    attempts = 0;
    startBgMusic();
    showCurrentQuestion();
  }

  function quizQuestion(itemName) {
    if (contentType === "items") return 'Find the "' + itemName + '"!';
    return 'Where matches "' + itemName + '"?';
  }

  function showCurrentQuestion() {
    if (currentQuizIndex >= quizOrder.length) {
      showComplete();
      return;
    }
    var stepIdx = quizOrder[currentQuizIndex];
    var questionText = quizQuestion(steps[stepIdx]);
    var progress = (currentQuizIndex + 1) + "/" + steps.length;
    attempts = 0;

    sendQuizInfo(questionText, null, null, progress, []);
  }

  function nextQuestion() {
    currentQuizIndex++;
    showCurrentQuestion();
  }

  function showComplete() {
    var noun = contentType === "items" ? "items" : "steps";
    stopBgMusic();
    sfxComplete();
    clearQuizInfo();

    $("completion-message").textContent =
      "You found " + correctCount + " of " + steps.length + " " + noun + ".";

    var modal = $("completion-modal");
    modal.style.display = "flex";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
    console.log("[ImageExplorer] Showing completion modal");

    $("completion-retry-btn").onclick = function () {
      modal.style.display = "none";
      onRetry();
    };
    $("completion-next-btn").onclick = function () {
      modal.style.display = "none";
      stopBgMusic();
      window.parent.postMessage({ type: "ai-sdk-request-next" }, "*");
    };

    spawnConfettiBurst(30);
  }

  function onRetry() {
    $("completion-modal").style.display = "none";
    resetZoom();
    clearQuizInfo();
    startQuiz();
  }

  // ── Click handling on image ─────────────────────────────────────────
  function onImageClick(e) {
    if (currentQuizIndex >= quizOrder.length) return;

    var container = $("image-viewer");
    var imgEl = $("explore-image");
    var rect = container.getBoundingClientRect();

    var clickX = e.clientX - rect.left;
    var clickY = e.clientY - rect.top;

    // Convert to image-space percentage
    var imgDisplayW = imgEl.naturalWidth * scale;
    var imgDisplayH = imgEl.naturalHeight * scale;

    var imgLeft = (rect.width - imgDisplayW) / 2 + panX;
    var imgTop = (rect.height - imgDisplayH) / 2 + panY;

    var pctX = ((clickX - imgLeft) / imgDisplayW) * 100;
    var pctY = ((clickY - imgTop) / imgDisplayH) * 100;

    if (pctX < 0 || pctX > 100 || pctY < 0 || pctY > 100) return;

    console.log("[ImageExplorer] Click at", pctX.toFixed(1) + "%,", pctY.toFixed(1) + "%");

    var targetStep = steps[quizOrder[currentQuizIndex]];
    var hit = checkHit(pctX, pctY, targetStep);

    if (hit) {
      onCorrect(hit);
    } else {
      onIncorrect();
    }
  }

  function isPortraitImage() {
    var imgEl = $("explore-image");
    return imgEl && imgEl.naturalHeight > imgEl.naturalWidth;
  }

  function getGridCell(targetIdx) {
    var landscape = !isPortraitImage();
    var grid = computeGridLayout(steps.length, landscape);
    var row = Math.floor(targetIdx / grid.cols);
    var col = targetIdx % grid.cols;
    // The last row may have fewer items — those panels are stretched wider
    var rowStart = row * grid.cols;
    var itemsInRow = Math.min(grid.cols, steps.length - rowStart);
    var cellW = 100 / itemsInRow;
    var cellH = 100 / grid.rows;
    return { x: col * cellW, y: row * cellH, width: cellW, height: cellH };
  }

  function fallbackGridHit(pctX, pctY, targetStepLabel) {
    var targetIdx = quizOrder[currentQuizIndex];
    var cell = getGridCell(targetIdx);
    // Grid cells tile perfectly (no gaps), so use minimal tolerance (2%)
    // to handle clicks right on cell boundaries. Large tolerance causes overlap.
    var gridTol = 2;
    var inX = pctX >= cell.x - gridTol && pctX <= cell.x + cell.width + gridTol;
    var inY = pctY >= cell.y - gridTol && pctY <= cell.y + cell.height + gridTol;
    console.log("[ImageExplorer] gridHit: click=" + pctX.toFixed(1) + "," + pctY.toFixed(1) +
      " stepIdx=" + targetIdx + " cell=" + cell.x.toFixed(1) + "," + cell.y.toFixed(1) +
      " " + cell.width.toFixed(1) + "x" + cell.height.toFixed(1) +
      " inX=" + inX + " inY=" + inY + " portrait=" + isPortraitImage());
    if (inX && inY) {
      return { label: targetStepLabel, x: cell.x, y: cell.y, width: cell.width, height: cell.height };
    }
    return null;
  }

  function normalizeLabel(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }

  function labelsMatch(a, b) {
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    // Check if one starts with the other (handles "collecting" vs "collect")
    if (a.length >= 3 && b.length >= 3) {
      var shorter = a.length < b.length ? a : b;
      var longer = a.length < b.length ? b : a;
      if (longer.startsWith(shorter)) return true;
    }
    // Word overlap: any shared word with 3+ chars
    var wordsA = a.split(/\s+/).filter(function (w) { return w.length >= 3; });
    var wordsB = b.split(/\s+/).filter(function (w) { return w.length >= 3; });
    for (var i = 0; i < wordsA.length; i++) {
      for (var j = 0; j < wordsB.length; j++) {
        if (wordsA[i] === wordsB[j]) return true;
        if (wordsA[i].startsWith(wordsB[j]) || wordsB[j].startsWith(wordsA[i])) return true;
      }
    }
    return false;
  }

  function findComponentByLabel(targetStepLabel) {
    if (!componentMap || !componentMap.components || componentMap.components.length === 0) return null;

    var target = normalizeLabel(targetStepLabel);

    // Pass 1: exact normalized match
    var match = componentMap.components.find(function (c) {
      return normalizeLabel(c.label) === target;
    });
    if (match) return match;

    // Pass 2: flexible label matching
    match = componentMap.components.find(function (c) {
      return labelsMatch(normalizeLabel(c.label), target);
    });
    if (match) return match;

    // Pass 3: positional — use step index if it's within component array bounds
    var stepIdx = steps.indexOf(targetStepLabel);
    if (stepIdx >= 0 && stepIdx < componentMap.components.length) {
      console.log("[ImageExplorer] Label mismatch, using positional match for step " + stepIdx +
        ': "' + targetStepLabel + '" → "' + (componentMap.components[stepIdx].label || "") + '"' +
        " (components: " + componentMap.components.length + ", steps: " + steps.length + ")");
      return componentMap.components[stepIdx];
    }

    return null;
  }

  function hitTestBox(pctX, pctY, comp) {
    return hitTestBoxTolerance(pctX, pctY, comp, CLICK_TOLERANCE);
  }

  function hitTestBoxTolerance(pctX, pctY, comp, tolerance) {
    var cx = comp.x - tolerance;
    var cy = comp.y - tolerance;
    var cw = comp.width + tolerance * 2;
    var ch = comp.height + tolerance * 2;
    return pctX >= cx && pctX <= cx + cw && pctY >= cy && pctY <= cy + ch;
  }

  function checkHit(pctX, pctY, targetStepLabel) {
    var hasMap = componentMap && componentMap.components && componentMap.components.length > 0;

    console.log("[ImageExplorer] checkHit: click=" + pctX.toFixed(1) + "," + pctY.toFixed(1) +
      " target='" + targetStepLabel + "' contentType=" + contentType + " hasMap=" + hasMap);

    // For PROCESS images: we dictated the exact grid layout, so use the computed
    // grid as the primary hit-detection method. AI-generated component maps have
    // unreliable bounding boxes for grid images.
    if (contentType === "process") {
      var gridResult = fallbackGridHit(pctX, pctY, targetStepLabel);
      if (gridResult) {
        console.log("[ImageExplorer]   ✓ GRID HIT for process step '" + targetStepLabel + "'");
      } else {
        // Log which grid cell was actually clicked for diagnosis
        var clickedIdx = -1;
        for (var g = 0; g < steps.length; g++) {
          var cell = getGridCell(g);
          if (pctX >= cell.x - CLICK_TOLERANCE && pctX <= cell.x + cell.width + CLICK_TOLERANCE &&
              pctY >= cell.y - CLICK_TOLERANCE && pctY <= cell.y + cell.height + CLICK_TOLERANCE) {
            clickedIdx = g;
            break;
          }
        }
        if (clickedIdx >= 0) {
          console.log("[ImageExplorer]   ✗ GRID: clicked step " + clickedIdx +
            " ('" + steps[clickedIdx] + "') instead of '" + targetStepLabel + "'");
        } else {
          console.log("[ImageExplorer]   ✗ GRID: click outside all cells");
        }
      }
      return gridResult;
    }

    // For ITEMS images: the layout is organic/scattered, so the AI component map
    // is our best source of truth for bounding boxes.
    if (!hasMap) {
      console.warn("[ImageExplorer] No component map for items image — using grid fallback");
      return fallbackGridHit(pctX, pctY, targetStepLabel);
    }

    var targetComp = findComponentByLabel(targetStepLabel);
    if (targetComp) {
      console.log("[ImageExplorer]   target box: '" + targetComp.label + "' at " +
        targetComp.x + "," + targetComp.y + " " + targetComp.width + "x" + targetComp.height);
    }

    // Items mode uses extra tolerance since AI bounding boxes are approximate
    var ITEMS_EXTRA = 4;
    if (targetComp && hitTestBoxTolerance(pctX, pctY, targetComp, CLICK_TOLERANCE + ITEMS_EXTRA)) {
      console.log("[ImageExplorer]   ✓ HIT target component (items mode)");
      return targetComp;
    }

    // Check if the click landed on a different component
    var clickedComp = null;
    for (var i = 0; i < componentMap.components.length; i++) {
      if (hitTestBoxTolerance(pctX, pctY, componentMap.components[i], CLICK_TOLERANCE + ITEMS_EXTRA)) {
        clickedComp = componentMap.components[i];
        break;
      }
    }

    // Nearest-component fallback: if click missed all boxes, find the closest
    // component center within a generous radius (items are scattered so the user
    // may click slightly outside a bounding box)
    if (!clickedComp && !targetComp) {
      var NEAREST_RADIUS = 20; // max percentage-point distance to snap
      var bestDist = NEAREST_RADIUS;
      var nearest = null;
      for (var n = 0; n < componentMap.components.length; n++) {
        var c = componentMap.components[n];
        var cx = c.x + c.width / 2;
        var cy = c.y + c.height / 2;
        var dx = pctX - cx;
        var dy = pctY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = c;
        }
      }
      if (nearest) {
        clickedComp = nearest;
        console.log("[ImageExplorer]   nearest snap (" + bestDist.toFixed(1) + "%) to '" + nearest.label + "'");
        // If the nearest component IS the target, count as a hit
        if (targetComp && nearest === targetComp) {
          console.log("[ImageExplorer]   ✓ NEAREST-SNAP HIT target (items mode)");
          return targetComp;
        }
      }
    }

    if (clickedComp) {
      // Check if the clicked component is actually the target (label matching)
      if (targetComp && clickedComp === targetComp) {
        console.log("[ImageExplorer]   ✓ HIT target component via items detection");
        return targetComp;
      }
      console.log("[ImageExplorer]   ✗ Clicked '" + clickedComp.label + "' instead of '" + targetStepLabel + "'");
    } else {
      console.log("[ImageExplorer]   ✗ Click in empty area (no component hit)");
    }

    return null;
  }

  function onCorrect(component) {
    correctCount++;
    attempts = 0;
    sfxCorrect();
    flashRegion(component, "rgba(0, 255, 100, 0.35)");
    spawnConfettiBurst(15);

    var stepIdx = quizOrder[currentQuizIndex];
    var progress = (currentQuizIndex + 1) + "/" + steps.length;
    sendQuizInfo(quizQuestion(steps[stepIdx]), "Correct!", "correct", progress, []);

    setTimeout(nextQuestion, 1200);
  }

  function onIncorrect() {
    sfxIncorrect();
    attempts++;
    var stepIdx = quizOrder[currentQuizIndex];
    var progress = (currentQuizIndex + 1) + "/" + steps.length;
    var actions = [];

    if (attempts >= 2) {
      actions.push("Skip");
      var targetStep = steps[quizOrder[currentQuizIndex]];
      var hint = findComponentForStep(targetStep);
      if (hint && attempts >= 3) {
        flashRegion(hint, "rgba(255, 220, 0, 0.25)");
      }
    }

    sendQuizInfo(quizQuestion(steps[stepIdx]), "Not quite! Try again.", "incorrect", progress, actions);
  }

  function findComponentForStep(stepLabel) {
    return findComponentByLabel(stepLabel);
  }

  // ── Region flash overlay ───────────────────────────────────────────
  function flashRegion(component, color) {
    var container = $("image-viewer");
    var imgEl = $("explore-image");
    var rect = container.getBoundingClientRect();
    var imgDisplayW = imgEl.naturalWidth * scale;
    var imgDisplayH = imgEl.naturalHeight * scale;
    var imgLeft = (rect.width - imgDisplayW) / 2 + panX;
    var imgTop = (rect.height - imgDisplayH) / 2 + panY;

    var overlay = document.createElement("div");
    overlay.className = "region-flash";
    overlay.style.left = (imgLeft + (component.x / 100) * imgDisplayW) + "px";
    overlay.style.top = (imgTop + (component.y / 100) * imgDisplayH) + "px";
    overlay.style.width = ((component.width / 100) * imgDisplayW) + "px";
    overlay.style.height = ((component.height / 100) * imgDisplayH) + "px";
    overlay.style.background = color;
    container.appendChild(overlay);

    setTimeout(function () { overlay.remove(); }, 1000);
  }

  // ── Confetti ───────────────────────────────────────────────────────
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
    var container = $("image-viewer");

    // ── Click (with pan guard) ───────────────────────────────────────
    var pointerDownPos = null;
    container.addEventListener("pointerdown", function (e) {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });
    container.addEventListener("pointerup", function (e) {
      if (!pointerDownPos) return;
      var dx = Math.abs(e.clientX - pointerDownPos.x);
      var dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx < 6 && dy < 6) {
        onImageClick(e);
      }
      pointerDownPos = null;
    });

    // ── Mouse drag to pan ────────────────────────────────────────────
    container.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      lastPanX = panX;
      lastPanY = panY;
      container.style.cursor = "grabbing";
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!isPanning) return;
      panX = lastPanX + (e.clientX - panStartX);
      panY = lastPanY + (e.clientY - panStartY);
      constrainPan();
      applyTransform();
    });
    window.addEventListener("mouseup", function () {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = "crosshair";
      }
    });

    // ── Mouse wheel zoom ─────────────────────────────────────────────
    container.addEventListener("wheel", function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(scale * delta);
    }, { passive: false });

    // ── Touch: pinch zoom + drag + tap detection ───────────────────
    var activeTouches = [];
    var touchStartPos = null;
    var touchStartTime = 0;
    var wasSingleTouch = false;

    container.addEventListener("touchstart", function (e) {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 1) {
        isPanning = true;
        panStartX = activeTouches[0].clientX;
        panStartY = activeTouches[0].clientY;
        lastPanX = panX;
        lastPanY = panY;
        touchStartPos = { x: activeTouches[0].clientX, y: activeTouches[0].clientY };
        touchStartTime = Date.now();
        wasSingleTouch = true;
      } else if (activeTouches.length === 2) {
        isPanning = false;
        wasSingleTouch = false;
        pinchStartDist = getTouchDist(activeTouches[0], activeTouches[1]);
        pinchStartScale = scale;
      }
      e.preventDefault();
    }, { passive: false });

    container.addEventListener("touchmove", function (e) {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 1 && isPanning) {
        panX = lastPanX + (activeTouches[0].clientX - panStartX);
        panY = lastPanY + (activeTouches[0].clientY - panStartY);
        constrainPan();
        applyTransform();
      } else if (activeTouches.length === 2) {
        var dist = getTouchDist(activeTouches[0], activeTouches[1]);
        setZoom(pinchStartScale * (dist / pinchStartDist));
      }
      e.preventDefault();
    }, { passive: false });

    container.addEventListener("touchend", function (e) {
      var ended = e.changedTouches[0];
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 0) isPanning = false;

      if (wasSingleTouch && touchStartPos && ended) {
        var dx = Math.abs(ended.clientX - touchStartPos.x);
        var dy = Math.abs(ended.clientY - touchStartPos.y);
        var dt = Date.now() - touchStartTime;
        if (dx < 10 && dy < 10 && dt < 500) {
          console.log("[ImageExplorer] Touch tap detected at", ended.clientX, ended.clientY);
          onImageClick({ clientX: ended.clientX, clientY: ended.clientY });
        }
      }
      touchStartPos = null;
      wasSingleTouch = false;
    });

    // Recalculate fit zoom on resize
    window.addEventListener("resize", function () {
      if ($("explore-image") && $("explore-image").naturalWidth) {
        var oldFit = fitZoom;
        var container = $("image-viewer");
        var imgEl = $("explore-image");
        var cw = container.clientWidth;
        var ch = container.clientHeight;
        fitZoom = Math.min(cw / imgEl.naturalWidth, ch / imgEl.naturalHeight);
        if (scale < fitZoom) scale = fitZoom;
        constrainPan();
        applyTransform();
      }
    });
  }

  function getTouchDist(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Utility ────────────────────────────────────────────────────────
  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function shakeElement(el) {
    el.classList.add("shake");
    setTimeout(function () { el.classList.remove("shake"); }, 500);
  }

  // ── Boot ───────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 10);
  }
})();
