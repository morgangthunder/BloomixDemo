# Interaction AI SDK - Quick Reference

## Core Methods (4 methods)

### 1. emitEvent(event)
Emit event that may trigger LLM query.
```typescript
aiSDK.emitEvent({
  type: 'user-selection', // or any custom string
  data: { fragmentIndex: 0, isCorrect: true },
  requiresLLMResponse: true
});
```

### 2. getState() / updateState(key, value)
Manage interaction state accessible to LLM.
```typescript
aiSDK.updateState('attempts', 3);
const state = aiSDK.getState(); // { attempts: 3, ... }
```

### 3. onResponse(callback)
Subscribe to LLM responses.
```typescript
aiSDK.onResponse((response) => {
  console.log(response.response); // Text
  response.actions?.forEach(action => {
    if (action.type === 'highlight') highlight(action.target);
  });
});
```

### 4. requestAIResponse(prompt?)
Explicitly request AI response.
```typescript
const response = await aiSDK.requestAIResponse('Explain why this is wrong');
```

## Event Types (Standard - Custom Allowed)

Standard: `user-selection`, `user-input`, `progress-update`, `score-change`, 
`hint-request`, `explanation-request`, `interaction-started`, `interaction-completed`

Custom: Any string allowed. Configure in Interaction Builder.

## Response Structure

```typescript
{
  response: string, // Main text
  actions?: [{ type: 'highlight'|'show-hint'|'update-ui', target: string, data: any }],
  stateUpdates?: { [key: string]: any }
}
```

## Example: True/False Interaction

```typescript
export class MyInteraction {
  constructor(private aiSDK: InteractionAISDK) {
    aiSDK.onResponse((r) => {
      r.actions?.forEach(a => {
        if (a.type === 'highlight') this.highlight(a.target);
      });
    });
  }
  
  onSelect(index: number) {
    aiSDK.emitEvent({
      type: 'user-selection',
      data: { index, isCorrect: this.isCorrect(index) },
      requiresLLMResponse: true
    });
  }
}
```

## Image Generation

### generateImage(options)
Generate images using the Google Gemini image generator. The image generator uses prompts configured in Super Admin at `/super-admin/ai-prompts?assistant=image-generator`.

```typescript
// Basic usage
const result = await aiSDK.generateImage({
  prompt: 'A diagram showing the water cycle',
  userInput: 'Make it colorful and educational',
  screenshot: base64Screenshot, // Optional: include screenshot for context
  customInstructions: 'Focus on evaporation and condensation' // Optional: builder-defined instructions
});

if (result.success) {
  if (result.imageUrl) {
    // Image is available as URL
    const img = document.createElement('img');
    img.src = result.imageUrl;
    document.body.appendChild(img);
  } else if (result.imageData) {
    // Image is available as base64 data
    const img = document.createElement('img');
    img.src = result.imageData.startsWith('data:') 
      ? result.imageData 
      : `data:image/png;base64,${result.imageData}`;
    document.body.appendChild(img);
  }
  
  // Emit event that image is ready (can trigger other interactions)
  aiSDK.emitEvent({
    type: 'image-generated',
    data: {
      imageUrl: result.imageUrl,
      imageData: result.imageData,
      requestId: result.requestId,
    },
    requiresLLMResponse: false,
  });
} else {
  console.error('Image generation failed:', result.error);
}
```

**Parameters:**
- `prompt` (required): Main image generation prompt
- `userInput` (optional): Additional user input to append to the prompt
- `screenshot` (optional): Base64-encoded screenshot to include for context
- `customInstructions` (optional): Builder-defined custom instructions from interaction configuration
- `width` (optional): Image width in pixels (e.g., 1024, 512)
- `height` (optional): Image height in pixels (e.g., 1024, 512)
- `lessonId` (optional): Override current lesson ID (defaults to current lesson)
- `substageId` (optional): Substage ID for tracking
- `interactionId` (optional): Interaction ID for tracking
- `accountId` (optional): Account ID (defaults to current user)

**Response:**
- `success`: Boolean indicating if generation was successful
- `imageUrl`: URL to the persisted image in MinIO/S3 (if saved)
- `imageData`: Base64-encoded image data (always returned for immediate display)
- `imageId`: Database ID of the saved image record (if persisted)
- `error`: Error message if generation failed
- `requestId`: Unique request ID for tracking

