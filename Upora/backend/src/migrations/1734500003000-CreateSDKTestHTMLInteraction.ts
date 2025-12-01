import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestHTMLInteraction1734500003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The full code is in: Upora/backend/scripts/sdk-test-html-full-code.js
    // Please copy the HTML, CSS, and JS code from that file into this interaction via the interaction builder UI
    const htmlCode = `<div id="sdk-test-container">
  <div id="sdk-test-header">
    <h1>AI Teacher SDK Test - HTML</h1>
    <p id="status-text">Initializing...</p>
  </div>
  <div id="sdk-test-buttons"></div>
</div>`;

    const cssCode = `body {
  margin: 0;
  padding: 0;
  background: #0f0f23;
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-y: auto;
}
#sdk-test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
#sdk-test-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(0, 212, 255, 0.3);
}
#sdk-test-header h1 {
  color: #00d4ff;
  margin: 0 0 10px 0;
  font-size: 24px;
}
#status-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 14px;
}
.section-label {
  color: #00d4ff;
  font-size: 18px;
  font-weight: bold;
  margin: 30px 0 15px 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.test-button {
  display: block;
  width: 100%;
  max-width: 500px;
  padding: 12px 20px;
  margin: 8px 0;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  color: #00d4ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.test-button:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateX(5px);
}
.test-button:active {
  transform: translateX(2px);
}`;

    const jsCode = `(function() {
  console.log("[SDK Test HTML] Starting initialization...");
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestApp);
  } else {
    setTimeout(initTestApp, 10);
  }
})();

// Include createIframeAISDK function (same as PixiJS version)
const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;

  const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
  const generateSubscriptionId = () => \`sub-\${Date.now()}-\${Math.random()}\`;

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
    postToChat: (content, role, showInWidget) => {
      sendMessage("ai-sdk-post-to-chat", { content, role, showInWidget });
    },
    showScript: (script, autoPlay) => {
      sendMessage("ai-sdk-show-script", { script, autoPlay });
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
      sendMessage("ai-sdk-get-instance-data-history", { filters }, (response) => {
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

let aiSDK = null;
let statusText = null;
let buttonsContainer = null;

function updateStatus(message, color = "#ffffff") {
  if (statusText) {
    statusText.textContent = message;
    statusText.style.color = color;
  }
  console.log("[SDK Test HTML]", message);
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.className = "test-button";
  button.textContent = text;
  button.onclick = onClick;
  if (buttonsContainer) {
    buttonsContainer.appendChild(button);
  }
  return button;
}

function initTestApp() {
  console.log("[SDK Test HTML] Initializing app...");
  
  // Get or create container elements
  buttonsContainer = document.getElementById("sdk-test-buttons");
  statusText = document.getElementById("status-text");
  
  if (!buttonsContainer) {
    console.error("[SDK Test HTML] Buttons container not found!");
    return;
  }

  // Initialize SDK
  aiSDK = createIframeAISDK();
  
  // Check if we're in preview mode (no parent window or parent is same origin)
  const isPreviewMode = !window.parent || window.parent === window;
  
  if (isPreviewMode) {
    updateStatus("Preview Mode - SDK will work when added to a lesson", "#ffff00");
    // In preview, we can still show buttons but SDK won't work
  } else {
    updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", "#ffff00");
    
    // Wait for SDK ready
    aiSDK.isReady((ready) => {
      if (ready) {
        updateStatus("SDK Ready! All methods available.", "#00ff00");
      }
    });
  }

  // Core Methods Section
  const coreLabel = document.createElement("div");
  coreLabel.className = "section-label";
  coreLabel.textContent = "CORE METHODS";
  buttonsContainer.appendChild(coreLabel);

  createButton("Emit Event", () => {
    aiSDK.emitEvent({
      type: "user-selection",
      data: { test: true, timestamp: Date.now() },
      requiresLLMResponse: true,
    });
    updateStatus("Event emitted", "#00ff00");
  });

  createButton("Update State", () => {
    aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
    updateStatus("State updated", "#00ff00");
  });

  createButton("Get State", () => {
    aiSDK.getState((state) => {
      updateStatus("State: " + JSON.stringify(state).substring(0, 50), "#00ff00");
    });
  });

  // UI Control Methods Section
  const uiLabel = document.createElement("div");
  uiLabel.className = "section-label";
  uiLabel.textContent = "UI CONTROL METHODS";
  buttonsContainer.appendChild(uiLabel);

  createButton("Minimize Chat UI", () => {
    aiSDK.minimizeChatUI();
    updateStatus("Chat UI minimized", "#00ff00");
  });

  createButton("Show Chat UI", () => {
    aiSDK.showChatUI();
    updateStatus("Chat UI shown", "#00ff00");
  });

  createButton("Activate Fullscreen", () => {
    aiSDK.activateFullscreen();
    updateStatus("Fullscreen activated", "#00ff00");
  });

  createButton("Deactivate Fullscreen", () => {
    aiSDK.deactivateFullscreen();
    updateStatus("Fullscreen deactivated", "#00ff00");
  });

  createButton("Post to Chat", () => {
    const testMessage = "Test message from SDK Test interaction! This is a dummy message to test the postToChat functionality.";
    aiSDK.postToChat(testMessage, "assistant", true);
    updateStatus("Posted to chat: " + testMessage.substring(0, 30) + "...", "#00ff00");
  });

  createButton("Show Script", () => {
    const testScript = "This is a test script block from the SDK Test interaction. It demonstrates the showScript functionality.";
    aiSDK.showScript(testScript, true);
    updateStatus("Script shown: " + testScript.substring(0, 30) + "...", "#00ff00");
  });

  createButton("Show Snack (5s)", () => {
    aiSDK.showSnack("Test snack message! (also posts to chat)", 5000, false, (snackId) => {
      updateStatus("Snack shown: " + snackId, "#00ff00");
    });
  });

  createButton("Show Snack (no chat)", () => {
    aiSDK.showSnack("Test snack message! (hidden from chat)", 5000, true, (snackId) => {
      updateStatus("Snack shown (no chat): " + snackId, "#00ff00");
    });
  });

  createButton("Hide Snack", () => {
    aiSDK.hideSnack();
    updateStatus("Snack hidden", "#00ff00");
  });

  // Data Storage Methods Section
  const dataLabel = document.createElement("div");
  dataLabel.className = "section-label";
  dataLabel.textContent = "DATA STORAGE METHODS";
  buttonsContainer.appendChild(dataLabel);

  createButton("Save Instance Data", () => {
    aiSDK.saveInstanceData(
      {
        testValue: Math.random(),
        timestamp: Date.now(),
        testArray: [1, 2, 3],
      },
      (success, error) => {
        if (success) {
          updateStatus("Instance data saved", "#00ff00");
        } else {
          updateStatus("Error: " + error, "#ff0000");
        }
      }
    );
  });

  createButton("Get Instance Data History", () => {
    aiSDK.getInstanceDataHistory(
      { limit: 10 },
      (data, error) => {
        if (data) {
          updateStatus("History: " + data.length + " records", "#00ff00");
        } else {
          updateStatus("Error: " + error, "#ff0000");
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
          updateStatus("Progress saved. Attempts: " + progress.attempts, "#00ff00");
        } else {
          updateStatus("Error: " + error, "#ff0000");
        }
      }
    );
  });

  createButton("Get User Progress", () => {
    aiSDK.getUserProgress((progress, error) => {
      if (progress) {
        updateStatus(
          "Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed,
          "#00ff00"
        );
      } else if (error) {
        updateStatus("Error: " + error, "#ff0000");
      } else {
        updateStatus("No progress found", "#ffff00");
      }
    });
  });

  createButton("Mark Completed", () => {
    aiSDK.markCompleted((progress, error) => {
      if (progress) {
        updateStatus("Marked as completed", "#00ff00");
      } else {
        updateStatus("Error: " + error, "#ff0000");
      }
    });
  });

  createButton("Increment Attempts", () => {
    aiSDK.incrementAttempts((progress, error) => {
      if (progress) {
        updateStatus("Attempts: " + progress.attempts, "#00ff00");
      } else {
        updateStatus("Error: " + error, "#ff0000");
      }
    });
  });

  createButton("Get User Public Profile", () => {
    aiSDK.getUserPublicProfile(undefined, (profile, error) => {
      if (profile) {
        updateStatus("Profile: " + (profile.displayName || "No name"), "#00ff00");
      } else if (error) {
        updateStatus("Error: " + error, "#ff0000");
      } else {
        updateStatus("No profile found (this is OK)", "#ffff00");
      }
    });
  });

  console.log("[SDK Test HTML] All buttons created");
}`;

    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, html_code, css_code, js_code,
        config_schema, sample_data, instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'sdk-test-html',
        'SDK Test - HTML',
        'Comprehensive test interaction for all AI Teacher SDK functionality using standard HTML/CSS/JS. Copy the full code from Upora/backend/scripts/sdk-test-html-full-code.js',
        'absorb-show',
        '{}',
        'This is a test interaction for SDK functionality using HTML.',
        'html',
        $1,
        $2,
        $3,
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"message": "Sample data for SDK test interaction. When using processed content, the processed output data will replace this sample data.", "processedContentFormat": "Processed content should be a JSON object that will replace the sample data. Common fields include: data, content, metadata, etc."}',
        '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
        '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
        true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        html_code = EXCLUDED.html_code,
        css_code = EXCLUDED.css_code,
        instance_data_schema = EXCLUDED.instance_data_schema,
        user_progress_schema = EXCLUDED.user_progress_schema;
    `, [htmlCode, cssCode, jsCode]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'sdk-test-html'`);
  }
}

