// Image with Questions Interaction
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

    var isPreview = config.isPreview === true;
    var personalisation = config.personalisation !== false;

    if (isPreview) {
      console.log("[IWQ] Preview mode — using placeholder image");
      hide($("intro-section"));
      hide($("input-section"));
      hide($("loading-section"));
      loadImageAndStartQuiz(generatePreviewPlaceholder());
    } else if (isTestMode) {
      if (!personalisation) {
        hide($("intro-section"));
        show($("loading-section"));
        $("loading-text").textContent = "Checking for existing image...";
        tryUseCachedImage(function (found) {
          if (found) return;
          show($("input-section")); hide($("loading-section"));
          $("movie-input").focus();
        });
      } else {
        $("intro-start-btn").addEventListener("click", function () {
          hide($("intro-section"));
          show($("input-section"));
          $("movie-input").focus();
        });
        show($("intro-section"));
        hide($("input-section"));
      }
    } else {
      $("intro-start-btn").addEventListener("click", function () {
        hide($("intro-section"));
        generateFromPersonalisation();
      });
      show($("intro-section"));
      hide($("input-section"));
    }

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

  function contentFingerprint() {
    var str = (imageDescription || "") + "|" + questions.map(function (q) { return q.question || ""; }).join(",");
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getCacheLabel() {
    return quizTitle.toLowerCase().replace(/\s+/g, "-") + "-" + contentFingerprint();
  }

  function runPersonalisationPipeline() {
    var interactionLabel = getCacheLabel();

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
      : "The painting is an atmospheric, educational scene related to the topic: '" + quizTitle + "'. " +
        "The scene should be visually engaging, thematic, and evocative of the subject matter. ";

    var prompt =
      "IMPORTANT: This image is purely decorative — it must contain NO text, labels, captions, or numbers. " +
      "Create a single wide panoramic landscape painted illustration inspired by the visual style and aesthetic of '" +
      styleName + "'. Use a similar color palette, art style, and character design sensibility. " +
      sceneDesc +
      "Dark backgrounds (#0f0f23 or near-black) blend with the dark UI. " +
      "FRAMING: Full-bleed artwork — the painting touches all four edges of the canvas. " +
      "ASPECT RATIO: This is a 16:9 widescreen landscape image. Compose the scene to work well in widescreen format.";

    var customDesc = imageDescription
      ? "Illustration of: " + imageDescription.substring(0, 120)
      : "Widescreen landscape illustration for topic '" + quizTitle + "'";

    return {
      prompt: prompt,
      userInput: styleName,
      customInstructions: customDesc +
        ". Single scene — ONE cohesive illustration, NOT a grid or collage of separate images." +
        " 16:9 widescreen landscape. Full-bleed artwork that fills the ENTIRE canvas edge-to-edge." +
        " ZERO margins, ZERO padding, ZERO borders, ZERO white space on any side." +
        " If any background is needed it MUST be very dark (#0f0f23 or near-black) — NEVER white or light." +
        " Zero text/labels.",
      dictionaryLabels: [getCacheLabel()],
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

      html += '<div class="slider-avg-row"><span class="slider-avg-question">' + escapeHtml(sa.question) + '</span></div>';
      html += '<div class="slider-detail-grid">';
      html += '<div class="slider-detail-item"><span class="slider-detail-label">Your answer</span><span class="slider-detail-value">' + sa.value + unitStr + '</span></div>';
      if (sa.correct != null) {
        html += '<div class="slider-detail-item"><span class="slider-detail-label">Correct answer</span><span class="slider-detail-value correct-val">' + sa.correct + unitStr + '</span></div>';
      }
      if (averagesMap && averagesMap[sa.questionIndex] != null) {
        var info = averagesMap[sa.questionIndex];
        html += '<div class="slider-detail-item"><span class="slider-detail-label">Average Answer <small>(' + info.count + ')</small></span><span class="slider-detail-value avg-val">' + info.avg + unitStr + '</span></div>';
      }
      html += '</div>';
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
