/**
 * Overlay code for sdk-test-iframe interaction.
 * Includes Save User Progress and Mark Completed for scoring (audit fix).
 */
export const SDK_TEST_IFRAME_HTML = `<div id="sdk-test-header">
  <h1>AI Teacher SDK Test</h1>
  <p id="status-text">Initializing...</p>
</div>
<div id="sdk-test-buttons"></div>`;

export const SDK_TEST_IFRAME_CSS = `#sdk-test-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(0, 212, 255, 0.3);
}

#sdk-test-header h1 {
  color: #00d4ff;
  margin: 0 0 10px 0;
  font-size: 20px;
}

#status-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 12px;
}

.section-label {
  color: #00d4ff;
  font-size: 14px;
  font-weight: bold;
  margin: 20px 0 10px 0;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.test-button {
  display: block;
  width: 100%;
  padding: 10px 15px;
  margin: 6px 0;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  color: #00d4ff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.test-button:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateX(3px);
}

.test-button:active {
  transform: translateX(1px);
}`;

export const SDK_TEST_IFRAME_JS = `// SDK Test iFrame Interaction
// This is an example of how to use the overlay mode for iframe interactions
// The overlay code runs on top of the external iframe and can use the AI Teacher SDK

(function() {
  console.log("[SDK Test iFrame] Starting initialization...");
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestApp);
  } else {
    setTimeout(initTestApp, 10);
  }
})();

let aiSDK = null;
let statusText = null;
let buttonsContainer = null;
let externalIframe = null;
let buttonOverlay = null;
let toggleButton = null;

function updateStatus(message, color = "#ffffff") {
  if (statusText) {
    statusText.textContent = message;
    statusText.style.color = color;
  }
  console.log("[SDK Test iFrame]", message);
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
  console.log("[SDK Test iFrame] Initializing app...");
  
  buttonsContainer = document.getElementById("sdk-test-buttons");
  statusText = document.getElementById("status-text");
  externalIframe = document.getElementById("external-iframe");
  buttonOverlay = document.getElementById("button-overlay");
  toggleButton = document.getElementById("toggle-overlay");
  
  if (!buttonsContainer || !externalIframe || !buttonOverlay || !toggleButton) {
    console.error("[SDK Test iFrame] Required elements not found!");
    return;
  }

  const iframeUrl = (window.interactionConfig && window.interactionConfig.iframeUrl) || 
                    (window.interactionData && window.interactionData.url) ||
                    'https://en.wikipedia.org/wiki/Main_Page';
  
  externalIframe.src = iframeUrl;
  console.log("[SDK Test iFrame] Loading external URL:", iframeUrl);

  toggleButton.onclick = () => {
    buttonOverlay.classList.toggle("hidden");
    toggleButton.textContent = buttonOverlay.classList.contains("hidden") ? "⚙" : "✕";
  };

  aiSDK = createIframeAISDK();
  
  const isPreviewMode = !window.parent || window.parent === window;
  
  if (isPreviewMode) {
    updateStatus("Preview Mode - SDK will work when added to a lesson", "#ffff00");
  } else {
    updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", "#ffff00");
    
    aiSDK.isReady((ready) => {
      if (ready) {
        updateStatus("SDK Ready! All methods available.", "#00ff00");
      }
    });
  }

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
    aiSDK.getState((s) => {
      updateStatus("State: " + JSON.stringify(s).substring(0, 50), "#00ff00");
    });
  });

  const uiLabel = document.createElement("div");
  uiLabel.className = "section-label";
  uiLabel.textContent = "UI CONTROL METHODS";
  buttonsContainer.appendChild(uiLabel);

  createButton("Minimize Chat UI", () => { aiSDK.minimizeChatUI(); updateStatus("Chat UI minimized", "#00ff00"); });
  createButton("Show Chat UI", () => { aiSDK.showChatUI(); updateStatus("Chat UI shown", "#00ff00"); });
  createButton("Activate Fullscreen", () => { aiSDK.activateFullscreen(); updateStatus("Fullscreen activated", "#00ff00"); });
  createButton("Deactivate Fullscreen", () => { aiSDK.deactivateFullscreen(); updateStatus("Fullscreen deactivated", "#00ff00"); });
  createButton("Post to Chat", () => {
    aiSDK.postToChat("Test message from SDK Test interaction!", "assistant", true);
    updateStatus("Posted to chat", "#00ff00");
  });
  createButton("Show Script", () => {
    aiSDK.showScript("Test script block from SDK Test interaction.", true);
    updateStatus("Script shown", "#00ff00");
  });
  createButton("Show Snack (5s)", () => {
    aiSDK.showSnack("Test snack message!", 5000, false, () => updateStatus("Snack shown", "#00ff00"));
  });
  createButton("Hide Snack", () => { aiSDK.hideSnack(); updateStatus("Snack hidden", "#00ff00"); });

  const dataLabel = document.createElement("div");
  dataLabel.className = "section-label";
  dataLabel.textContent = "DATA STORAGE METHODS";
  buttonsContainer.appendChild(dataLabel);

  createButton("Save Instance Data", () => {
    aiSDK.saveInstanceData({ testValue: Math.random(), timestamp: Date.now(), testArray: [1, 2, 3] }, (success, error) => {
      if (success) updateStatus("Instance data saved", "#00ff00");
      else updateStatus("Error: " + error, "#ff0000");
    });
  });

  createButton("Get Instance Data History", () => {
    aiSDK.getInstanceDataHistory({ limit: 10 }, (data, error) => {
      if (data) updateStatus("History: " + data.length + " records", "#00ff00");
      else updateStatus("Error: " + error, "#ff0000");
    });
  });

  createButton("Save User Progress", () => {
    aiSDK.saveUserProgress(
      {
        score: Math.floor(Math.random() * 100),
        completed: false,
        customData: { testField: "test value", testNumber: 42 },
      },
      (progress, error) => {
        if (progress) updateStatus("Progress saved. Attempts: " + progress.attempts, "#00ff00");
        else updateStatus("Error: " + error, "#ff0000");
      }
    );
  });

  createButton("Get User Progress", () => {
    aiSDK.getUserProgress((progress, error) => {
      if (progress) updateStatus("Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed, "#00ff00");
      else if (error) updateStatus("Error: " + error, "#ff0000");
      else updateStatus("No progress found", "#ffff00");
    });
  });

  createButton("Mark Completed", () => {
    aiSDK.markCompleted((progress, error) => {
      if (progress) updateStatus("Marked as completed", "#00ff00");
      else updateStatus("Error: " + error, "#ff0000");
    });
  });

  createButton("Increment Attempts", () => {
    aiSDK.incrementAttempts((progress, error) => {
      if (progress) updateStatus("Attempts: " + progress.attempts, "#00ff00");
      else updateStatus("Error: " + error, "#ff0000");
    });
  });

  createButton("Get User Public Profile", () => {
    aiSDK.getUserPublicProfile(undefined, (profile, error) => {
      if (profile) updateStatus("Profile: " + (profile.displayName || "No name"), "#00ff00");
      else if (error) updateStatus("Error: " + error, "#ff0000");
      else updateStatus("No profile found (this is OK)", "#ffff00");
    });
  });

  console.log("[SDK Test iFrame] All buttons created");
}`;

export const SDK_TEST_IFRAME_CONFIG = {
  useOverlay: true,
  overlayMode: 'overlay' as const,
  allowFullscreen: true,
  sandbox: 'allow-scripts allow-same-origin',
};
