-- Fix dragging in PixiJS interaction
-- Issue: Stage needs to be interactive and we need to use global event listeners

UPDATE interaction_types
SET js_code = '// Get config and data
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
  
  // Make stage interactive
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;
  
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
  graphics.eventMode = "dynamic"; // Changed from "static" to "dynamic" for better interaction
  graphics.cursor = "pointer";
  
  // Add drag behavior
  let dragging = false;
  
  graphics.on("pointerdown", (event) => {
    dragging = true;
    graphics.alpha = 0.8;
    graphics.dragData = event.data;
    console.log("[PixiJS] 🖱️ Drag started");
  });
  
  graphics.on("pointermove", (event) => {
    if (dragging && graphics.dragData) {
      const newPosition = graphics.dragData.getLocalPosition(graphics.parent);
      graphics.x = newPosition.x;
      graphics.y = newPosition.y;
    }
  });
  
  graphics.on("pointerup", () => {
    if (dragging) {
      dragging = false;
      graphics.alpha = 1.0;
      console.log("[PixiJS] 🖱️ Drag ended at:", {x: graphics.x, y: graphics.y});
      graphics.dragData = null;
    }
  });
  
  graphics.on("pointerupoutside", () => {
    if (dragging) {
      dragging = false;
      graphics.alpha = 1.0;
      console.log("[PixiJS] 🖱️ Drag ended outside");
      graphics.dragData = null;
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
}'
WHERE id = 'draggable-sprite';

