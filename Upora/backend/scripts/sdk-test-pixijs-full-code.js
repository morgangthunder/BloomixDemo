// SDK Test PixiJS Interaction
// Tests all AI Teacher SDK functionality
// Copy this entire code into the JavaScript code editor in the interaction builder

// Load PixiJS from CDN and initialize
(function() {
  console.log("[SDK Test] Starting initialization...");
  
  // Check if PixiJS is already loaded
  if (window.PIXI) {
    console.log("[SDK Test] PixiJS already loaded");
    // Wait a tiny bit to ensure DOM is ready
    setTimeout(initTestApp, 10);
    return;
  }
  
  // Load PixiJS from CDN
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js";
  script.onload = () => {
    console.log("[SDK Test] PixiJS loaded successfully");
    // Small delay to ensure everything is ready
    setTimeout(initTestApp, 10);
  };
  script.onerror = () => {
    console.error("[SDK Test] Failed to load PixiJS from CDN");
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = "padding: 20px; color: red; background: #1a1a1a;";
    errorDiv.textContent = "Error: Failed to load PixiJS library";
    document.body.appendChild(errorDiv);
  };
  document.head.appendChild(script);
})();

// Include createIframeAISDK function
const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;

  const generateRequestId = () => `req-${Date.now()}-${++requestCounter}`;
  const generateSubscriptionId = () => `sub-${Date.now()}-${Math.random()}`;

  const sendMessage = (type, data, callback) => {
    const requestId = generateRequestId();
    // Don't include sourceWindow - it can't be cloned and parent can get it from event.source
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
      sendMessage("ai-sdk-get-state", {}, (response) => {
        callback(response.state);
      });
    },
    onResponse: (callback) => {
      subscriptionId = generateSubscriptionId();
      sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
        const listener = (event) => {
          if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
            callback(event.data.response);
          }
        };
        window.addEventListener("message", listener);
        return () => {
          window.removeEventListener("message", listener);
          sendMessage("ai-sdk-unsubscribe", { subscriptionId });
        };
      });
    },
    isReady: (callback) => {
      const listener = (event) => {
        if (event.data.type === "ai-sdk-ready") {
          window.removeEventListener("message", listener);
          callback(true);
        }
      };
      window.addEventListener("message", listener);
    },
    minimizeChatUI: () => {
      sendMessage("ai-sdk-minimize-chat-ui", {});
    },
    showChatUI: () => {
      sendMessage("ai-sdk-show-chat-ui", {});
    },
    activateFullscreen: () => {
      sendMessage("ai-sdk-activate-fullscreen", {});
    },
    deactivateFullscreen: () => {
      sendMessage("ai-sdk-deactivate-fullscreen", {});
    },
    postToChat: (content, role = "assistant", openChat = false) => {
      sendMessage("ai-sdk-post-to-chat", { content, role, openChat });
    },
    showScript: (text, openChat = false) => {
      sendMessage("ai-sdk-show-script", { text, openChat });
    },
    showSnack: (content, duration, hideFromChatUI, callback) => {
      sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
        if (callback && response.snackId) {
          callback(response.snackId);
        }
      });
    },
    hideSnack: () => {
      sendMessage("ai-sdk-hide-snack", {});
    },
    saveInstanceData: (data, callback) => {
      sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
        if (callback) {
          callback(response.success, response.error);
        }
      });
    },
    getInstanceDataHistory: (filters, callback) => {
      const filtersData = filters ? {
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
        limit: filters.limit,
      } : {};
      sendMessage("ai-sdk-get-instance-data-history", { filters: filtersData }, (response) => {
        if (callback) {
          callback(response.data, response.error);
        }
      });
    },
    saveUserProgress: (data, callback) => {
      sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },
    getUserProgress: (callback) => {
      sendMessage("ai-sdk-get-user-progress", {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },
    markCompleted: (callback) => {
      sendMessage("ai-sdk-mark-completed", {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },
    incrementAttempts: (callback) => {
      sendMessage("ai-sdk-increment-attempts", {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },
    getUserPublicProfile: (userId, callback) => {
      sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
        if (callback) {
          callback(response.profile, response.error);
        }
      });
    },
  };
};

function initTestApp() {
  console.log("[SDK Test] initTestApp called");
  console.log("[SDK Test] PIXI available:", typeof window.PIXI !== 'undefined');
  
  const container = document.getElementById("pixi-container");
  if (!container) {
    console.error("[SDK Test] Container #pixi-container not found!");
    console.error("[SDK Test] Document body:", document.body);
    console.error("[SDK Test] Available elements:", document.querySelectorAll('*'));
    // Try to create the container if it doesn't exist
    const newContainer = document.createElement("div");
    newContainer.id = "pixi-container";
    document.body.appendChild(newContainer);
    console.log("[SDK Test] Created container element");
    return initTestApp(); // Retry
  }
  
  console.log("[SDK Test] Container found, initializing PixiJS app...");
  
  if (!window.PIXI) {
    console.error("[SDK Test] PIXI is not available!");
    return;
  }

  // Calculate initial height - will be updated after all buttons are created
  // Start with a minimum height, will expand based on content
  const initialHeight = Math.max(window.innerHeight, 600);
  
  // Create PixiJS app
  const app = new PIXI.Application({
    width: Math.max(window.innerWidth, 800),
    height: initialHeight,
    backgroundColor: 0x0f0f23,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  container.appendChild(app.view);
  
  // Make container scrollable
  container.style.overflow = 'auto';
  container.style.width = '100%';
  container.style.height = '100%';
  
  console.log("[SDK Test] PixiJS app created, size:", app.screen.width, "x", app.screen.height);

  // Initialize SDK
  const aiSDK = createIframeAISDK();
  let sdkReady = false;

  // Check if we're in preview mode (no parent window or parent is same origin but no bridge)
  const isPreviewMode = !window.parent || window.parent === window || 
    (window.parent.location && window.parent.location.href.includes('blob:'));

  // Note: SDK ready callbacks will be set up after buttons are created
  // so that updateStatus can properly display messages

  // Status text will be positioned below all buttons
  let statusText = null;
  let statusYPos = 0;
  let statusTextInitialized = false;

  function updateStatus(message, color = 0xffffff) {
    if (!statusTextInitialized) {
      // Don't create status text until statusYPos is set (after all buttons)
      // Just log for now
      console.log("[SDK Test] " + message);
      return;
    }
    
    if (!statusText) {
      // Create status text after buttons are created
      statusText = new PIXI.Text(message, {
        fontSize: 14,
        fill: color,
        wordWrap: true,
        wordWrapWidth: window.innerWidth - 40,
      });
      statusText.x = 20;
      statusText.y = statusYPos;
      app.stage.addChild(statusText);
    } else {
      statusText.text = message;
      statusText.style.fill = color;
    }
    console.log("[SDK Test] " + message);
  }

  // Button style
  const buttonStyle = {
    fontSize: 14,
    fill: 0xffffff,
    align: "center",
  };

  const buttonBgStyle = {
    fill: 0x333333,
    alpha: 0.8,
  };

  let yPos = 80;
  const buttonHeight = 40;
  const buttonSpacing = 10;
  const buttonWidth = 280;

  // Helper to create button
  function createButton(text, onClick, x = 20) {
    const bg = new PIXI.Graphics();
    // PixiJS v7 API: use beginFill() and drawRect() (traditional API that works in v7)
    bg.beginFill(0x00d4ff, 0.7);
    bg.drawRect(0, 0, buttonWidth, buttonHeight);
    bg.endFill();
    bg.alpha = 0.7;
    bg.eventMode = "static";
    bg.cursor = "pointer";

    const label = new PIXI.Text(text, {
      fontSize: 12,
      fill: 0x0f0f23,
      align: "center",
      wordWrap: true,
      wordWrapWidth: buttonWidth - 10,
    });
    label.x = 5;
    label.y = (buttonHeight - label.height) / 2;

    const container = new PIXI.Container();
    container.addChild(bg);
    container.addChild(label);
    container.x = x;
    container.y = yPos;

    bg.on("pointerdown", () => {
      bg.alpha = 0.5;
      setTimeout(() => {
        bg.alpha = 0.7;
        onClick();
      }, 100);
    });

    app.stage.addChild(container);
    console.log("[SDK Test] Created button:", text, "at y:", yPos);
    yPos += buttonHeight + buttonSpacing;
    return container;
  }

  // Core Methods Section
  const coreLabel = new PIXI.Text("CORE METHODS", {
    fontSize: 18,
    fill: 0x00d4ff,
    fontWeight: "bold",
  });
  coreLabel.x = 20;
  coreLabel.y = yPos;
  app.stage.addChild(coreLabel);
  yPos += 30;

  createButton("Emit Event", () => {
    aiSDK.emitEvent({
      type: "user-selection",
      data: { test: true, timestamp: Date.now() },
      requiresLLMResponse: true,
    });
    updateStatus("Event emitted", 0x00ff00);
  });

  createButton("Update State", () => {
    aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
    updateStatus("State updated", 0x00ff00);
  });

  createButton("Get State", () => {
    aiSDK.getState((state) => {
      updateStatus("State: " + JSON.stringify(state).substring(0, 50), 0x00ff00);
    });
  });

  // UI Control Methods Section
  yPos += 20;
  const uiLabel = new PIXI.Text("UI CONTROL METHODS", {
    fontSize: 18,
    fill: 0x00d4ff,
    fontWeight: "bold",
  });
  uiLabel.x = 20;
  uiLabel.y = yPos;
  app.stage.addChild(uiLabel);
  yPos += 30;

  createButton("Minimize Chat UI", () => {
    aiSDK.minimizeChatUI();
    updateStatus("Chat UI minimized", 0x00ff00);
  });

  createButton("Show Chat UI", () => {
    aiSDK.showChatUI();
    updateStatus("Chat UI shown", 0x00ff00);
  });

  createButton("Activate Fullscreen", () => {
    aiSDK.activateFullscreen();
    updateStatus("Fullscreen activated", 0x00ff00);
  });

  createButton("Deactivate Fullscreen", () => {
    aiSDK.deactivateFullscreen();
    updateStatus("Fullscreen deactivated", 0x00ff00);
  });

  createButton("Post to Chat", () => {
    const testMessage = "Test message from SDK Test interaction! This is a dummy message to test the postToChat functionality.";
    aiSDK.postToChat(testMessage, "assistant", true);
    updateStatus("Posted to chat: " + testMessage.substring(0, 30) + "...", 0x00ff00);
  });

  createButton("Show Script", () => {
    const testScript = "This is a test script block from the SDK Test interaction. It demonstrates the showScript functionality.";
    aiSDK.showScript(testScript, true);
    updateStatus("Script shown: " + testScript.substring(0, 30) + "...", 0x00ff00);
  });

  createButton("Show Snack (5s)", () => {
    aiSDK.showSnack("Test snack message! (also posts to chat)", 5000, false, (snackId) => {
      updateStatus("Snack shown: " + snackId, 0x00ff00);
    });
  });

  createButton("Show Snack (no chat)", () => {
    aiSDK.showSnack("Test snack message! (hidden from chat)", 5000, true, (snackId) => {
      updateStatus("Snack shown (no chat): " + snackId, 0x00ff00);
    });
  });

  createButton("Hide Snack", () => {
    aiSDK.hideSnack();
    updateStatus("Snack hidden", 0x00ff00);
  });

  // Data Storage Methods Section
  yPos += 20;
  const dataLabel = new PIXI.Text("DATA STORAGE METHODS", {
    fontSize: 18,
    fill: 0x00d4ff,
    fontWeight: "bold",
  });
  dataLabel.x = 20;
  dataLabel.y = yPos;
  app.stage.addChild(dataLabel);
  yPos += 30;

  createButton("Save Instance Data", () => {
    aiSDK.saveInstanceData(
      {
        testValue: Math.random(),
        timestamp: Date.now(),
        testArray: [1, 2, 3],
      },
      (success, error) => {
        if (success) {
          updateStatus("Instance data saved", 0x00ff00);
        } else {
          updateStatus("Error: " + error, 0xff0000);
        }
      }
    );
  });

  createButton("Get Instance Data History", () => {
    aiSDK.getInstanceDataHistory(
      { limit: 10 },
      (data, error) => {
        if (data) {
          updateStatus("History: " + data.length + " records", 0x00ff00);
        } else {
          updateStatus("Error: " + error, 0xff0000);
        }
      }
    );
  });

  createButton("Save User Progress", () => {
    aiSDK.saveUserProgress(
      {
        score: Math.floor(Math.random() * 100),
        completed: false,
        customData: {
          testField: "test value",
          testNumber: 42,
        },
      },
      (progress, error) => {
        if (progress) {
          updateStatus("Progress saved. Attempts: " + progress.attempts, 0x00ff00);
        } else {
          updateStatus("Error: " + error, 0xff0000);
        }
      }
    );
  });

  createButton("Get User Progress", () => {
    aiSDK.getUserProgress((progress, error) => {
      if (progress) {
        updateStatus(
          "Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed,
          0x00ff00
        );
      } else if (error) {
        updateStatus("Error: " + error, 0xff0000);
      } else {
        updateStatus("No progress found", 0xffff00);
      }
    });
  });

  createButton("Mark Completed", () => {
    aiSDK.markCompleted((progress, error) => {
      if (progress) {
        updateStatus("Marked as completed", 0x00ff00);
      } else {
        updateStatus("Error: " + error, 0xff0000);
      }
    });
  });

  createButton("Increment Attempts", () => {
    aiSDK.incrementAttempts((progress, error) => {
      if (progress) {
        updateStatus("Attempts: " + progress.attempts, 0x00ff00);
      } else {
        updateStatus("Error: " + error, 0xff0000);
      }
    });
  });

  createButton("Get User Public Profile", () => {
    aiSDK.getUserPublicProfile(undefined, (profile, error) => {
      if (profile) {
        updateStatus("Profile: " + (profile.displayName || "No name"), 0x00ff00);
      } else if (error) {
        updateStatus("Error: " + error, 0xff0000);
      } else {
        updateStatus("No profile found", 0xffff00);
      }
    });
  });

  // Position status text below all buttons
  statusYPos = yPos + 20;
  statusTextInitialized = true; // Now allow status text to be created
  updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", 0xffff00);

  // Resize canvas to fit all content (add extra space for status text and padding)
  const contentHeight = statusYPos + 100; // Add 100px for status text and padding
  const minHeight = Math.max(window.innerHeight, 600);
  const finalHeight = Math.max(contentHeight, minHeight);
  app.renderer.resize(Math.max(window.innerWidth, 800), finalHeight);
  console.log("[SDK Test] Canvas resized to fit content:", Math.max(window.innerWidth, 800), "x", finalHeight);

  // Handle window resize
  window.addEventListener("resize", () => {
    const newWidth = Math.max(window.innerWidth, 800);
    // Keep height based on content, but ensure minimum
    const contentBasedHeight = Math.max(statusYPos + 100, Math.max(window.innerHeight, 600));
    app.renderer.resize(newWidth, contentBasedHeight);
    if (statusText) {
      statusText.style.wordWrapWidth = newWidth - 40;
    }
    console.log("[SDK Test] Resized to:", newWidth, "x", contentBasedHeight);
  });

  // Set up SDK ready callbacks now that status text is initialized
  if (!isPreviewMode) {
    // In lesson view, wait for SDK to be ready
    aiSDK.isReady((ready) => {
      sdkReady = ready;
      updateStatus("SDK Ready: " + ready, ready ? 0x00ff00 : 0xff0000);
    });

    // Subscribe to AI responses
    aiSDK.onResponse((response) => {
      updateStatus("AI Response: " + (response.response || "No text"), 0x00d4ff);
      console.log("AI Response:", response);
    });
  } else {
    // In preview mode, SDK won't be ready, so just mark it as ready for UI purposes
    console.log("[SDK Test] Preview mode detected - SDK features will be limited");
    sdkReady = true;
    updateStatus("Preview Mode - SDK features limited (full functionality in lesson view)", 0xffff00);
  }

  // Force initial render
  app.render();
  console.log("[SDK Test] Total buttons created, final yPos:", yPos);
  console.log("[SDK Test] App stage children count:", app.stage.children.length);
  
  // Log all created elements for debugging
  setTimeout(() => {
    console.log("[SDK Test] Stage children:", app.stage.children.map((c, i) => `${i}: ${c.constructor.name} at y=${c.y || 'N/A'}`));
  }, 100);
}

