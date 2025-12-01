-- Create a test PixiJS interaction to test all SDK functionality
-- This interaction has buttons to test every SDK method

INSERT INTO interaction_types (
  id,
  name,
  description,
  category,
  schema,
  generation_prompt,
  interaction_type_category,
  html_code,
  css_code,
  js_code,
  config_schema,
  sample_data,
  instance_data_schema,
  user_progress_schema,
  is_active
) VALUES (
  'sdk-test-pixijs',
  'SDK Test - PixiJS',
  'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, and responses.',
  'absorb-show',
  '{}',
  'This is a test interaction for SDK functionality.',
  'pixijs',
  '<div id="pixi-container"></div>',
  'body { margin: 0; padding: 0; background: #0f0f23; overflow: hidden; } #pixi-container { width: 100vw; height: 100vh; }',
  E'// SDK Test PixiJS Interaction
// Tests all AI Teacher SDK functionality

// Load PixiJS from CDN
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js";
script.onload = () => {
  initTestApp();
};
document.head.appendChild(script);

// Include createIframeAISDK function
const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;

  const generateRequestId = () => `req-${Date.now()}-${++requestCounter}`;
  const generateSubscriptionId = () => `sub-${Date.now()}-${Math.random()}`;

  const sendMessage = (type, data, callback) => {
    const requestId = generateRequestId();
    const message = { type, requestId, ...data, sourceWindow: window };

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
    activateFullscreen: () => {
      sendMessage("ai-sdk-activate-fullscreen", {});
    },
    postToChat: (content, role = "assistant", openChat = false) => {
      sendMessage("ai-sdk-post-to-chat", { content, role, openChat });
    },
    showScript: (text, openChat = false) => {
      sendMessage("ai-sdk-show-script", { text, openChat });
    },
    showSnack: (content, duration, callback) => {
      sendMessage("ai-sdk-show-snack", { content, duration }, (response) => {
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
  const container = document.getElementById("pixi-container");
  if (!container) return;

  // Create PixiJS app
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0f0f23,
    antialias: true,
  });
  container.appendChild(app.view);

  // Initialize SDK
  const aiSDK = createIframeAISDK();
  let sdkReady = false;

  aiSDK.isReady((ready) => {
    sdkReady = ready;
    updateStatus("SDK Ready: " + ready, ready ? 0x00ff00 : 0xff0000);
  });

  // Subscribe to AI responses
  aiSDK.onResponse((response) => {
    updateStatus("AI Response: " + (response.response || "No text"), 0x00d4ff);
    console.log("AI Response:", response);
  });

  // UI Elements
  const statusText = new PIXI.Text("Initializing...", {
    fontSize: 16,
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: window.innerWidth - 40,
  });
  statusText.x = 20;
  statusText.y = 20;
  app.stage.addChild(statusText);

  function updateStatus(message, color = 0xffffff) {
    statusText.text = message;
    statusText.style.fill = color;
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
    bg.rect(0, 0, buttonWidth, buttonHeight);
    bg.fill(0x00d4ff);
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

  createButton("Activate Fullscreen", () => {
    aiSDK.activateFullscreen();
    updateStatus("Fullscreen activated", 0x00ff00);
  });

  createButton("Post to Chat", () => {
    aiSDK.postToChat("Test message from SDK Test interaction!", "assistant", false);
    updateStatus("Posted to chat", 0x00ff00);
  });

  createButton("Show Script", () => {
    aiSDK.showScript("This is a test script block from the SDK Test interaction.", false);
    updateStatus("Script shown", 0x00ff00);
  });

  createButton("Show Snack (5s)", () => {
    aiSDK.showSnack("Test snack message!", 5000, (snackId) => {
      updateStatus("Snack shown: " + snackId, 0x00ff00);
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

  // Handle window resize
  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    statusText.style.wordWrapWidth = window.innerWidth - 40;
  });

  updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", 0xffff00);
}',
  '{"fields": []}',
  '{}',
  '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
  '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_code = EXCLUDED.html_code,
  css_code = EXCLUDED.css_code,
  js_code = EXCLUDED.js_code,
  instance_data_schema = EXCLUDED.instance_data_schema,
  user_progress_schema = EXCLUDED.user_progress_schema;

