-- Create iFrame Interaction Type
-- Simple iframe embed with configurable URL and display settings

INSERT INTO interaction_types (
  id,
  name,
  description,
  interaction_type_category,
  schema,
  generation_prompt,
  html_code,
  css_code,
  js_code,
  config_schema,
  sample_data,
  teach_stage_fit
) VALUES (
  'iframe-embed',
  'iFrame Embed',
  'Embed external content via iframe. Perfect for displaying websites, videos, interactive tools, or any web-based content within a lesson.',
  'iframe',
  '{}',
  'Generate an iframe embed configuration for external content',
  -- HTML: Simple container for the iframe
  '<div id="iframeContainer">
  <iframe id="contentFrame" 
          frameborder="0" 
          allowfullscreen 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
  </iframe>
</div>',
  -- CSS: Responsive iframe styling
  'body { 
  margin: 0; 
  padding: 0; 
  overflow: hidden;
  background: #1a1a2e;
}

#iframeContainer { 
  width: 100%; 
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
}

#contentFrame {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0.5rem;
}',
  -- JavaScript: Set iframe src from config
  '// Get config from parent
const config = window.interactionConfig || {};
const data = window.interactionData || {};

console.log("[iFrame] ⚙️ Config received:", config);
console.log("[iFrame] 🎯 Data received:", data);

// Use URL from config, fallback to data
const iframeUrl = config.url || data.url || "";
const iframeWidth = config.width || "100%";
const iframeHeight = config.height || "100%";
const allowFeatures = config.allow || "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

console.log("[iFrame] 🔗 URL:", iframeUrl);
console.log("[iFrame] 📐 Dimensions:", iframeWidth, "x", iframeHeight);

function initializeWhenReady() {
  const container = document.getElementById("iframeContainer");
  const iframe = document.getElementById("contentFrame");
  
  if (!container || !iframe) {
    console.log("[iFrame] ⏳ Waiting for DOM...");
    setTimeout(initializeWhenReady, 50);
    return;
  }
  
  console.log("[iFrame] ✅ DOM ready, initializing...");
  
  if (!iframeUrl) {
    container.innerHTML = `
      <div style="text-align: center; color: #ffc107; padding: 2rem;">
        <h3>⚠️ No URL Configured</h3>
        <p>Please configure an iframe URL to display content.</p>
      </div>
    `;
    console.log("[iFrame] ⚠️ No URL provided");
    return;
  }
  
  // Set iframe attributes
  iframe.src = iframeUrl;
  iframe.style.width = iframeWidth;
  iframe.style.height = iframeHeight;
  iframe.setAttribute("allow", allowFeatures);
  
  console.log("[iFrame] ✅✅✅ IFRAME INITIALIZED ✅✅✅");
  console.log("[iFrame] 🌐 Loading:", iframeUrl);
}

// Wait for DOM
if (document.readyState === "complete" || document.readyState === "interactive") {
  console.log("[iFrame] ▶️ Document ready, initializing now...");
  initializeWhenReady();
} else {
  console.log("[iFrame] ⏳ Document not ready, adding listener...");
  document.addEventListener("DOMContentLoaded", initializeWhenReady);
}',
  -- Config Schema: URL and display settings
  '{
    "fields": [
      {
        "key": "url",
        "type": "string",
        "label": "iFrame URL",
        "required": true,
        "placeholder": "https://example.com",
        "hint": "The URL of the content to embed. Must be a valid web address that allows embedding."
      },
      {
        "key": "width",
        "type": "string",
        "label": "Width",
        "default": "100%",
        "placeholder": "100% or 800px",
        "hint": "Width of the iframe (e.g., 100%, 800px). Default: 100%"
      },
      {
        "key": "height",
        "type": "string",
        "label": "Height",
        "default": "600px",
        "placeholder": "600px or 100%",
        "hint": "Height of the iframe (e.g., 600px, 100vh). Default: 600px"
      },
      {
        "key": "allow",
        "type": "string",
        "label": "Allow Permissions",
        "default": "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        "multiline": true,
        "rows": 3,
        "placeholder": "accelerometer; autoplay; clipboard-write",
        "hint": "Semicolon-separated list of iframe permissions. Controls what features the embedded content can access."
      }
    ]
  }',
  -- Sample Data: Example URL
  '{
    "url": "https://www.example.com"
  }',
  'Explore - Experiment'
);