**Image Persistence:**
- Images are automatically saved to MinIO/S3 storage when `lessonId` and `accountId` are provided
- Images are stored in account-specific folders: `images/{accountId}/`
- Image metadata (dimensions, prompt, timestamps) is stored in the database
- Both `imageUrl` (persisted) and `imageData` (base64) are returned for flexibility

**Configuration:**
API configuration is managed in Super Admin at `/super-admin/ai-prompts?assistant=image-generator`:
- **default**: Prompt template (use `{prompt}` placeholder for user prompt)
- **api-config**: JSON configuration with `apiEndpoint`, `apiKey`, `apiKeyHeader`, `model`, `width`, `height`, etc.

**Event Triggering:**
When an image is successfully generated, you can emit an `image-generated` event to trigger other interactions or update UI state. The event includes the image URL/data and request ID.

### getLessonImages(lessonId?, accountId?)
Retrieve **all images** generated for a lesson, ordered by creation date (newest first). Useful for displaying previously generated images or building image galleries.

**Returns all images** associated with the lesson. Use the image `id` to reference specific images.

```typescript
// Get all images for current lesson (lessonId and accountId are automatically inferred)
const images = await aiSDK.getLessonImages();

if (images && images.length > 0) {
  console.log(`Found ${images.length} images for this lesson`);
  
  // Display all images in a gallery
  images.forEach((image, index) => {
    console.log(`Image ${index + 1}:`);
    console.log(`  ID: ${image.id}`);
    console.log(`  URL: ${image.imageUrl}`);
    console.log(`  Prompt: ${image.prompt}`);
    console.log(`  Dimensions: ${image.width}x${image.height}`);
    console.log(`  Created: ${image.createdAt}`);
    
    // Display image in your UI (e.g., PixiJS gallery)
    displayImageInGallery(image);
  });
  
  // Reference a specific image by ID
  const firstImage = images[0]; // Most recent image
  const specificImage = images.find(img => img.id === 'desired-image-id');
  
} else {
  console.log('No images found for this lesson');
}

// Get images for a specific lesson ID
const specificLessonImages = await aiSDK.getLessonImages('some-lesson-id');

// Get images filtered by account ID (only images generated by that account)
const accountImages = await aiSDK.getLessonImages('some-lesson-id', 'some-account-id');
```

**Parameters:**
- `lessonId` (optional): The ID of the lesson to retrieve images for. If not provided, the SDK will use the `lessonId` from the current interaction context.
- `accountId` (optional): The ID of the account that generated the images. If not provided, returns images from **all accounts** for the lesson. Use this to filter images by the account that created them.

**Response:**
Returns an **array** of `GeneratedImageResponse` objects directly (not wrapped in an object). Each image object contains:
- `id`: Unique image ID (use this to reference specific images)
- `lessonId`: Lesson ID this image belongs to
- `accountId`: Account ID that generated the image
- `imageUrl`: URL to the image (signed URL for S3/MinIO, direct URL for local storage)
- `mimeType`: Image MIME type (e.g., 'image/png')
- `width`: Image width in pixels (or null)
- `height`: Image height in pixels (or null)
- `prompt`: The prompt used to generate the image
- `substageId`: Substage ID where image was generated (or null)
- `interactionId`: Interaction ID where image was generated (or null)
- `metadata`: Additional metadata (model used, tokens, etc.)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Working with Multiple Images:**

When a lesson has multiple images, `getLessonImages()` returns **all images** ordered by creation date (newest first). You can:

1. **Display all images in a gallery:**
```typescript
const images = await aiSDK.getLessonImages();
images.forEach(image => {
  // Create gallery item for each image
  createGalleryItem(image);
});
```

2. **Reference specific images by ID:**
```typescript
const images = await aiSDK.getLessonImages();
const imageById = images.find(img => img.id === 'specific-image-id');
if (imageById) {
  displayImage(imageById.imageUrl);
}
```

3. **Filter by metadata:**
```typescript
const images = await aiSDK.getLessonImages();
// Get images generated in this interaction
const imagesFromThisInteraction = images.filter(img => 
  img.interactionId === aiSDK.currentInteractionId
);
// Get images from a specific substage
const substageImages = images.filter(img => 
  img.substageId === 'specific-substage-id'
);
```

