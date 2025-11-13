-- Create a simple PixiJS interaction: Draggable Sprite
-- MVP with configurable sprite color and size

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
  'draggable-sprite',
  'Draggable Sprite',
  'A simple draggable sprite using PixiJS. Students can drag a colored circle around the screen. Great for teaching basic physics or interaction concepts.',
  'pixijs',
  '{}',
  'Generate a simple draggable sprite using PixiJS',
  -- HTML: Just a container for the PixiJS canvas
  '<div id="pixiContainer"></div>',
  -- CSS: Basic container styling
  'body { margin: 0; padding: 0; overflow: hidden; }
#pixiContainer { 
  width: 100%; 
  height: 600px; 
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}',
  -- JavaScript: PixiJS draggable sprite
  '// Get config and data
const config = window.interactionConfig || {};
const data = window.interactionData || {};

console.log("[PixiJS] ⚙️ Config received:", config);
console.log("[PixiJS] 🎯 Data received:", data);

// Use config values with fallbacks
const spriteColor = config.spriteColor || 0x00d4ff; // Default cyan
const spriteSize = config.spriteSize || 50; // Default 50px
const instructionText = config.instructionText || "Drag the circle!";

console.log("[PixiJS] 🎨 Using sprite color:", spriteColor);
console.log("[PixiJS] 📏 Using sprite size:", spriteSize);
console.log("[PixiJS] 📝 Using instruction:", instructionText);

// Wait for container to be ready
function initPixiWhenReady() {
  const container = document.getElementById("pixiContainer");
  if (!container) {
    console.log("[PixiJS] ⏳ Waiting for container...");
    setTimeout(initPixiWhenReady, 50);
    return;
  }
  
  console.log("[PixiJS] ✅ Container ready, initializing...");
  
  // Load PixiJS from CDN
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js";
  script.onload = function() {
    console.log("[PixiJS] ✅ PixiJS library loaded!");
    initPixiApp();
  };
  script.onerror = function() {
    console.error("[PixiJS] ❌ Failed to load PixiJS library");
    container.innerHTML = "<p style=\"color: red; padding: 2rem;\">Failed to load PixiJS. Please check your internet connection.</p>";
  };
  document.head.appendChild(script);
}

function initPixiApp() {
  const container = document.getElementById("pixiContainer");
  
  // Create PixiJS application
  const app = new PIXI.Application({
    width: 800,
    height: 600,
    backgroundColor: 0x1a1a2e,
    antialias: true
  });
  
  container.appendChild(app.view);
  console.log("[PixiJS] 🎮 Application created");
  
  // Create instruction text
  const instruction = new PIXI.Text(instructionText, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
    align: "center"
  });
  instruction.anchor.set(0.5);
  instruction.x = app.screen.width / 2;
  instruction.y = 50;
  app.stage.addChild(instruction);
  
  // Create draggable sprite (circle)
  const graphics = new PIXI.Graphics();
  
  // Convert hex string to number if needed (e.g., "#00d4ff" -> 0x00d4ff)
  let colorValue = spriteColor;
  if (typeof spriteColor === "string" && spriteColor.startsWith("#")) {
    colorValue = parseInt(spriteColor.replace("#", ""), 16);
  }
  
  graphics.beginFill(colorValue);
  graphics.drawCircle(0, 0, spriteSize);
  graphics.endFill();
  
  // Position at center
  graphics.x = app.screen.width / 2;
  graphics.y = app.screen.height / 2;
  
  // Make interactive
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  
  // Add drag behavior
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  graphics.on("pointerdown", (event) => {
    dragging = true;
    const position = event.data.global;
    dragOffset.x = position.x - graphics.x;
    dragOffset.y = position.y - graphics.y;
    graphics.alpha = 0.8;
    console.log("[PixiJS] 🖱️ Drag started");
  });
  
  app.stage.on("pointermove", (event) => {
    if (dragging) {
      const position = event.data.global;
      graphics.x = position.x - dragOffset.x;
      graphics.y = position.y - dragOffset.y;
    }
  });
  
  app.stage.on("pointerup", () => {
    if (dragging) {
      dragging = false;
      graphics.alpha = 1.0;
      console.log("[PixiJS] 🖱️ Drag ended at:", {x: graphics.x, y: graphics.y});
    }
  });
  
  app.stage.addChild(graphics);
  console.log("[PixiJS] ✅✅✅ FULLY INITIALIZED ✅✅✅");
}

// Start initialization
if (document.readyState === "complete" || document.readyState === "interactive") {
  console.log("[PixiJS] ▶️ Document ready, initializing...");
  initPixiWhenReady();
} else {
  console.log("[PixiJS] ⏳ Waiting for DOM...");
  document.addEventListener("DOMContentLoaded", initPixiWhenReady);
}',
  -- Config Schema: Define configurable values
  '{
    "fields": [
      {
        "key": "instructionText",
        "type": "string",
        "label": "Instruction Text",
        "placeholder": "e.g., Drag the circle to the target!",
        "hint": "The instruction shown at the top of the interaction",
        "default": "Drag the circle!"
      },
      {
        "key": "spriteColor",
        "type": "string",
        "label": "Sprite Color (Hex)",
        "placeholder": "#00d4ff",
        "hint": "Hex color code for the draggable circle (e.g., #ff0000 for red, #00ff00 for green)",
        "default": "#00d4ff"
      },
      {
        "key": "spriteSize",
        "type": "number",
        "label": "Sprite Size (pixels)",
        "placeholder": "50",
        "hint": "Radius of the draggable circle in pixels",
        "min": 20,
        "max": 150,
        "default": 50
      }
    ]
  }',
  -- Sample Data: Minimal (PixiJS doesn't need much data for this simple interaction)
  '{
    "message": "This is a simple draggable sprite interaction. Config values control the appearance and instructions."
  }',
  'Explore - Experiment'
);

