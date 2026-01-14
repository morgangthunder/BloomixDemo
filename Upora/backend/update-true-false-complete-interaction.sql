-- Update true-false-selection interaction to use aiSDK.completeInteraction() when Next button is clicked
-- This replaces the alert with the proper SDK method call

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '    nextBtn.addEventListener("click", () => {
        alert("Interaction Completed! (Next button clicked)");
        closeScoreModal();
    });',
  '    nextBtn.addEventListener("click", () => {
        console.log("[Interaction] Next button clicked, completing interaction...");
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
            console.log("[Interaction] ✅ Called aiSDK.completeInteraction()");
        } else {
            console.warn("[Interaction] ⚠️ AI SDK not available or completeInteraction method not found");
            alert("Interaction Completed! (SDK not available)");
        }
        closeScoreModal();
    });'
)
WHERE id = 'true-false-selection';

-- Also update the complete() function if it exists
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '    function complete() {
        console.log("[Interaction] ▶️ Completing interaction...");
        alert("Interaction Completed! (In a real app, this would save progress)");
        closeScoreModal();
    }',
  '    function complete() {
        console.log("[Interaction] ▶️ Completing interaction...");
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
            console.log("[Interaction] ✅ Called aiSDK.completeInteraction()");
        } else {
            console.warn("[Interaction] ⚠️ AI SDK not available or completeInteraction method not found");
            alert("Interaction Completed! (SDK not available)");
        }
        closeScoreModal();
    }'
)
WHERE id = 'true-false-selection';

-- Ensure the SDK is initialized and available as window.aiSDK
-- Add SDK initialization at the start of the script if not already present
UPDATE interaction_types
SET js_code = CASE
  WHEN js_code NOT LIKE '%createIframeAISDK%' THEN
    '// Initialize AI SDK
const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;
  const generateRequestId = () => `req-${Date.now()}-${++requestCounter}`;
  const generateSubscriptionId = () => `sub-${Date.now()}-${Math.random()}`;
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
    completeInteraction: () => {
      sendMessage("ai-sdk-complete-interaction", {});
    }
  };
};

// Make SDK available globally
window.aiSDK = createIframeAISDK();

' || js_code
  ELSE js_code
END
WHERE id = 'true-false-selection' AND js_code NOT LIKE '%window.aiSDK = createIframeAISDK()%';