4. **Get the most recent image:**
```typescript
const images = await aiSDK.getLessonImages();
const mostRecent = images[0]; // First item is newest (ordered by createdAt DESC)
if (mostRecent) {
  displayImage(mostRecent.imageUrl);
}
```

**Note:** Images are automatically associated with the lesson when generated using `generateImage()`. The `lessonId` and `accountId` are automatically set from the current interaction context.

### deleteImage(imageId)
Delete an image by ID. This permanently removes the image from storage and the database.

**Parameters:**
- `imageId` (string, required): The ID of the image to delete

**Returns:** Promise with `{ success: boolean, error?: string }`

**Example:**
```typescript
// Delete a specific image
const result = await aiSDK.deleteImage('image-id-here');

if (result.success) {
  console.log('Image deleted successfully');
  // Update your UI (e.g., remove from gallery)
  removeImageFromGallery('image-id-here');
} else {
  console.error('Failed to delete image:', result.error);
}
```

**Note:** 
- The image file is deleted from storage (MinIO/S3)
- The image record is removed from the database
- This operation cannot be undone
- Only images associated with the current lesson/account context can be deleted (enforced by backend)

## Adding HTML Elements to PixiJS Interactions

For PixiJS category interactions, you can add HTML elements (inputs, divs, etc.) that are perfectly aligned with your PixiJS elements using the **container-based positioning approach**.

### Container-Based Positioning (Recommended)

**Always use container-based positioning** to ensure perfect alignment and automatic scroll synchronization:

1. **Create your PixiJS element** (button, sprite, container)
2. **Create your HTML element**
3. **Attach the HTML element to the PixiJS container** using `attachHtmlToPixiElement()`

