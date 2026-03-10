// Storyteller Scene — Visual Novel PixiJS Interaction
// Renders: AI-generated scene background, character portraits, narrative text,
// choice buttons, clickable scene objects (component map), and character chat triggers.
// Part of the Storyteller adventure framework.

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
  //  SECTION 2: IFRAME AI SDK (with adventure extensions)
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
      startBgMusic: function (st) { sendMessage("ai-sdk-start-bg-music", { style: st || "ambient" }); },
      stopBgMusic: function () { sendMessage("ai-sdk-stop-bg-music", {}); },
      setAudioVolume: function (ch, lv) { sendMessage("ai-sdk-set-audio-volume", { channel: ch, level: lv }); },
      navigateToSubstage: function (sid, ssid) { sendMessage("ai-sdk-navigate-to-substage", { stageId: sid, substageId: ssid }); },
      getLessonStructure: function (cb) { sendMessage("ai-sdk-get-lesson-structure", {}, function (r) { if (cb) cb(r.structure); }); },
      setSharedData: function (k, v, cb) { sendMessage("ai-sdk-set-shared-data", { key: k, value: v }, function () { if (cb) cb(); }); },
      getSharedData: function (k, cb) { sendMessage("ai-sdk-get-shared-data", { key: k }, function (r) { if (cb) cb(r.value); }); },
      getAllSharedData: function (cb) { sendMessage("ai-sdk-get-all-shared-data", {}, function (r) { if (cb) cb(r.data); }); },
      getPrefetchResult: function (k, cb) { sendMessage("ai-sdk-get-prefetch-result", { key: k }, function (r) { if (cb) cb({ result: r.result, status: r.status, error: r.error }); }); },
      saveInstanceData: function (d, cb) { sendMessage("ai-sdk-save-instance-data", { data: d }, function (r) { if (cb) cb(r.success, r.error); }); },
      getInstanceDataHistory: function (f, cb) { sendMessage("ai-sdk-get-instance-data-history", { filters: f || {} }, function (r) { if (cb) cb(r.data, r.error); }); },
      markCompleted: function (cb) { sendMessage("ai-sdk-mark-completed", {}, function (r) { if (cb) cb(r.progress, r.error); }); },
      incrementAttempts: function (cb) { sendMessage("ai-sdk-increment-attempts", {}, function (r) { if (cb) cb(r.progress, r.error); }); },
      // Adventure extensions
      switchInteraction: function (id, extra, cb) { sendMessage("ai-sdk-switch-interaction", { interactionId: id, extraConfig: extra || {} }, function (r) { if (cb) cb(r); }); },
      setTeacherPersona: function (persona, cb) { sendMessage("ai-sdk-set-teacher-persona", { persona: persona }, function (r) { if (cb) cb(r); }); },
      clearTeacherPersona: function (cb) { sendMessage("ai-sdk-clear-teacher-persona", {}, function (r) { if (cb) cb(r); }); },
    };
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 3: STATE
  // ═══════════════════════════════════════════════════════════════════════
  var aiSDK = null;
  var config = {};
  var title = "Adventure";
  var imageDescription = "";
  var bgMusicStyle = "ambient";
  var bgMusicVolume = 0.04;
  var isPreview = false;
  var isTestMode = true;
  var personalisation = true;

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
  var W = 0, H = 0, cx = 0, cy = 0;
  var gameLayer = null;
  var uiLayer = null;

  // Adventure state
  var adventureConfig = null;
  var sceneData = null;
  var narrativeIndex = 0;
  var narrativeParagraphs = [];
  var choicesVisible = false;
  var hotspots = [];
  var characterSprites = {};
  var textBoxEl = null;
  var speakerEl = null;
  var choiceContainerEl = null;
  var typingTimer = null;

  // Onboarding personalisation data
  var onboardingData = { artStyle: "", setting: "", playerName: "", interest: "" };

  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 3B: DEFAULT SCENE CONTENT
  // ═══════════════════════════════════════════════════════════════════════
  var DEFAULT_SCENES = {
    renaissance: {
      title: "The Master's Workshop",
      imageDescription: "A dimly lit Renaissance workshop in Florence. Wooden tables covered in anatomical sketches and geometric diagrams. A large canvas on an easel shows a half-finished portrait with visible perspective lines. Candles cast warm golden light. An arched stone doorway reveals a moonlit courtyard with cypress trees. Scientific instruments and a human skull sit on a shelf.",
      narrative: "You push open the heavy oak door and step into a world that smells of linseed oil and pine shavings. Candles flicker on every surface, casting dancing shadows across half-finished inventions and scattered sketches.\n\nA figure hunched over a large anatomical drawing looks up. His long grey beard catches the candlelight as he rises, eyes bright with curiosity.\n\nLeonardo: \"Ah, a visitor! At last, someone with fresh eyes. Come closer \u2014 I have been studying something remarkable. Do you see this painting on my easel? Notice how every line seems to converge on a single point in the distance. This is no accident.\"\n\nHe gestures expansively around the cluttered workshop, his enthusiasm infectious.\n\nLeonardo: \"The secret of depth on a flat surface \u2014 perspettiva. The ancient Greeks knew it, but we are only now truly mastering it. Tell me, what catches your eye first?\"",
      adventureConfig: {
        title: "Renaissance Discovery",
        setting: "Florence, 1503",
        tone: "warm, curious, educational",
        contentConstraintLevel: "moderate",
        characters: [
          { id: "player", name: "You", role: "player" },
          { id: "davinci", name: "Leonardo da Vinci", description: "Renaissance polymath, warm, intellectually curious, speaks with Italian flourishes", systemPrompt: "You are Leonardo da Vinci in your Florence workshop in 1503. You are warm, curious, and encouraging. You love connecting art to mathematics and science. Use occasional Italian words. Keep responses educational but engaging. You are speaking to a young student who has come to learn.", greeting: "Ah, benvenuto! What draws your eye in my workshop?", knowledgeConstraints: ["geometry", "perspective", "Renaissance art", "anatomy", "engineering", "mathematics"] }
        ],
        learningObjectives: ["Understand vanishing point perspective", "Learn how Renaissance artists used geometry", "Discover the connection between art and mathematics"]
      },
      choices: [
        { id: "examine-painting", label: "Examine the half-finished painting on the easel", leadsTo: null },
        { id: "pick-up-notebook", label: "Pick up the leather notebook filled with mirror writing", leadsTo: null },
        { id: "ask-about-skull", label: "Ask about the human skull on the shelf", leadsTo: null },
        { id: "talk-to-leonardo", label: "Ask Leonardo about his latest invention", leadsTo: null }
      ],
      clickableObjects: [
        { label: "painting on easel", action: "inspect", eventData: { description: "A half-finished portrait with clearly visible perspective lines converging to a vanishing point. The mathematical precision is breathtaking." } },
        { label: "leather notebook", action: "inspect", eventData: { description: "Pages of mirror writing \u2014 Leonardo's famous backwards script. The pages contain diagrams of flying machines and anatomical studies." } },
        { label: "human skull", action: "inspect", eventData: { description: "An anatomical study aid. Leonardo believed understanding the structure beneath was essential to painting lifelike portraits." } },
        { label: "Leonardo da Vinci", action: "chat", characterId: "davinci", chatOpener: "Ah, you wish to speak? Excellent! I find the best ideas come from conversation. What would you like to know?" }
      ]
    },
    space: {
      title: "The Observation Deck",
      imageDescription: "The observation deck of a space station orbiting a gas giant planet. Floor-to-ceiling windows show swirling clouds of purple and gold. Holographic star charts float in the air. A navigation console glows with blue light. Another crew member in a silver flight suit stands near the window, pointing at something in the clouds below.",
      narrative: "The airlock hisses as it seals behind you. You step onto the observation deck and your breath catches \u2014 through the panoramic windows, a massive gas giant fills the view, its atmosphere swirling in bands of deep purple and molten gold.\n\nCommander Aria Chen turns from the navigation console, her silver flight suit reflecting the planet's glow. Her expression is serious but not unkind.\n\nAria: \"Good, you're here. We've detected something unusual in the upper atmosphere \u2014 a pattern in the cloud formations that shouldn't exist naturally. The computer flagged it as potentially artificial.\"\n\nShe pulls up a holographic display showing the planet's atmospheric data. Numbers and graphs spiral in the air between you.\n\nAria: \"Before we investigate further, I need you to understand the science. These gas layers follow specific rules of density and pressure. If this pattern truly is artificial, whatever created it would need to understand those rules too. Take a look around \u2014 what would you like to examine first?\"",
      adventureConfig: {
        title: "Kepler Station Mystery",
        setting: "Kepler Station, orbiting gas giant Aurelius-7",
        tone: "wonder, scientific curiosity, slight mystery",
        contentConstraintLevel: "moderate",
        characters: [
          { id: "player", name: "You", role: "player" },
          { id: "aria", name: "Commander Aria Chen", description: "Calm, brilliant astrophysicist and station commander. Encourages scientific thinking.", systemPrompt: "You are Commander Aria Chen aboard Kepler Station. You are a calm, brilliant astrophysicist who loves teaching through questions. Guide the student to think scientifically about atmospheric science, gas properties, and density.", greeting: "Welcome to Kepler Station. The universe has a puzzle for us today.", knowledgeConstraints: ["atmospheric science", "gas properties", "density", "pressure", "planetary science", "physics"] }
        ],
        learningObjectives: ["Understand gas density and pressure", "Learn about atmospheric layers", "Apply scientific observation skills"]
      },
      choices: [
        { id: "examine-clouds", label: "Study the anomalous cloud pattern through the telescope", leadsTo: null },
        { id: "check-data", label: "Review the atmospheric pressure readings on the console", leadsTo: null },
        { id: "ask-aria", label: "Ask Commander Chen what she thinks caused the pattern", leadsTo: null },
        { id: "run-simulation", label: "Run a density simulation on the holographic display", leadsTo: null }
      ],
      clickableObjects: [
        { label: "holographic star chart", action: "inspect", eventData: { description: "A 3D map of the local star system. Aurelius-7 is the fifth planet from its sun \u2014 a gas giant 3x the mass of Jupiter with an unusually active atmosphere." } },
        { label: "navigation console", action: "inspect", eventData: { description: "Atmospheric readings show temperature, pressure, and composition at different altitudes. The anomaly appears at the boundary between the hydrogen and helium layers." } },
        { label: "Commander Aria Chen", action: "chat", characterId: "aria", chatOpener: "You want to discuss the anomaly? Good \u2014 science starts with questions. What's on your mind?" }
      ]
    },
    medieval: {
      title: "The Alchemist's Tower",
      imageDescription: "The interior of a medieval stone tower converted into an alchemist's laboratory. Shelves of glass bottles containing colourful liquids line the curved walls. A large wooden table holds a brass balance scale, mortar and pestle, and an open leather-bound book of symbols. A bubbling cauldron hangs over a small fire. Through a narrow window, a medieval village is visible below at sunset.",
      narrative: "The spiral staircase creaks with each step as you climb the old stone tower. At the top, a round room opens before you, filled with the sharp scent of sulphur and dried herbs.\n\nEvery surface is covered with the tools of a curious mind \u2014 glass vessels of every shape, powders in clay jars, and charts covered in strange symbols that look almost like mathematics.\n\nMagister Elara looks up from a bubbling flask, her silver-streaked hair escaping from beneath a simple cap. She adjusts her spectacles and smiles.\n\nElara: \"Ah, my new apprentice arrives! Don't worry about the smell \u2014 that's just the sulphur. I was testing something. You see, everything in this world is made of combinations of simpler things. The ancients called them elements.\"\n\nShe gestures to the brass balance scale on the table.\n\nElara: \"Today's lesson begins with a simple truth: matter cannot appear from nothing, nor vanish into nothing. What goes in must come out, perhaps changed, but always equal in weight. Shall we prove it?\"",
      adventureConfig: {
        title: "The Alchemist's Secret",
        setting: "Medieval European university town, 1350",
        tone: "mysterious, encouraging, discovery",
        contentConstraintLevel: "moderate",
        characters: [
          { id: "player", name: "You", role: "player" },
          { id: "elara", name: "Magister Elara", description: "A proto-chemist who bridges alchemy and early science. Patient, encouraging, slightly mysterious.", systemPrompt: "You are Magister Elara, a medieval alchemist who is secretly a proto-chemist. You teach through experiments and discovery. Guide the student toward understanding conservation of mass, elements, and chemical reactions using medieval language and metaphors.", greeting: "Welcome to my laboratory, young apprentice. Today we explore the secrets hidden in ordinary matter.", knowledgeConstraints: ["conservation of mass", "elements", "chemical reactions", "states of matter", "measurement"] }
        ],
        learningObjectives: ["Understand conservation of mass", "Learn about elements and compounds", "Practice measurement and observation"]
      },
      choices: [
        { id: "use-scale", label: "Weigh the ingredients on the brass balance scale", leadsTo: null },
        { id: "read-book", label: "Read the open page of the leather-bound book", leadsTo: null },
        { id: "examine-bottles", label: "Examine the colourful liquids on the shelves", leadsTo: null },
        { id: "talk-to-elara", label: "Ask Magister Elara about the bubbling cauldron", leadsTo: null }
      ],
      clickableObjects: [
        { label: "brass balance scale", action: "inspect", eventData: { description: "A precise brass balance scale with two pans. Several small iron weights sit nearby, marked with symbols. This is the alchemist's most important tool." } },
        { label: "leather-bound book", action: "inspect", eventData: { description: "The page shows symbols for different substances \u2014 a circle with a dot for gold, a crescent for silver, and a triangle for fire. Notes in the margins translate some to modern terms." } },
        { label: "bubbling cauldron", action: "inspect", eventData: { description: "A mixture of water and dissolved salt is gently boiling. Steam rises and condenses on a cool glass plate above \u2014 the water collects, but the salt stays behind. A separation!" } },
        { label: "Magister Elara", action: "chat", characterId: "elara", chatOpener: "You wish to learn? Then let us begin with a question \u2014 what happens when fire meets ice?" }
      ]
    }
  };

  function getDefaultSceneForSetting(setting) {
    var key = (setting || "").toLowerCase();
    if (key.indexOf("space") !== -1 || key.indexOf("sci") !== -1 || key.indexOf("future") !== -1) return DEFAULT_SCENES.space;
    if (key.indexOf("medieval") !== -1 || key.indexOf("fantasy") !== -1 || key.indexOf("magic") !== -1 || key.indexOf("alchem") !== -1) return DEFAULT_SCENES.medieval;
    return DEFAULT_SCENES.renaissance;
  }

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
    document.body.style.cssText = "overflow:hidden!important;position:fixed!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;touch-action:none!important;background:#0a0a1a;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;";
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

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 5: INIT & CONFIG
  // ═══════════════════════════════════════════════════════════════════════
  function initGame() {
    console.log("[Storyteller] initGame");
    lockViewport();
    aiSDK = createIframeAISDK();
    config = window.interactionConfig || {};
    var data = window.interactionData || {};

    title = config.title || data.title || "Adventure";
    imageDescription = config.imageDescription || data.imageDescription || "";
    isTestMode = config.testMode !== false;
    isPreview = config.isPreview === true;
    personalisation = config.personalisation !== false;
    bgMusicStyle = config.bgMusicStyle || "ambient";
    bgMusicVolume = config.bgMusicVolume != null ? config.bgMusicVolume : 0.04;

    adventureConfig = config.adventureConfig || data.adventureConfig || null;

    console.log("[Storyteller] Config:", { title: title, testMode: isTestMode, isPreview: isPreview, hasAdventureConfig: !!adventureConfig });
    aiSDK.setInteractionInfo("Storyteller: " + title);

    aiSDK.getSharedData("__poolInteractionConfig", function (poolConfig) {
      if (poolConfig) {
        sceneData = poolConfig.sceneData || poolConfig;
        console.log("[Storyteller] Loaded scene data from pool config");
      }

      if (isPreview) {
        startPixiGame(generatePreviewPlaceholder());
        return;
      }

      if (sceneData && sceneData.imageUrl) {
        startPixiGame(sceneData.imageUrl);
      } else if (sceneData && sceneData.narrative) {
        show($("loading-section"));
        hide($("input-section"));
        $("loading-text").textContent = "Setting the scene...";
        generateSceneImage();
      } else if (isTestMode) {
        showOnboardingWizard();
      } else if (imageDescription) {
        show($("loading-section"));
        hide($("input-section"));
        $("loading-text").textContent = "Setting the scene...";
        generateSceneImage();
      } else {
        applyDefaultScene("renaissance");
        show($("loading-section"));
        hide($("input-section"));
        $("loading-text").textContent = "Setting the scene...";
        generateSceneImage();
      }

      reportNoOverflow();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 5B: ONBOARDING WIZARD (Test Mode)
  // ═══════════════════════════════════════════════════════════════════════
  var onboardingStep = 0;
  var onboardingOverlay = null;

  var ONBOARDING_STEPS = [
    {
      title: "Welcome to Storyteller",
      subtitle: "Let's personalise your adventure",
      type: "info",
      body: "You're about to enter an interactive story where you'll explore, make choices, talk to characters, and learn by doing.\n\nFirst, let's set a few things up so the experience is tailored to you.",
      buttonText: "Let's go"
    },
    {
      title: "Choose Your Art Style",
      subtitle: "How should your adventure look?",
      type: "grid",
      key: "artStyle",
      options: [
        { value: "Studio Ghibli", label: "Studio Ghibli", desc: "Warm, painterly, magical" },
        { value: "Pixar", label: "Pixar / Disney", desc: "Bright, polished, animated" },
        { value: "Moebius", label: "Moebius / Sci-fi", desc: "Surreal linework, cosmic" },
        { value: "Romantic Oil Painting", label: "Classical Oil", desc: "Rich, dramatic, Rembrandt" },
        { value: "Ukiyo-e Woodblock", label: "Ukiyo-e", desc: "Japanese woodblock, elegant" },
        { value: "Watercolour Storybook", label: "Watercolour", desc: "Soft, dreamy, hand-painted" }
      ]
    },
    {
      title: "Pick a Setting",
      subtitle: "Where does your story take place?",
      type: "grid",
      key: "setting",
      options: [
        { value: "Renaissance Workshop", label: "Renaissance Workshop", desc: "Florence, 1503 \u2014 art meets science" },
        { value: "Space Station", label: "Space Station", desc: "Orbiting a gas giant, year 2340" },
        { value: "Medieval Alchemist Tower", label: "Alchemist's Tower", desc: "A medieval lab of discovery" }
      ]
    },
    {
      title: "Your Character",
      subtitle: "What should we call you?",
      type: "text-input",
      key: "playerName",
      placeholder: "Enter your name (or leave blank for 'You')",
      buttonText: "Continue"
    },
    {
      title: "Your Interests",
      subtitle: "What topics fascinate you?",
      type: "multi-select",
      key: "interest",
      options: [
        { value: "art", label: "Art & Design" },
        { value: "science", label: "Science" },
        { value: "maths", label: "Mathematics" },
        { value: "history", label: "History" },
        { value: "engineering", label: "Engineering" },
        { value: "nature", label: "Nature" },
        { value: "space", label: "Space & Astronomy" },
        { value: "music", label: "Music" }
      ],
      buttonText: "Start Adventure"
    }
  ];

  function showOnboardingWizard() {
    hide($("loading-section"));
    hide($("input-section"));

    onboardingOverlay = document.createElement("div");
    onboardingOverlay.id = "onboarding-overlay";
    onboardingOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0a1a 0%,#1a1040 50%,#0d1b2a 100%);display:flex;align-items:center;justify-content:center;z-index:200;overflow-y:auto;padding:20px;box-sizing:border-box;";
    document.body.appendChild(onboardingOverlay);

    renderOnboardingStep();
  }

  function renderOnboardingStep() {
    if (!onboardingOverlay) return;
    var step = ONBOARDING_STEPS[onboardingStep];
    if (!step) { finishOnboarding(); return; }

    var card = document.createElement("div");
    card.style.cssText = "background:rgba(15,20,50,0.9);border:1px solid rgba(0,212,255,0.2);border-radius:20px;padding:32px 28px;max-width:480px;width:100%;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;backdrop-filter:blur(10px);animation:fadeInUp 0.35s ease;";

    // Progress dots
    var dots = document.createElement("div");
    dots.style.cssText = "display:flex;justify-content:center;gap:8px;margin-bottom:20px;";
    for (var d = 0; d < ONBOARDING_STEPS.length; d++) {
      var dot = document.createElement("div");
      dot.style.cssText = "width:8px;height:8px;border-radius:50%;transition:all 0.3s;" + (d === onboardingStep ? "background:#00d4ff;box-shadow:0 0 8px rgba(0,212,255,0.5);" : d < onboardingStep ? "background:rgba(0,212,255,0.5);" : "background:rgba(255,255,255,0.15);");
      dots.appendChild(dot);
    }
    card.appendChild(dots);

    // Title
    var h = document.createElement("h2");
    h.style.cssText = "margin:0 0 6px;font-size:22px;color:#fff;text-align:center;font-weight:700;";
    h.textContent = step.title;
    card.appendChild(h);

    var sub = document.createElement("p");
    sub.style.cssText = "margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;";
    sub.textContent = step.subtitle;
    card.appendChild(sub);

    if (step.type === "info") {
      var bodyP = document.createElement("p");
      bodyP.style.cssText = "color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;white-space:pre-line;text-align:center;";
      bodyP.textContent = step.body;
      card.appendChild(bodyP);
      var btn = createWizardButton(step.buttonText || "Next", function () { onboardingStep++; renderOnboardingStep(); });
      card.appendChild(btn);
    }
    else if (step.type === "grid") {
      var grid = document.createElement("div");
      var cols = step.options.length > 4 ? 3 : step.options.length > 2 ? 3 : 2;
      grid.style.cssText = "display:grid;grid-template-columns:repeat(" + cols + ",1fr);gap:10px;margin-bottom:20px;";
      for (var i = 0; i < step.options.length; i++) {
        (function (opt) {
          var tile = document.createElement("button");
          tile.style.cssText = "padding:14px 10px;border-radius:12px;border:1px solid rgba(0,212,255,0.25);background:rgba(0,212,255,0.05);color:#e8e8f0;font-size:13px;cursor:pointer;transition:all 0.2s;text-align:center;font-family:'Segoe UI',system-ui,sans-serif;";
          tile.innerHTML = '<div style="font-weight:600;margin-bottom:3px;">' + opt.label + '</div>' + (opt.desc ? '<div style="font-size:11px;color:rgba(255,255,255,0.45);">' + opt.desc + '</div>' : '');
          tile.onmouseenter = function () { tile.style.borderColor = "#00d4ff"; tile.style.background = "rgba(0,212,255,0.15)"; tile.style.transform = "translateY(-2px)"; };
          tile.onmouseleave = function () { tile.style.borderColor = "rgba(0,212,255,0.25)"; tile.style.background = "rgba(0,212,255,0.05)"; tile.style.transform = ""; };
          tile.addEventListener("click", function () {
            onboardingData[step.key] = opt.value;
            onboardingStep++;
            renderOnboardingStep();
          });
          grid.appendChild(tile);
        })(step.options[i]);
      }
      card.appendChild(grid);
    }
    else if (step.type === "text-input") {
      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = step.placeholder || "";
      input.style.cssText = "width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(0,212,255,0.3);background:rgba(255,255,255,0.05);color:#fff;font-size:15px;text-align:center;outline:none;margin-bottom:20px;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif;";
      input.addEventListener("focus", function () { input.style.borderColor = "#00d4ff"; });
      input.addEventListener("blur", function () { input.style.borderColor = "rgba(0,212,255,0.3)"; });
      card.appendChild(input);
      var btn = createWizardButton(step.buttonText || "Next", function () {
        onboardingData[step.key] = input.value.trim() || "";
        onboardingStep++;
        renderOnboardingStep();
      });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { onboardingData[step.key] = input.value.trim() || ""; onboardingStep++; renderOnboardingStep(); } });
      card.appendChild(btn);
    }
    else if (step.type === "multi-select") {
      var selected = {};
      var selGrid = document.createElement("div");
      selGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px;";
      for (var j = 0; j < step.options.length; j++) {
        (function (opt) {
          var chip = document.createElement("button");
          chip.style.cssText = "padding:8px 16px;border-radius:20px;border:1px solid rgba(0,212,255,0.3);background:rgba(0,212,255,0.05);color:#ccc;font-size:13px;cursor:pointer;transition:all 0.2s;font-family:'Segoe UI',system-ui,sans-serif;";
          chip.textContent = opt.label;
          chip.addEventListener("click", function () {
            selected[opt.value] = !selected[opt.value];
            if (selected[opt.value]) {
              chip.style.background = "rgba(0,212,255,0.25)";
              chip.style.borderColor = "#00d4ff";
              chip.style.color = "#fff";
            } else {
              chip.style.background = "rgba(0,212,255,0.05)";
              chip.style.borderColor = "rgba(0,212,255,0.3)";
              chip.style.color = "#ccc";
            }
          });
          selGrid.appendChild(chip);
        })(step.options[j]);
      }
      card.appendChild(selGrid);
      var btn = createWizardButton(step.buttonText || "Next", function () {
        var vals = [];
        for (var k in selected) { if (selected[k]) vals.push(k); }
        onboardingData[step.key] = vals.join(", ");
        onboardingStep++;
        renderOnboardingStep();
      });
      card.appendChild(btn);
    }

    onboardingOverlay.innerHTML = "";
    onboardingOverlay.appendChild(card);

    // Inject animation keyframes once
    if (!document.getElementById("onboard-anims")) {
      var styleEl = document.createElement("style");
      styleEl.id = "onboard-anims";
      styleEl.textContent = "@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}";
      document.head.appendChild(styleEl);
    }
  }

  function createWizardButton(label, onClick) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = "display:block;width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s;font-family:'Segoe UI',system-ui,sans-serif;";
    btn.onmouseenter = function () { btn.style.opacity = "0.85"; };
    btn.onmouseleave = function () { btn.style.opacity = "1"; };
    btn.addEventListener("click", onClick);
    return btn;
  }

  function applyDefaultScene(settingKey) {
    var scene = getDefaultSceneForSetting(settingKey);
    title = scene.title;
    imageDescription = scene.imageDescription;
    adventureConfig = scene.adventureConfig;
    sceneData = {
      narrative: scene.narrative,
      choices: scene.choices,
      clickableObjects: scene.clickableObjects
    };
  }

  function finishOnboarding() {
    console.log("[Storyteller] Onboarding complete:", onboardingData);

    // Apply default scene based on chosen setting
    applyDefaultScene(onboardingData.setting);

    // Personalise the player name in adventure config
    if (onboardingData.playerName) {
      if (adventureConfig && adventureConfig.characters) {
        for (var i = 0; i < adventureConfig.characters.length; i++) {
          if (adventureConfig.characters[i].role === "player") {
            adventureConfig.characters[i].name = onboardingData.playerName;
          }
        }
      }
    }

    // Inject art style into image description
    if (onboardingData.artStyle) {
      imageDescription = "In the visual style of " + onboardingData.artStyle + ": " + imageDescription;
    }

    // Store personalisation in shared data for downstream interactions
    aiSDK.setSharedData("__storytellerPersonalisation", onboardingData);

    // Remove overlay and start scene generation
    if (onboardingOverlay) { onboardingOverlay.remove(); onboardingOverlay = null; }
    show($("loading-section"));
    $("loading-text").textContent = "Creating your " + (onboardingData.artStyle || "adventure") + " scene...";
    generateSceneImage();
  }

  function generatePreviewPlaceholder() {
    var c = document.createElement("canvas");
    c.width = 800; c.height = 600;
    var ctx = c.getContext("2d");
    var grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0, "#1a0533"); grad.addColorStop(0.5, "#2d1b69"); grad.addColorStop(1, "#0d1b2a");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px 'Segoe UI',system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(100,50,200,0.8)"; ctx.shadowBlur = 20;
    ctx.fillText("Storyteller Scene", 400, 270);
    ctx.font = "20px 'Segoe UI',system-ui,sans-serif"; ctx.shadowBlur = 10;
    ctx.fillText("Visual Novel Adventure", 400, 320);
    return c.toDataURL("image/png");
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 6: IMAGE GENERATION
  // ═══════════════════════════════════════════════════════════════════════
  function contentFingerprint() {
    var str = (imageDescription || "") + "|" + title;
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; }
    return Math.abs(hash).toString(36);
  }

  function getCacheLabel() {
    return "storyteller-" + title.toLowerCase().replace(/\s+/g, "-") + "-" + contentFingerprint();
  }

  function generateSceneImage() {
    var desc = imageDescription || "A dramatic scene for: " + title;
    var prompt =
      "IMPORTANT: NO text, labels, captions or numbers anywhere in the image. " +
      "Create an atmospheric, cinematic scene: " + desc + ". " +
      "Rich colours, dramatic lighting. Dark backgrounds blend with UI. " +
      "FRAMING: Full-bleed artwork. 16:9 aspect ratio.";

    var componentPrompt = "";
    if (sceneData && sceneData.clickableObjects && sceneData.clickableObjects.length > 0) {
      componentPrompt = sceneData.clickableObjects.map(function (o) { return o.label; }).join(", ");
    }

    aiSDK.generateImage({
      prompt: prompt,
      customInstructions: "Cinematic scene. 16:9 aspect ratio. Full-bleed. Zero text. No UI elements.",
      dictionaryLabels: [getCacheLabel()],
      width: 1280, height: 720,
      dualViewport: true,
      mobileWidth: 720, mobileHeight: 1280,
      testMode: isTestMode,
      includeComponentMap: componentPrompt.length > 0,
      componentPromptContent: componentPrompt || undefined,
    }, function (response) {
      if (!response.success) {
        $("loading-text").textContent = "Scene generation failed. Starting without background...";
        setTimeout(function () { startPixiGame(null); }, 1000);
        return;
      }
      desktopImageUrl = response.imageUrl || response.imageData;
      mobileImageUrl = response.mobileVariant ? response.mobileVariant.imageUrl : null;

      if (response.componentMap && sceneData) {
        sceneData._componentMap = response.componentMap;
      }

      startPixiGame(pickImageUrl());
    });
  }

  function pickImageUrl() {
    return (parentIsMobile && mobileImageUrl) ? mobileImageUrl : desktopImageUrl;
  }

  function onTestGenerate() {
    var movie = $("movie-input").value.trim();
    if (!movie) { $("movie-input").style.animation = "shake 0.3s"; setTimeout(function () { $("movie-input").style.animation = ""; }, 350); return; }
    hide($("input-section"));
    show($("loading-section"));
    applyDefaultScene("renaissance");
    imageDescription = "In the visual style of " + movie + ": " + imageDescription;
    $("loading-text").textContent = "Creating scene in the style of " + movie + "...";
    generateSceneImage();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 7: PIXI APP SETUP
  // ═══════════════════════════════════════════════════════════════════════
  function startPixiGame(imageUrl) {
    console.log("[Storyteller] Starting scene");
    hide($("loading-section"));
    hide($("input-section"));
    show($("pixi-container"));

    W = window.innerWidth;
    H = window.innerHeight;

    if (W < 320 || H < 280) {
      hide($("pixi-container"));
      var errDiv = document.createElement("div");
      errDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a1a;color:#ff6666;text-align:center;padding:20px;font-size:14px;line-height:1.5;";
      errDiv.innerHTML = "Screen too small.<br>Please use a larger window.";
      document.body.appendChild(errDiv);
      reportNoOverflow();
      return;
    }

    cx = W / 2; cy = H / 2;
    app = new PIXI.Application({ width: W, height: H, backgroundColor: 0x0a0a1a, antialias: true, resolution: 1 });
    var cv = app.view;
    cv.style.cssText = "display:block;touch-action:none;";
    $("pixi-container").appendChild(cv);
    rescaleCanvas();

    if (!imageUrl) { buildScene(null); return; }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      var baseTex = new PIXI.BaseTexture(img);
      var tex = new PIXI.Texture(baseTex);
      buildScene(tex);
    };
    img.onerror = function () {
      var img2 = new Image();
      img2.onload = function () { buildScene(new PIXI.Texture(new PIXI.BaseTexture(img2))); };
      img2.onerror = function () { buildScene(null); };
      img2.src = imageUrl;
    };
    img.src = imageUrl;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 8: BUILD SCENE (Visual Novel Layout)
  // ═══════════════════════════════════════════════════════════════════════
  function buildScene(bgTexture) {
    if (gameStarted) return;
    gameStarted = true;

    gameLayer = new PIXI.Container();
    app.stage.addChild(gameLayer);
    uiLayer = new PIXI.Container();
    app.stage.addChild(uiLayer);

    // Background image (cover the full canvas)
    if (bgTexture) {
      var bg = new PIXI.Sprite(bgTexture);
      var sclX = W / bgTexture.width;
      var sclY = H / bgTexture.height;
      var coverScale = Math.max(sclX, sclY);
      bg.scale.set(coverScale);
      bg.anchor.set(0.5);
      bg.x = cx; bg.y = cy;
      gameLayer.addChild(bg);
    } else {
      var fallbackBg = new PIXI.Graphics();
      var grad1 = 0x1a0533, grad2 = 0x0d1b2a;
      fallbackBg.beginFill(grad1);
      fallbackBg.drawRect(0, 0, W, H);
      fallbackBg.endFill();
      gameLayer.addChild(fallbackBg);
    }

    // Dim overlay at the bottom for text readability
    var textDim = new PIXI.Graphics();
    textDim.beginFill(0x000000, 0.55);
    textDim.drawRect(0, H * 0.62, W, H * 0.38);
    textDim.endFill();
    uiLayer.addChild(textDim);

    // Create DOM-based UI elements
    createTextBox();
    createChoiceContainer();

    // Render clickable hotspots if component map exists
    if (sceneData && sceneData._componentMap) {
      renderHotspots(sceneData._componentMap, sceneData.clickableObjects || []);
    }

    // Start scene content
    if (sceneData && sceneData.narrative) {
      narrativeParagraphs = splitNarrative(sceneData.narrative);
      showNextParagraph();
    } else {
      showNarrative("The scene awaits... (No narrative data provided. Configure via Adventure Engine.)", "Narrator");
      showDemoChoices();
    }

    setupInput();

    if (bgMusicStyle && bgMusicStyle !== "none") {
      aiSDK.startBgMusic(bgMusicStyle);
      aiSDK.setAudioVolume("bg", bgMusicVolume);
    }

    app.ticker.add(gameLoop);
    reportNoOverflow();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 9: VISUAL NOVEL UI (DOM-based)
  // ═══════════════════════════════════════════════════════════════════════
  function createTextBox() {
    var container = document.createElement("div");
    container.id = "vn-textbox";
    container.style.cssText = "position:fixed;bottom:0;left:0;width:100%;padding:16px 20px 20px;box-sizing:border-box;z-index:50;pointer-events:auto;cursor:pointer;";

    speakerEl = document.createElement("div");
    speakerEl.id = "vn-speaker";
    speakerEl.style.cssText = "color:#00d4ff;font-weight:700;font-size:15px;margin-bottom:6px;text-shadow:0 1px 4px rgba(0,0,0,0.8);font-family:'Segoe UI',system-ui,sans-serif;";
    container.appendChild(speakerEl);

    textBoxEl = document.createElement("div");
    textBoxEl.id = "vn-text";
    textBoxEl.style.cssText = "color:#e8e8f0;font-size:15px;line-height:1.55;max-width:92vw;text-shadow:0 1px 3px rgba(0,0,0,0.9);font-family:'Segoe UI',system-ui,sans-serif;min-height:40px;";
    container.appendChild(textBoxEl);

    var advanceHint = document.createElement("div");
    advanceHint.id = "vn-advance-hint";
    advanceHint.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;text-align:right;margin-top:6px;font-family:'Segoe UI',system-ui,sans-serif;";
    advanceHint.textContent = "Click to continue \u25B6";
    container.appendChild(advanceHint);

    container.addEventListener("click", function () {
      if (gamePaused || gameOver) return;
      if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
        textBoxEl.textContent = narrativeParagraphs[narrativeIndex - 1] || "";
        return;
      }
      if (!choicesVisible) {
        showNextParagraph();
      }
    });

    document.body.appendChild(container);
  }

  function createChoiceContainer() {
    choiceContainerEl = document.createElement("div");
    choiceContainerEl.id = "vn-choices";
    choiceContainerEl.style.cssText = "position:fixed;bottom:130px;left:50%;transform:translateX(-50%);display:none;flex-direction:column;gap:10px;z-index:55;max-width:90vw;width:420px;pointer-events:auto;";
    document.body.appendChild(choiceContainerEl);
  }

  function splitNarrative(text) {
    var paragraphs = text.split(/\n\n+/).filter(function (p) { return p.trim().length > 0; });
    if (paragraphs.length === 0) paragraphs = [text];
    return paragraphs;
  }

  function showNextParagraph() {
    if (narrativeIndex >= narrativeParagraphs.length) {
      showChoices();
      return;
    }

    var para = narrativeParagraphs[narrativeIndex];
    narrativeIndex++;

    var speaker = "Narrator";
    var dialogueMatch = para.match(/^"?([A-Z][a-zA-Z\s]+?):\s*"?(.*)/s);
    if (dialogueMatch) {
      speaker = dialogueMatch[1].trim();
      para = dialogueMatch[2].replace(/"+$/, "").trim();
    }

    showNarrative(para, speaker);
  }

  function showNarrative(text, speaker) {
    if (speakerEl) speakerEl.textContent = speaker || "";
    if (!textBoxEl) return;

    textBoxEl.textContent = "";
    var charIndex = 0;
    var speed = 20;

    if (typingTimer) clearInterval(typingTimer);
    typingTimer = setInterval(function () {
      if (charIndex < text.length) {
        textBoxEl.textContent += text.charAt(charIndex);
        charIndex++;
      } else {
        clearInterval(typingTimer);
        typingTimer = null;
      }
    }, speed);
  }

  function showChoices() {
    if (!choiceContainerEl) return;
    choicesVisible = true;

    var advHint = document.getElementById("vn-advance-hint");
    if (advHint) advHint.style.display = "none";

    choiceContainerEl.innerHTML = "";
    choiceContainerEl.style.display = "flex";

    var choices = (sceneData && sceneData.choices) || [];
    if (choices.length === 0) {
      showDemoChoices();
      return;
    }

    for (var i = 0; i < choices.length; i++) {
      (function (choice) {
        var btn = createChoiceButton(choice.label, function () {
          onChoiceMade(choice);
        });
        choiceContainerEl.appendChild(btn);
      })(choices[i]);
    }
  }

  function showDemoChoices() {
    choicesVisible = true;
    if (!choiceContainerEl) return;
    choiceContainerEl.innerHTML = "";
    choiceContainerEl.style.display = "flex";

    var demoChoices = [
      { id: "demo-a", label: "Continue the adventure", leadsTo: null },
      { id: "demo-b", label: "Complete this scene", leadsTo: null },
    ];

    for (var i = 0; i < demoChoices.length; i++) {
      (function (choice) {
        var btn = createChoiceButton(choice.label, function () {
          aiSDK.playSfx("click");
          completeScene();
        });
        choiceContainerEl.appendChild(btn);
      })(demoChoices[i]);
    }
  }

  function createChoiceButton(label, onClick) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = "padding:12px 20px;border-radius:10px;border:1px solid rgba(0,212,255,0.4);background:rgba(10,15,40,0.85);color:#e8e8f0;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;text-align:left;font-family:'Segoe UI',system-ui,sans-serif;backdrop-filter:blur(4px);";
    btn.onmouseenter = function () { btn.style.borderColor = "#00d4ff"; btn.style.background = "rgba(0,212,255,0.15)"; btn.style.transform = "translateY(-1px)"; };
    btn.onmouseleave = function () { btn.style.borderColor = "rgba(0,212,255,0.4)"; btn.style.background = "rgba(10,15,40,0.85)"; btn.style.transform = ""; };
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function onChoiceMade(choice) {
    aiSDK.playSfx("click");
    console.log("[Storyteller] Choice made:", choice.label, "→", choice.leadsTo);

    // Save choice to shared data for adventure state
    aiSDK.getSharedData("__adventureChoices", function (prev) {
      var choices = prev || [];
      choices.push({ label: choice.label, id: choice.id, timestamp: new Date().toISOString() });
      aiSDK.setSharedData("__adventureChoices", choices);
    });

    if (choice.leadsTo) {
      aiSDK.setSharedData("__nextInteraction", choice.leadsTo);
      aiSDK.switchInteraction(choice.leadsTo, { previousChoice: choice });
    } else {
      completeScene();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 10: CLICKABLE SCENE HOTSPOTS (Component Map)
  // ═══════════════════════════════════════════════════════════════════════
  function renderHotspots(componentMap, clickableObjects) {
    var components = componentMap.components || [];
    if (components.length === 0) return;

    var objectLookup = {};
    for (var i = 0; i < clickableObjects.length; i++) {
      objectLookup[clickableObjects[i].label.toLowerCase()] = clickableObjects[i];
    }

    for (var j = 0; j < components.length; j++) {
      var comp = components[j];
      var objDef = objectLookup[comp.label.toLowerCase()];
      if (!objDef) continue;

      var hotspot = document.createElement("div");
      hotspot.className = "scene-hotspot";
      hotspot.style.cssText = "position:fixed;cursor:pointer;border:2px solid transparent;border-radius:8px;transition:all 0.3s;z-index:40;pointer-events:auto;";
      hotspot.style.left = comp.x + "%";
      hotspot.style.top = comp.y + "%";
      hotspot.style.width = comp.width + "%";
      hotspot.style.height = comp.height + "%";

      hotspot.setAttribute("data-action", objDef.action);
      hotspot.setAttribute("data-label", objDef.label);
      hotspot.title = objDef.label;

      hotspot.onmouseenter = function () {
        this.style.borderColor = "rgba(0,212,255,0.6)";
        this.style.background = "rgba(0,212,255,0.1)";
        this.style.boxShadow = "0 0 15px rgba(0,212,255,0.3)";
      };
      hotspot.onmouseleave = function () {
        this.style.borderColor = "transparent";
        this.style.background = "transparent";
        this.style.boxShadow = "none";
      };

      (function (def) {
        hotspot.addEventListener("click", function (e) {
          e.stopPropagation();
          onHotspotClicked(def);
        });
      })(objDef);

      document.body.appendChild(hotspot);
      hotspots.push(hotspot);
    }
  }

  function onHotspotClicked(objDef) {
    aiSDK.playSfx("click");
    console.log("[Storyteller] Hotspot clicked:", objDef.label, "action:", objDef.action);

    switch (objDef.action) {
      case "chat":
        if (objDef.characterId && adventureConfig) {
          var characters = adventureConfig.characters || [];
          var charDef = null;
          for (var i = 0; i < characters.length; i++) {
            if (characters[i].id === objDef.characterId) { charDef = characters[i]; break; }
          }
          if (charDef) {
            aiSDK.setTeacherPersona({
              characterId: charDef.id,
              name: charDef.name,
              systemPrompt: charDef.systemPrompt || ("You are " + charDef.name + ". " + (charDef.description || "")),
              avatarUrl: charDef.avatarUrl || null,
              greeting: objDef.chatOpener || ("Hello! I am " + charDef.name + "."),
              knowledgeConstraints: charDef.knowledgeConstraints || [],
            });
          }
        }
        if (objDef.chatOpener) {
          aiSDK.postToChat(objDef.chatOpener, "assistant", true);
        }
        break;

      case "navigate":
        if (objDef.targetInteractionId) {
          aiSDK.switchInteraction(objDef.targetInteractionId);
        }
        break;

      case "event":
        aiSDK.emitEvent({
          type: objDef.eventType || "HOTSPOT_CLICKED",
          data: { label: objDef.label, eventData: objDef.eventData || {} },
          requiresLLMResponse: true,
        });
        break;

      case "inspect":
        var inspectText = objDef.eventData ? (objDef.eventData.description || objDef.label) : objDef.label;
        aiSDK.showSnack(inspectText, 5000);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 11: SCENE COMPLETION
  // ═══════════════════════════════════════════════════════════════════════
  function completeScene() {
    if (gameOver) return;
    gameOver = true;
    gamePaused = true;
    aiSDK.playSfx("complete");
    aiSDK.stopBgMusic();

    // Clean up hotspots
    for (var i = 0; i < hotspots.length; i++) {
      if (hotspots[i].parentNode) hotspots[i].parentNode.removeChild(hotspots[i]);
    }
    hotspots = [];

    aiSDK.saveUserProgress({ score: 100, completed: true, customData: { scenesViewed: narrativeIndex } });
    aiSDK.markCompleted();
    aiSDK.emitEvent({ type: "INTERACTION_COMPLETED", data: { scenesViewed: narrativeIndex }, requiresLLMResponse: false });

    window.parent.postMessage({ type: "ai-sdk-complete-interaction" }, "*");
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 12: GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════
  function gameLoop(delta) {
    if (gamePaused || gameOver) return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 13: PAUSE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  var pauseOverlay = null;
  var unpauseModal = null;

  function showPauseOverlay() {
    if (pauseOverlay) return;
    pauseOverlay = document.createElement("div");
    pauseOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:90;pointer-events:none;";
    var label = document.createElement("div");
    label.style.cssText = "color:rgba(255,255,255,0.7);font-size:28px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 0 20px rgba(0,212,255,0.4);";
    label.textContent = "PAUSED";
    pauseOverlay.appendChild(label);
    document.body.appendChild(pauseOverlay);
  }

  function hidePauseOverlay() {
    if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; }
    if (unpauseModal) { unpauseModal.remove(); unpauseModal = null; }
  }

  function showUnpauseModal() {
    if (unpauseModal || !gamePaused || gameOver) return;
    unpauseModal = document.createElement("div");
    unpauseModal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:95;";
    var card = document.createElement("div");
    card.style.cssText = "background:rgba(10,15,40,0.95);border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:24px 28px;max-width:300px;width:85%;text-align:center;color:#fff;";
    card.innerHTML = '<h3 style="color:#00d4ff;margin:0 0 16px;font-size:18px;">Scene Paused</h3><p style="color:#ccc;margin:0 0 20px;font-size:14px;">Resume the adventure?</p>';
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";
    var noBtn = document.createElement("button");
    noBtn.textContent = "Stay Paused";
    noBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:1px solid #555;background:transparent;color:#aaa;font-size:14px;font-weight:600;cursor:pointer;";
    noBtn.addEventListener("click", function (e) { e.stopPropagation(); if (unpauseModal) { unpauseModal.remove(); unpauseModal = null; } });
    btnRow.appendChild(noBtn);
    var yesBtn = document.createElement("button");
    yesBtn.textContent = "Resume";
    yesBtn.style.cssText = "padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#fff;font-size:14px;font-weight:600;cursor:pointer;";
    yesBtn.addEventListener("click", function (e) { e.stopPropagation(); resumeGame(); });
    btnRow.appendChild(yesBtn);
    card.appendChild(btnRow);
    unpauseModal.appendChild(card);
    unpauseModal.addEventListener("click", function (e) { if (e.target === unpauseModal) { unpauseModal.remove(); unpauseModal = null; } });
    document.body.appendChild(unpauseModal);
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
    hidePauseOverlay();
    if (app) app.ticker.start();
    if (bgMusicStyle && bgMusicStyle !== "none") {
      aiSDK.startBgMusic(bgMusicStyle);
      aiSDK.setAudioVolume("bg", bgMusicVolume);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 14: INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════════
  function setupInput() {
    var view = app.view;
    view.style.touchAction = "none";

    view.addEventListener("mousedown", function (e) {
      if (gameOver) return;
      if (gamePaused) { showUnpauseModal(); return; }
    });

    view.addEventListener("touchstart", function (e) {
      e.preventDefault();
      if (gameOver) return;
      if (gamePaused) { showUnpauseModal(); return; }
    }, { passive: false });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECTION 15: RESPONSIVE VIEW
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
  var initIsMobile = window.innerWidth < 768 || (window.innerWidth < window.innerHeight && window.innerWidth < 900);
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
    if (ev.data && ev.data.type === "container-dimensions") {
      scheduleViewReload();
    }
    if (ev.data && ev.data.type === "interaction-action") {
      if (ev.data.action === "pause") { pausedByParent = true; pauseGame(); }
      else if (ev.data.action === "resume") { resumeGame(); }
    }
  });
})();