This ensures:
- ✅ Perfect alignment (HTML position calculated from container's world position)
- ✅ Automatic scroll synchronization (containers move with canvas, so HTML moves too)
- ✅ Transform support (rotations, scales, etc. handled automatically)
- ✅ No coordinate conversion needed
- ✅ No manual repositioning loops

### Example: Input Field Beside a Button

```javascript
// 1. Create your PixiJS button
const buttonContainer = createButton("Click Me", onClick);

// 2. Create your HTML input
const input = document.createElement('input');
input.type = 'text';
input.placeholder = 'Enter text...';
input.style.width = '200px';
input.style.padding = '8px';
input.style.border = '2px solid #00d4ff';
input.style.borderRadius = '4px';
input.style.background = 'rgba(15, 15, 35, 0.9)';
input.style.color = '#ffffff';
document.body.appendChild(input);

// 3. Attach HTML to PixiJS container
aiSDK.attachHtmlToPixiElement(input, buttonContainer, {
  offsetX: buttonContainer.width + 10, // Position to the right of button
  offsetY: 0,
  anchor: 'center-left', // Anchor point on the button
  zIndex: 1000
});
```

### Helper: createInputForButton()

For common cases, use the helper function:

```javascript
// Creates an input and attaches it automatically
const input = aiSDK.createInputForButton(buttonContainer, {
  placeholder: 'Enter text...',
  width: 200,
  inputId: 'my-input',
  offsetX: 10, // Additional spacing
  offsetY: 0
});
```

### Helper: createHtmlElementForContainer()

Create any HTML element and attach it:

```javascript
const div = aiSDK.createHtmlElementForContainer('div', pixiContainer, {
  innerHTML: '<p>Some text</p>',
  className: 'my-class',
  id: 'my-element',
  offsetX: 0,
  offsetY: 0,
  anchor: 'center',
  zIndex: 1000
});
```

### Anchor Points

The `anchor` option determines which point on the PixiJS container the HTML element is positioned relative to:

- `'center'` (default): Center of container
- `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`: Corners
- `'top'`, `'bottom'`, `'left'`, `'right'`: Edges
- `'center-left'`, `'center-right'`, `'top-center'`, `'bottom-center'`: Center of edges

### Z-Index Guidelines

- **Input fields and interactive HTML**: `zIndex: 1000` (always on top)
- **Text displays and labels**: `zIndex: 5-10` (above canvas, below inputs)
- **PixiJS canvas**: default z-index (rendered on canvas, no HTML z-index)

### Step 1: Add Input Field to HTML Code

In the Interaction Builder, add your input field to the **HTML Code** section:

```html
<div id="pixi-container"></div>
<input 
  type="text" 
  id="my-input-field" 
  placeholder="Enter your text here..." 
  style="position: absolute; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" 
/>
```

**Key Points:**
- Use `position: absolute` to overlay the input on the canvas
- Set `z-index: 1000` to ensure it appears above the canvas
- **Don't set `left` and `top` in HTML** - position dynamically in JavaScript (see Step 3)
- Style to match your interaction's theme

### Step 2: Style with CSS Code (Optional)

In the **CSS Code** section, you can add additional styling:

```css
#pixi-container { 
  width: 100%; 
  height: 100%; 
}

#my-input-field {
  font-family: inherit;
  transition: border-color 0.3s;
}

#my-input-field:focus {
  border-color: #00ff00;
  outline: none;
}
```

### Step 3: Access and Position Input in JavaScript Code

In your **JavaScript Code** section, access the input field and position it beside your PixiJS buttons:

```javascript
// The SDK provides positionInputBesideButton - no need to write your own!
// Just use: aiSDK.positionInputBesideButton(inputElement, buttonContainer, offsetX, offsetY, buttonWidth)

// Get the input field
const myInput = document.getElementById("my-input-field");

if (!myInput) {
  console.warn("Input field not found. Make sure HTML code includes the input element.");
}

// Create a button and position input beside it
const myButton = createButton("Submit", () => {
  const value = myInput.value.trim();
  console.log("User entered:", value);
  // Use the value...
});

// Position input beside the button (after button is created)
if (myInput && myButton) {
  positionInputBesideButton(myInput, myButton, 0, 2);
}

// Listen for input changes
if (myInput) {
  myInput.addEventListener("input", (e) => {
    const value = e.target.value;
    // Update PixiJS UI, state, or trigger events
  });
  
  // Get value when needed
  const currentValue = myInput.value.trim();
  
  // Use with image generation
  aiSDK.generateImage({
    prompt: myInput.value,
    userInput: "User entered: " + myInput.value
  }, (response) => {
    if (response.success) {
      // Display image in PixiJS canvas
      displayImageInCanvas(response.imageData);
    }
  });
}
```

**Positioning Strategy:**
- Calculate button positions after creating them
- Position inputs to the right of buttons (button width + 10px spacing)
- For multiple inputs, stack them vertically (offsetY: 0, 30, 60, etc.)
- **Update positions dynamically when canvas resizes** (see complete example below)

**Complete Example with Resize Handling:**

```javascript
// The SDK provides these utilities - no need to write them yourself!
// aiSDK.positionInputBesideButton() - positions input beside button and tracks it for resize
// aiSDK.repositionAllInputs() - repositions all tracked inputs

// Get the input field
const myInput = document.getElementById("my-input-field");

// Create a button and position input beside it
const myButton = createButton("Submit", () => {
  const value = myInput.value.trim();
  console.log("User entered:", value);
});

// Position input beside the button (after button is created)
if (myInput && myButton) {
  positionInputBesideButton(myInput, myButton, 0, 2);
}

// Listen for window resize
window.addEventListener("resize", () => {
  // Resize canvas if needed
  app.renderer.resize(newWidth, newHeight);
  // Reposition all inputs using SDK utility
  aiSDK.repositionAllInputs();
});

// Also listen for PixiJS renderer resize
app.renderer.on("resize", () => {
  aiSDK.repositionAllInputs();
});
```

**Why Resize Handling Matters:**
- PixiJS canvas can resize (user interaction, content changes, window resize)
- HTML inputs positioned absolutely need to move with their associated buttons
- Without resize handling, inputs can drift out of alignment
- This ensures inputs stay beside buttons regardless of canvas size changes

**See the SDK Test PixiJS interaction for a complete working example.**

### Complete Example: Image Generation with Input Field

**HTML Code:**
```html
<div id="pixi-container"></div>
<input 
  type="text" 
  id="image-prompt-input" 
  placeholder="Enter image generation prompt..." 
  style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" 
/>
```

**CSS Code:**
```css
#pixi-container { width: 100%; height: 100%; }
#image-prompt-input { font-family: inherit; }
```

**JavaScript Code:**
```javascript
// Initialize PixiJS
const app = new PIXI.Application({ width: 800, height: 600 });
document.getElementById("pixi-container").appendChild(app.view);

// Get input field
const promptInput = document.getElementById("image-prompt-input");

// Create button in PixiJS
const button = new PIXI.Graphics();
button.beginFill(0x00d4ff);
button.drawRect(0, 0, 200, 40);
button.endFill();
button.x = 20;
button.y = 60;
button.interactive = true;
button.buttonMode = true;

const buttonText = new PIXI.Text("Generate Image", { fill: 0xffffff });
buttonText.x = 10;
buttonText.y = 10;
button.addChild(buttonText);

button.on("pointerdown", () => {
  if (!promptInput || !promptInput.value.trim()) {
    alert("Please enter a prompt");
    return;
  }
  
  aiSDK.generateImage({
    prompt: promptInput.value.trim()
  }, (response) => {
    if (response.success && response.imageData) {
      // Load and display image in PixiJS
      PIXI.Assets.load(response.imageData).then((texture) => {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = 20;
        sprite.y = 120;
        sprite.width = 400;
        sprite.height = 300;
        app.stage.addChild(sprite);
      });
    }
  });
});

app.stage.addChild(button);
```

### Best Practices

1. **Always check if input exists**: Use `if (inputElement)` before accessing properties
2. **Position carefully**: Use absolute positioning to avoid layout conflicts with PixiJS
3. **Handle edge cases**: Check for empty values before using input data
4. **Style consistently**: Match input styling to your PixiJS interaction theme
5. **Accessibility**: Consider adding labels and ARIA attributes for screen readers

### Multiple Input Fields

You can add multiple input fields by giving each a unique ID:

```html
<input id="prompt-input" ... />
<input id="user-name-input" ... />
<input id="settings-input" ... />
```

Then access each in JavaScript:
```javascript
const promptInput = document.getElementById("prompt-input");
const nameInput = document.getElementById("user-name-input");
const settingsInput = document.getElementById("settings-input");
```

## HTML/PixiJS Coordinate Transformation

The SDK provides functions to convert between PixiJS world coordinates and HTML screen coordinates, enabling precise positioning of HTML elements relative to PixiJS objects.

### `convertPixiToScreen(pixiX, pixiY, pixiContainer)`

Converts PixiJS world coordinates to HTML screen coordinates.

**Parameters:**
- `pixiX` (number): X coordinate in PixiJS world space
- `pixiY` (number): Y coordinate in PixiJS world space
- `pixiContainer` (PIXI.Container): The PixiJS container to use as reference

**Returns:** `{ x: number, y: number }` - Screen coordinates

**Example:**
```javascript
const screenPos = aiSDK.convertPixiToScreen(100, 150, myPixiContainer);
console.log(`Screen position: ${screenPos.x}, ${screenPos.y}`);
```

### `convertScreenToPixi(screenX, screenY, pixiContainer)`

Converts HTML screen coordinates to PixiJS world coordinates.

**Parameters:**
- `screenX` (number): X coordinate in screen space
- `screenY` (number): Y coordinate in screen space
- `pixiContainer` (PIXI.Container): The PixiJS container to use as reference

**Returns:** `{ x: number, y: number }` - PixiJS world coordinates

**Example:**
```javascript
const pixiPos = aiSDK.convertScreenToPixi(500, 300, myPixiContainer);
console.log(`PixiJS position: ${pixiPos.x}, ${pixiPos.y}`);
```

### `getViewTransform(pixiContainer)`

Gets the current view transform (scale, position, rotation) of a PixiJS container.

**Parameters:**
- `pixiContainer` (PIXI.Container): The PixiJS container

**Returns:** `{ scale: { x: number, y: number }, x: number, y: number, rotation: number, pivot: { x: number, y: number } }`

**Example:**
```javascript
const transform = aiSDK.getViewTransform(myPixiContainer);
console.log(`Zoom: ${transform.scale.x}, Position: ${transform.x}, ${transform.y}`);
```

## HTML Element Attachment to PixiJS

The SDK provides functions to attach HTML elements to PixiJS containers, with automatic repositioning when the PixiJS object moves or transforms.

### `attachHtmlToPixiElement(htmlElement, pixiContainer, options)`

Attaches an HTML element to a PixiJS container/sprite. The HTML element will automatically reposition when the PixiJS element moves or transforms.

**Parameters:**
- `htmlElement` (HTMLElement): The HTML element to attach
- `pixiContainer` (PIXI.Container or PIXI.Sprite): The PixiJS container to attach to
- `options` (object, optional):
  - `offsetX` (number, default: 0): Horizontal offset from anchor point
  - `offsetY` (number, default: 0): Vertical offset from anchor point
  - `anchor` (string, default: 'center'): Anchor point - 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'
  - `updateOnTransform` (boolean, default: true): Automatically update position when container transforms
  - `zIndex` (number, default: 1000): CSS z-index for the HTML element

**Returns:** Attachment object (for reference)

**Example:**
```javascript
const tooltip = document.createElement('div');
tooltip.textContent = 'Tooltip text';
tooltip.style.cssText = 'background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 4px;';

aiSDK.attachHtmlToPixiElement(tooltip, myPixiSprite, {
  offsetY: -30, // Place 30px above
  anchor: 'top',
  zIndex: 1001
});
```

### `updateAllAttachedHtml()`

Manually updates the position of all attached HTML elements. Call this after programmatic changes to PixiJS containers.

**Example:**
```javascript
// Move a PixiJS container
myContainer.x = 100;
myContainer.y = 200;

// Update all attached HTML elements
aiSDK.updateAllAttachedHtml();
```

### `detachHtmlFromPixiElement(htmlElement)`

Detaches an HTML element from its PixiJS container.

**Parameters:**
- `htmlElement` (HTMLElement): The HTML element to detach

**Returns:** `boolean` - `true` if detached, `false` if not found

**Example:**
```javascript
aiSDK.detachHtmlFromPixiElement(tooltip);
```

### `attachInputToImageArea(inputElement, imageSprite, options)`

Attaches an HTML input element to specific coordinates on an image (in image space, not screen space). Useful for annotations or data collection on images.

**Parameters:**
- `inputElement` (HTMLElement): The HTML input element
- `imageSprite` (PIXI.Sprite): The image sprite
- `options` (object, optional):
  - `imageX` (number, default: 0): X coordinate in image space
  - `imageY` (number, default: 0): Y coordinate in image space
  - `offsetX` (number, default: 0): Horizontal offset
  - `offsetY` (number, default: -30): Vertical offset (negative places above)
  - `anchor` (string, default: 'center'): Anchor point
  - `updateOnZoom` (boolean, default: true): Update position when zoom changes
  - `updateOnPan` (boolean, default: true): Update position when pan changes

**Example:**
```javascript
const annotationInput = document.getElementById('annotation-input');
aiSDK.attachInputToImageArea(annotationInput, imageSprite, {
  imageX: 200, // 200px from left of image
  imageY: 150, // 150px from top of image
  offsetY: -40, // Place 40px above the point
  updateOnZoom: true,
  updateOnPan: true
});
```

## Zoom and Pan Management

The SDK provides a comprehensive zoom/pan system for PixiJS containers, with support for mouse wheel, drag-to-pan, and touch gestures.

### `setupZoomPan(pixiContainer, options)`

Sets up zoom and pan controls for a PixiJS container.

**Parameters:**
- `pixiContainer` (PIXI.Container): The container to enable zoom/pan for
- `options` (object, optional):
  - `minZoom` (number, default: 0.5): Minimum zoom level
  - `maxZoom` (number, default: 3.0): Maximum zoom level
  - `initialZoom` (number, default: 1.0): Initial zoom level
  - `enablePinchZoom` (boolean, default: true): Enable pinch zoom on touch devices
  - `enableWheelZoom` (boolean, default: true): Enable mouse wheel zoom
  - `enableDrag` (boolean, default: true): Enable click and drag to pan
  - `showZoomControls` (boolean, default: true): Show zoom control bar UI
  - `zoomControlPosition` (string, default: 'top-right'): Position of zoom controls - 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  - `onZoomChange` (function, optional): Callback when zoom changes - `(zoom) => {}`
  - `onPanChange` (function, optional): Callback when pan changes - `(x, y) => {}`

**Returns:** Zoom/Pan instance object with methods:
- `setZoom(zoom, centerX?, centerY?)` - Set zoom level
- `setPan(x, y)` - Set pan position
- `resetView()` - Reset to initial zoom/pan
- `getZoom()` - Get current zoom level
- `getPan()` - Get current pan position
- `destroy()` - Remove zoom/pan controls

**Example:**
```javascript
// Setup zoom/pan for an image
const zoomPan = aiSDK.setupZoomPan(imageSprite, {
  minZoom: 0.5,
  maxZoom: 4.0,
  enablePinchZoom: true,
  enableWheelZoom: true,
  enableDrag: true,
  showZoomControls: true,
  onZoomChange: (zoom) => {
    console.log('Zoom changed to:', zoom);
    // Update attached HTML elements
    aiSDK.updateAllAttachedHtml();
  },
  onPanChange: (x, y) => {
    console.log('Pan changed to:', x, y);
    // Update attached HTML elements
    aiSDK.updateAllAttachedHtml();
  }
});

// Programmatic control
zoomPan.setZoom(2.0); // Zoom to 2x
zoomPan.setPan(100, 50); // Pan to position
zoomPan.resetView(); // Reset to initial state
```

**Features:**
- **Mouse wheel zoom**: Scroll to zoom in/out
- **Click and drag**: Click and drag to pan around
- **Touch pinch zoom**: Pinch with two fingers to zoom
- **Single touch pan**: Drag with one finger to pan
- **Zoom control bar**: Optional UI with zoom in, zoom out, and reset buttons
- **Automatic HTML repositioning**: Attached HTML elements automatically reposition on zoom/pan

## Hotspot Creation

The SDK provides functions to create clickable hotspots on images, perfect for interactive image exploration interactions.

### `createHotspot(imageSprite, options)`

Creates a clickable hotspot on an image sprite.

**Parameters:**
- `imageSprite` (PIXI.Sprite): The image sprite to add hotspot to
- `options` (object, optional):
  - `x` (number, default: 0): X coordinate in image space
  - `y` (number, default: 0): Y coordinate in image space
  - `radius` (number, default: 20): Clickable radius (for circle shape)
  - `shape` (string, default: 'circle'): Shape type - 'circle', 'rect', 'polygon'
  - `width` (number, optional): Width for rect shape
  - `height` (number, optional): Height for rect shape
  - `points` (array, optional): Points array for polygon shape - `[{x, y}, ...]`
  - `visible` (boolean, default: false): Show visual indicator
  - `color` (number, default: 0x00ff00): Color of visual indicator (hex)
  - `alpha` (number, default: 0.3): Transparency of visual indicator (0-1)
  - `cursor` (string, default: 'pointer'): Cursor style on hover
  - `id` (string, optional): Unique ID for the hotspot (auto-generated if not provided)
  - `onHover` (function, optional): Callback on hover - `(hotspot) => {}`
  - `onLeave` (function, optional): Callback on leave - `(hotspot) => {}`
  - `onClick` (function, optional): Callback on click - `(hotspot, event) => {}`

**Returns:** Hotspot object with methods:
- `setVisible(visible)` - Show/hide visual indicator
- `setPosition(newX, newY)` - Move hotspot to new position
- `destroy()` - Remove hotspot

**Example:**
```javascript
// Create a visible hotspot
const hotspot = aiSDK.createHotspot(imageSprite, {
  x: 200,
  y: 150,
  radius: 25,
  shape: 'circle',
  visible: true,
  color: 0x00ff00,
  alpha: 0.3,
  id: 'object-1',
  onHover: (hotspot) => {
    console.log('Hovering over hotspot:', hotspot.id);
    // Show tooltip
  },
  onLeave: (hotspot) => {
    console.log('Left hotspot:', hotspot.id);
    // Hide tooltip
  },
  onClick: (hotspot, event) => {
    console.log('Clicked hotspot:', hotspot.id);
    aiSDK.showSnack('Correct! You found the object.', 3000);
    aiSDK.emitEvent({
      type: 'hotspot-clicked',
      data: { hotspotId: hotspot.id, correct: true },
      requiresLLMResponse: true
    });
  }
});

// Create invisible hotspot (for hidden clickable areas)
const hiddenHotspot = aiSDK.createHotspot(imageSprite, {
  x: 300,
  y: 200,
  radius: 30,
  visible: false, // Invisible but still clickable
  onClick: (hotspot) => {
    aiSDK.showSnack('You found a hidden area!', 2000);
  }
});

// Create rectangular hotspot
const rectHotspot = aiSDK.createHotspot(imageSprite, {
  x: 100,
  y: 100,
  shape: 'rect',
  width: 80,
  height: 60,
  visible: true,
  color: 0xff0000,
  onClick: (hotspot) => {
    console.log('Clicked rectangular area');
  }
});
```

### `createHotspots(imageSprite, hotspotConfigs)`

Creates multiple hotspots from a configuration array.

**Parameters:**
- `imageSprite` (PIXI.Sprite): The image sprite
- `hotspotConfigs` (array): Array of hotspot option objects

**Returns:** Array of hotspot objects

**Example:**
```javascript
const hotspots = aiSDK.createHotspots(imageSprite, [
  {
    x: 100,
    y: 150,
    radius: 20,
    id: 'object-1',
    visible: true,
    onClick: (hotspot) => {
      aiSDK.showSnack('Found object 1!', 2000);
    }
  },
  {
    x: 300,
    y: 200,
    radius: 25,
    id: 'object-2',
    visible: true,
    onClick: (hotspot) => {
      aiSDK.showSnack('Found object 2!', 2000);
    }
  },
  {
    x: 500,
    y: 100,
    radius: 30,
    id: 'object-3',
    visible: false, // Hidden hotspot
    onClick: (hotspot) => {
      aiSDK.showSnack('Found hidden object!', 2000);
    }
  }
]);
```

## Complete Example: Image Exploration Interaction

Here's a complete example combining all the new functions for an image exploration interaction:

```javascript
// 1. Load image
const imageTexture = await PIXI.Assets.load('path/to/image.png');
const imageSprite = new PIXI.Sprite(imageTexture);
imageSprite.x = 0;
imageSprite.y = 0;
app.stage.addChild(imageSprite);

// 2. Setup zoom/pan
const zoomPan = aiSDK.setupZoomPan(imageSprite, {
  minZoom: 0.5,
  maxZoom: 3.0,
  enablePinchZoom: true,
  enableWheelZoom: true,
  enableDrag: true,
  showZoomControls: true,
  onZoomChange: () => {
    aiSDK.updateAllAttachedHtml();
  },
  onPanChange: () => {
    aiSDK.updateAllAttachedHtml();
  }
});

// 3. Create hotspots for clickable areas
const hotspots = aiSDK.createHotspots(imageSprite, [
  {
    x: 100,
    y: 150,
    radius: 20,
    id: 'object-1',
    visible: true,
    color: 0x00ff00,
    alpha: 0.3,
    onClick: (hotspot) => {
      aiSDK.showSnack('Correct! You found object 1.', 3000);
      aiSDK.emitEvent({
        type: 'hotspot-clicked',
        data: { hotspotId: hotspot.id, correct: true },
        requiresLLMResponse: true
      });
    }
  },
  {
    x: 300,
    y: 200,
    radius: 25,
    id: 'object-2',
    visible: true,
    color: 0xff0000,
    alpha: 0.3,
    onClick: (hotspot) => {
      aiSDK.showSnack('Incorrect. Try again.', 2000);
      aiSDK.emitEvent({
        type: 'hotspot-clicked',
        data: { hotspotId: hotspot.id, correct: false },
        requiresLLMResponse: true
      });
    }
  }
]);

// 4. Attach HTML input to specific image area
const annotationInput = document.getElementById('annotation-input');
aiSDK.attachInputToImageArea(annotationInput, imageSprite, {
  imageX: 200,
  imageY: 100,
  offsetY: -40,
  updateOnZoom: true,
  updateOnPan: true
});

// 5. Handle annotation submission
document.getElementById('submit-annotation').addEventListener('click', () => {
  const text = annotationInput.value.trim();
  if (text) {
    aiSDK.emitEvent({
      type: 'annotation-submitted',
      data: { text, imageX: 200, imageY: 100 },
      requiresLLMResponse: true
    });
  }
});
```

This example demonstrates:
- Image loading and display
- Zoom/pan with touch and mouse support
- Clickable hotspots with visual feedback
- HTML input attached to image coordinates
- Automatic repositioning during zoom/pan
- Event emission for AI Teacher integration
