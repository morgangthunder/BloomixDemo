# AI Teacher SDK for Iframe Interactions

This guide explains how to integrate the AI Teacher SDK into HTML, PixiJS, and iframe-based interactions.

## Overview

Interactions that run in iframes (HTML, PixiJS, or external iframe embeds) can communicate with the AI Teacher using postMessage. The SDK is automatically initialized when an interaction is active in a lesson.

## Overlay Mode Configuration

iFrame interactions support two display modes for HTML/CSS/JS content:

- **Overlay on iFrame**: HTML/CSS/JS content is rendered as an overlay on top of the iframe (default). This is useful for interactive controls, buttons, or UI elements that should appear over the embedded content.

- **Section below iFrame**: HTML/CSS/JS content is rendered as a separate section below the iframe. This is useful for instructions, explanations, or additional content that should appear after the embedded content.

You can configure this setting in the Interaction Builder under Settings → Overlay Mode. The setting is stored in `iframeConfig.overlayMode` and can be accessed via the interaction's configuration.

## Quick Start

Include this code at the top of your interaction's HTML/JavaScript:

```javascript
// Initialize SDK early - CRITICAL for interactions that save scores
let aiSDK = null;

// Check if SDK is already available
if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
  aiSDK = window.aiSDK;
  console.log('[Interaction] Using existing SDK');
} else if (typeof window.createIframeAISDK === "function") {
  aiSDK = window.createIframeAISDK();
  window.aiSDK = aiSDK; // Store for future use
  console.log('[Interaction] SDK initialized');
} else {
  console.error('[Interaction] SDK not available');
}

// Wait for SDK to be ready
if (aiSDK && aiSDK.isReady) {
  aiSDK.isReady((ready) => {
    if (ready) {
      console.log('AI SDK is ready!');
      
      // Subscribe to AI responses
      const unsubscribe = aiSDK.onResponse((response) => {
        console.log('AI Response:', response.response);
        
        // Handle actions from AI
        if (response.actions) {
          response.actions.forEach(action => {
            switch (action.type) {
              case 'highlight':
                highlightElement(action.target);
                break;
              case 'show-hint':
                showHint(action.data.message);
                break;
              case 'update-ui':
                updateUI(action.data);
                break;
            }
          });
        }
      });
    }
  });
}
```

**⚠️ Important for Scored Interactions:** If your interaction calculates a score (quiz, assessment, game), you **must** ensure the SDK is initialized and call `saveUserProgress` with the score when the interaction completes. See the [`saveUserProgress`](#saveuserprogressdata) section below for complete examples.

## API Reference

### `emitEvent(event, processedContentId?)`

Emit an event to the AI Teacher.

```javascript
aiSDK.emitEvent({
  type: 'user-selection',
  data: {
    selectedIndex: 0,
    selectedValue: 'option-a',
    isCorrect: true
  },
  requiresLLMResponse: true,
  metadata: {
    category: 'user-action',
    priority: 'medium'
  }
});
```

### `updateState(key, value)`

Update the interaction's state.

```javascript
aiSDK.updateState('score', 85);
aiSDK.updateState('selectedItems', [1, 3, 5]);
```

### `getState(callback)`

Get the current interaction state.

```javascript
aiSDK.getState((state) => {
  console.log('Current state:', state);
});
```

### `onResponse(callback)`

Subscribe to AI responses. Returns an unsubscribe function.

```javascript
const unsubscribe = aiSDK.onResponse((response) => {
  console.log('AI said:', response.response);
  console.log('Actions:', response.actions);
  console.log('State updates:', response.stateUpdates);
});

// Later, to unsubscribe:
unsubscribe();
```

### `isReady(callback)`

Check if the SDK is ready.

```javascript
aiSDK.isReady((ready) => {
  if (ready) {
    // SDK is ready to use
  }
});
```

## Standard Event Types

Use these standard event types for common interactions:

- `user-selection`: User selected an option/item
- `user-input`: User entered text or data
- `interaction-submit`: User submitted the interaction
- `hint-request`: User requested a hint
- `explanation-request`: User requested an explanation
- `progress-update`: Progress changed
- `score-change`: Score changed
- `interaction-complete`: Interaction completed

## Example: True/False Interaction

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady((ready) => {
  if (ready) {
    // Subscribe to responses
    aiSDK.onResponse((response) => {
      if (response.actions) {
        response.actions.forEach(action => {
          if (action.type === 'show-hint') {
            showHintModal(action.data.message);
          }
        });
      }
    });

    // When user selects an option
    function onOptionSelected(index, isCorrect) {
      aiSDK.updateState('selectedIndex', index);
      aiSDK.updateState('isCorrect', isCorrect);
      
      aiSDK.emitEvent({
        type: 'user-selection',
        data: {
          optionIndex: index,
          isCorrect: isCorrect
        },
        requiresLLMResponse: true
      });
    }

    // When user submits
    function onSubmit() {
      aiSDK.emitEvent({
        type: 'interaction-submit',
        data: {
          finalScore: calculateScore()
        },
        requiresLLMResponse: true
      });
    }
  }
});
```

## Example: Drag and Drop (PixiJS)

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady((ready) => {
  if (ready) {
    aiSDK.onResponse((response) => {
      // Handle AI feedback
      if (response.response) {
        showFeedback(response.response);
      }
    });

    // When sprite is dragged
    function onDragEnd(sprite, target) {
      const isCorrect = checkCorrectPlacement(sprite, target);
      
      aiSDK.updateState('lastDrag', { sprite, target, isCorrect });
      
      aiSDK.emitEvent({
        type: 'user-selection',
        data: {
          action: 'drag-drop',
          spriteId: sprite.id,
          targetId: target.id,
          isCorrect: isCorrect
        },
        requiresLLMResponse: true
      });
    }
  }
});
```

## HTML Elements in PixiJS Interactions

**Important:** When adding HTML elements (inputs, divs, etc.) to a PixiJS interaction, always use the **container-based positioning approach** to ensure perfect alignment and automatic scroll synchronization.

### Container-Based Positioning Pattern

1. **Create your PixiJS element** (button, sprite, container)
2. **Create your HTML element**
3. **Attach the HTML element to the PixiJS container** using `attachHtmlToPixiElement()`

This ensures:
- ✅ Perfect alignment (HTML position is calculated from container's world position)
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

// That's it! They're now perfectly synced forever.
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
  zIndex: 1000,
  styles: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '10px'
  }
});
```

### Anchor Points

The `anchor` option determines which point on the PixiJS container the HTML element is positioned relative to:

- `'center'` (default): Center of container
- `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`: Corners
- `'top'`, `'bottom'`, `'left'`, `'right'`: Edges
- `'center-left'`, `'center-right'`, `'top-center'`, `'bottom-center'`: Center of edges

## Including the SDK in Your Interaction

### Option 1: Inline Script

Add this script tag at the beginning of your HTML code:

```html
<script>
  // Copy the createIframeAISDK function here
  const createIframeAISDK = () => { /* ... */ };
  const aiSDK = createIframeAISDK();
</script>
```

### Option 2: External Script

Reference the SDK from a CDN or include it as part of your interaction bundle.

## Overlay Mode Behavior

When creating an iFrame interaction, you can choose how your HTML/CSS/JS content is displayed:

- **Overlay Mode: "Overlay on iFrame"** (default): Your HTML/CSS/JS code is rendered as an overlay positioned on top of the iframe. This is ideal for:
  - Interactive controls and buttons
  - Floating UI elements
  - Progress indicators
  - Tooltips and hints
  
  The overlay is positioned absolutely over the iframe, allowing you to create interactive elements that appear on top of the embedded content.

- **Overlay Mode: "Section below iFrame"**: Your HTML/CSS/JS code is rendered as a separate section below the iframe. This is ideal for:
  - Instructions and explanations
  - Additional content that should appear after the embedded content
  - Form elements or inputs
  - Summary information
  
  The section appears as a block element below the iframe, maintaining normal document flow.

**Note:** The overlay mode setting only affects how your HTML/CSS/JS code is displayed. The iframe itself (the embedded URL) is always rendered first, and your code is either overlaid on top or placed below based on this setting.

### `minimizeChatUI()`
Minimize the AI Teacher chat widget.

**Example:**
```javascript
aiSDK.minimizeChatUI();
```

### `showChatUI()`
Show/restore the AI Teacher chat widget (if minimized or hidden).

**Example:**
```javascript
aiSDK.showChatUI();
```

### `activateFullscreen()`
Activate fullscreen mode for the lesson view.

**Example:**
```javascript
aiSDK.activateFullscreen();
```

### `deactivateFullscreen()`
Deactivate fullscreen mode for the lesson view.

**Example:**
```javascript
aiSDK.deactivateFullscreen();
```

### `postToChat(content, role?, openChat?)`
Post a message to the AI Teacher chat UI.

**Parameters:**
- `content` (string): Message text
- `role` ('user' | 'assistant' | 'error', default: 'assistant'): Message role
- `openChat` (boolean, default: false): If true, opens/restores the chat widget if minimized

**Example:**
```javascript
aiSDK.postToChat("Hello from the interaction!", "assistant", true);
```

### `showScript(text, openChat?)`
Show a script block in the teacher widget.

**Parameters:**
- `text` (string): Script text to display
- `openChat` (boolean, default: false): If true, opens/restores the chat widget if minimized

**Example:**
```javascript
aiSDK.showScript("This is a script block that will be displayed in the teacher widget.", true);
```

### `showSnack(content, duration?, hideFromChatUI?)`
Show a snack message (temporary notification). **By default, snack messages are also posted to the chat UI** unless `hideFromChatUI` is set to `true`.

**Parameters:**
- `content` (string): Message text
- `duration` (number, optional): Duration in milliseconds (undefined = until manually closed or replaced)
- `hideFromChatUI` (boolean, default: false): If true, don't post to chat UI (snack only)

**Example:**
```javascript
// Show snack that also posts to chat (default behavior)
aiSDK.showSnack("Great job!", 5000);

// Show snack without posting to chat
aiSDK.showSnack("Quick notification", 3000, true);
```

### `hideSnack()`
Hide the current snack message.

**Example:**
```javascript
aiSDK.hideSnack();
```

## Image Generation Methods

The SDK provides methods to generate, retrieve, and manage images for lessons. These methods work in both HTML and PixiJS interactions.

### `generateImage(options, callback?)`

Generate images using the Google Gemini image generator. Images are automatically saved to storage and associated with the current lesson.

**Parameters:**
- `options` (object, required):
  - `prompt` (string, required): Main image generation prompt
  - `userInput` (string, optional): Additional user input to append to the prompt
  - `screenshot` (string, optional): Base64-encoded screenshot to include for context
  - `customInstructions` (string, optional): Builder-defined custom instructions from interaction configuration
  - `width` (number, optional): Image width in pixels (e.g., 1024, 512)
  - `height` (number, optional): Image height in pixels (e.g., 1024, 512)
  - `lessonId` (string, optional): Override current lesson ID (defaults to current lesson)
  - `substageId` (string, optional): Substage ID for tracking
  - `interactionId` (string, optional): Interaction ID for tracking
  - `accountId` (string, optional): Account ID (defaults to current user)
- `callback` (function, optional): Callback function `(response) => {}`

**Response:**
- `success` (boolean): Whether generation was successful
- `imageUrl` (string, optional): URL to the persisted image in MinIO/S3 (if saved)
- `imageData` (string, optional): Base64-encoded image data (always returned for immediate display)
- `imageId` (string, optional): Database ID of the saved image record (if persisted)
- `error` (string, optional): Error message if generation failed
- `requestId` (string): Unique request ID for tracking

**Example (HTML Interaction):**
```javascript
// Generate an image from user input
const promptInput = document.getElementById('image-prompt-input');
const prompt = promptInput.value.trim();

aiSDK.generateImage({
  prompt: prompt,
  userInput: 'Make it educational and colorful',
  width: 1024,
  height: 1024
}, (response) => {
  if (response.success) {
    if (response.imageUrl) {
      // Display image from URL
      const img = document.createElement('img');
      img.src = response.imageUrl;
      img.style.maxWidth = '100%';
      document.getElementById('image-display').appendChild(img);
    } else if (response.imageData) {
      // Display image from base64 data
      const img = document.createElement('img');
      img.src = response.imageData.startsWith('data:') 
        ? response.imageData 
        : `data:image/png;base64,${response.imageData}`;
      img.style.maxWidth = '100%';
      document.getElementById('image-display').appendChild(img);
    }
    
    // Emit event that image is ready
    aiSDK.emitEvent({
      type: 'image-generated',
      data: {
        imageUrl: response.imageUrl,
        imageData: response.imageData,
        requestId: response.requestId,
        imageId: response.imageId
      },
      requiresLLMResponse: false
    });
  } else {
    console.error('Image generation failed:', response.error);
    alert('Failed to generate image: ' + response.error);
  }
});
```

**Example (PixiJS Interaction):**
```javascript
aiSDK.generateImage({
  prompt: 'A diagram showing the water cycle',
  width: 1024,
  height: 1024
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
```

**Configuration:**
API configuration is managed in Super Admin at `/super-admin/ai-prompts?assistant=image-generator`:
- **default**: Prompt template (use `{prompt}` placeholder for user prompt)
- **api-config**: JSON configuration with `apiEndpoint`, `apiKey`, `apiKeyHeader`, `model`, `width`, `height`, etc.

### `getLessonImages(lessonId?, accountId?, imageId?)`

Retrieve images generated for a lesson, ordered by creation date (newest first). Returns all images associated with the lesson, or a specific image if `imageId` is provided.

**Parameters:**
- `lessonId` (string, optional): The ID of the lesson to retrieve images for. If not provided, uses the current lesson ID from the interaction context.
- `accountId` (string, optional): The ID of the account that generated the images. If not provided, returns images from all accounts for the lesson.
- `imageId` (string, optional): Specific image ID to retrieve. If provided, returns only that image.

**Returns:** Array of image objects (or single image object if `imageId` is provided), each containing:
- `id`: Unique image ID
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

**Example:**
```javascript
// Get all images for current lesson
aiSDK.getLessonImages(null, null, (images, error) => {
  if (error) {
    console.error('Error getting images:', error);
    return;
  }
  
  if (images && images.length > 0) {
    console.log(`Found ${images.length} images`);
    
    // Display all images in a gallery
    images.forEach((image) => {
      const img = document.createElement('img');
      img.src = image.imageUrl;
      img.style.maxWidth = '200px';
      img.style.margin = '10px';
      document.getElementById('image-gallery').appendChild(img);
    });
  } else {
    console.log('No images found for this lesson');
  }
});

// Get images for a specific lesson
aiSDK.getLessonImages('some-lesson-id', null, (images, error) => {
  // Handle response
});

// Get a specific image by ID
aiSDK.getLessonImages(null, null, 'specific-image-id', (image, error) => {
  if (image) {
    console.log('Found image:', image.imageUrl);
  }
});
```

### `getLessonImageIds(lessonId?, accountId?, callback?)`

Get an array of image IDs for a lesson. Useful for displaying a list of available images or checking if images exist.

**Parameters:**
- `lessonId` (string, optional): The ID of the lesson. If not provided, uses the current lesson ID.
- `accountId` (string, optional): The ID of the account. If not provided, returns IDs from all accounts.
- `callback` (function, optional): Callback function `(imageIds, error) => {}`

**Returns:** Array of image ID strings (via callback)

**Example:**
```javascript
// Get all image IDs for current lesson
aiSDK.getLessonImageIds(null, null, (imageIds, error) => {
  if (error) {
    console.error('Error getting image IDs:', error);
    return;
  }
  
  console.log(`Found ${imageIds.length} image IDs:`, imageIds);
  
  // Display list of image IDs
  const list = document.getElementById('image-ids-list');
  imageIds.forEach((id) => {
    const item = document.createElement('div');
    item.textContent = id;
    item.style.cursor = 'pointer';
    item.onclick = () => {
      // Load specific image
      aiSDK.getLessonImages(null, null, id, (image) => {
        displayImage(image);
      });
    };
    list.appendChild(item);
  });
});
```

### `deleteImage(imageId, callback?)`

Delete an image by ID. This permanently removes the image from storage and the database.

**Parameters:**
- `imageId` (string, required): The ID of the image to delete
- `callback` (function, optional): Callback function `(result, error) => {}`

**Returns:** Object with `{ success: boolean, error?: string }` (via callback)

**Example:**
```javascript
// Delete a specific image
const imageIdToDelete = 'image-id-here';

aiSDK.deleteImage(imageIdToDelete, (result, error) => {
  if (error || !result.success) {
    console.error('Failed to delete image:', error || result.error);
    alert('Failed to delete image: ' + (error || result.error));
    return;
  }
  
  console.log('Image deleted successfully');
  
  // Update UI (e.g., remove from gallery)
  const imageElement = document.querySelector(`[data-image-id="${imageIdToDelete}"]`);
  if (imageElement) {
    imageElement.remove();
  }
  
  // Refresh image IDs list
  aiSDK.getLessonImageIds(null, null, (imageIds) => {
    updateImageIdsDisplay(imageIds);
  });
});
```

**Note:**
- The image file is deleted from storage (MinIO/S3)
- The image record is removed from the database
- This operation cannot be undone
- Only images associated with the current lesson/account context can be deleted (enforced by backend)

## Data Storage Methods

### `saveInstanceData(data)`
Save anonymous instance data (stored separately from user accounts, accessible to interaction builders).

**Example:**
```javascript
await aiSDK.saveInstanceData({
  selectedFragments: [0, 2, 4],
  timeToFirstSelection: 3.5,
  interactionDuration: 45
});
```

**Note:** The schema for instance data is defined by the interaction builder in the interaction builder UI. Only fields defined in the schema will be validated.

### `getInstanceDataHistory(filters?)`
Get historical instance data (accessible to interaction builders and super-admins only).

**Example:**
```javascript
const history = await aiSDK.getInstanceDataHistory({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31'),
  limit: 100
});
```

**Returns:** Array of instance data objects with `id`, `instanceData`, `createdAt`, etc.

### `saveUserProgress(data)`
Save or update user progress for this interaction.

**⚠️ CRITICAL FOR SCORED INTERACTIONS:** If your interaction delivers a score (e.g., quiz, assessment, game), you **MUST** call `saveUserProgress` with a valid `score` value (0-100) when the interaction completes. This ensures scores appear correctly in Engagement Details and average score calculations.

**Score Requirements:**
- ✅ Score must be a **number** (0-100 scale, or percentage 0-1 converted to 0-100)
- ✅ Score must be **valid** (not NaN, not Infinity)
- ✅ Score should be **rounded to 2 decimal places** (e.g., `Math.round(score * 100) / 100`)
- ✅ Score of **0 is valid** (don't omit it)
- ✅ Call `saveUserProgress` **when interaction completes** or score changes

**Example (Complete Interaction with Score):**
```javascript
function calculateAndSaveScore() {
  // Calculate score (e.g., correct answers / total questions * 100)
  const correctCount = getCorrectAnswers();
  const totalQuestions = getTotalQuestions();
  const rawScore = (correctCount / totalQuestions) * 100;
  
  // Validate and round score
  const finalScore = (typeof rawScore === 'number' && !isNaN(rawScore) && isFinite(rawScore))
    ? Math.round(rawScore * 100) / 100  // Round to 2 decimals
    : 0;  // Default to 0 if invalid
  
  // Ensure SDK is initialized
  if (!window.aiSDK && typeof window.createIframeAISDK === "function") {
    window.aiSDK = window.createIframeAISDK();
  }
  
  // Save progress with score
  if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
    window.aiSDK.saveUserProgress({
      score: finalScore,
      completed: true,
      timeTakenSeconds: getTimeTakenSeconds(),
      // Optional: customData, interactionEvents
    }, function(progress, error) {
      if (error) {
        console.error("[Interaction] Failed to save progress:", error);
      } else {
        console.log("[Interaction] ✅ Progress saved. Score:", progress?.score);
      }
    });
  } else {
    console.error("[Interaction] ❌ Cannot save progress - SDK not available");
  }
}
```

**Example (Basic Usage):**
```javascript
await aiSDK.saveUserProgress({
  score: 85,
  timeTakenSeconds: 120,
  completed: true,
  customData: {
    difficultyRating: 3,
    notes: "Found this challenging"
  },
  interactionEvents: [
    {
      type: 'selection',
      timestamp: new Date(),
      data: { fragmentIndex: 0 }
    }
  ]
});
```

**Common Mistakes to Avoid:**
- ❌ **Don't pass `undefined` or `null` as score** - If score is invalid, either omit it or use 0
- ❌ **Don't forget to initialize SDK** - Check `window.aiSDK` exists and has `saveUserProgress` method
- ❌ **Don't skip score validation** - Always validate score is a number before saving
- ❌ **Don't forget `completed: true`** - Set this when interaction is finished

**Note:** Required fields (stage/substage IDs, timestamps, attempts, completed) are automatically tracked. Custom fields are defined by the interaction builder in the schema. Scores are used in Engagement Details views and average score calculations.

### `getUserProgress()`
Get current user's progress for this interaction.

**Example:**
```javascript
const progress = await aiSDK.getUserProgress();
console.log('Score:', progress?.score);
console.log('Attempts:', progress?.attempts);
console.log('Completed:', progress?.completed);
console.log('Custom data:', progress?.customData);
```

**Returns:** User progress object or `null` if no progress exists yet.

### `updateUserProgress(updates)`
Update user progress with partial updates.

**Example:**
```javascript
await aiSDK.updateUserProgress({
  score: 90,
  customData: {
    difficultyRating: 4
  }
});
```

### `markCompleted()`
Mark the interaction as completed.

**Example:**
```javascript
await aiSDK.markCompleted();
```

### `incrementAttempts()`
Increment the attempts counter.

**Example:**
```javascript
await aiSDK.incrementAttempts();
```

### `getUserPublicProfile(userId?)`
Get a user's public profile (if available and shared).

**Example:**
```javascript
const profile = await aiSDK.getUserPublicProfile(userId);
if (profile) {
  console.log('Display name:', profile.displayName);
  console.log('Preferences:', profile.preferences);
}
```

**Returns:** Public profile object with `displayName`, `preferences`, `publicAvatarUrl`, etc., or `null` if not available.

## Adding Input Fields for PixiJS Interactions

For PixiJS category interactions, you can add HTML input fields that are perfectly aligned with your PixiJS elements using the **container-based positioning approach**.

### Recommended: Container-Based Positioning

**Always use container-based positioning** to ensure perfect alignment and automatic scroll synchronization:

```javascript
// 1. Create your PixiJS button
const buttonContainer = createButton("Generate Image", onClick);

// 2. Create input field in HTML (or via JavaScript)
const input = document.createElement('input');
input.type = 'text';
input.id = 'my-input-field';
input.placeholder = 'Enter prompt...';
input.style.width = '280px';
input.style.padding = '8px';
input.style.border = '2px solid #00d4ff';
input.style.borderRadius = '4px';
input.style.background = 'rgba(15, 15, 35, 0.9)';
input.style.color = '#ffffff';
input.style.fontSize = '12px';
document.body.appendChild(input);

// 3. Attach input to button container
aiSDK.attachHtmlToPixiElement(input, buttonContainer, {
  offsetX: buttonContainer.width + 10, // Position to the right
  offsetY: 0,
  anchor: 'center-left',
  zIndex: 1000
});

// 4. Listen for input changes
input.addEventListener("input", (e) => {
  const value = e.target.value;
  console.log("User typed:", value);
});
```

### Alternative: Using Helper Function

For even simpler code, use the helper:

```javascript
// Creates input and attaches it automatically
const input = aiSDK.createInputForButton(buttonContainer, {
  placeholder: 'Enter prompt...',
  width: 280,
  inputId: 'my-input-field',
  offsetX: 10
});

// Listen for changes
input.addEventListener("input", (e) => {
  const value = e.target.value;
  // Use the value
});
```

### Legacy: Manual Positioning (Not Recommended)

If you must position inputs manually, add them to HTML:

```html
<div id="pixi-container"></div>
<input 
  type="text" 
  id="my-input-field" 
  placeholder="Enter your text here..." 
  style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; visibility: hidden;" 
/>
```

**Note:** Manual positioning requires complex coordinate conversion and doesn't handle scrolling well. Use container-based positioning instead.

### Example: Image Generation with Input Field

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
5. **Multiple inputs**: Use unique IDs for each input field (e.g., `id="prompt-input"`, `id="name-input"`)

## Widgets

Widgets are reusable UI components that can be added to interactions by interaction builders. They provide common functionality like image carousels, timers, and more.

### Widget Overview

- **Widgets are enabled** in the Interaction Builder (per interaction type)
- **Widgets are configured** in the Lesson Builder (per lesson instance)
- **Widget implementation** lives in the SDK (injected automatically)
- **Widget configuration** is accessed via `window.interactionConfig.widgetConfigs[instanceId].config`

### Default Behavior: Collapsible Sections

**By default, widgets appear in collapsible sections** (closed by default) at the end of the interaction document. Widgets are stacked vertically in a dedicated container that expands the document height (rather than overlaying content):

**Collapsible Section Structure:**
```html
<div id="widgets-container">
  <div id="widget-section-{instanceId}" class="widget-carousel-section">
    <div class="widget-carousel-header">
      <span class="widget-carousel-toggle">▶</span>  <!-- Click to expand/collapse -->
      <span>Widget Name</span>
    </div>
    <div id="widget-carousel-content-{instanceId}" class="widget-carousel-content" style="display: none;">
      <div id="widget-{widgetId}-{instanceId}">
        <!-- Widget content here -->
      </div>
    </div>
  </div>
  <!-- Additional widgets are stacked here -->
</div>
```

**Default Positioning:**
- Widgets container is positioned at the end of the document body
- Each widget section uses `position: relative` (not `fixed`), so it expands the document height
- Widgets are automatically stacked vertically with 20px spacing between them
- All widgets are centered with `max-width: 800px` for optimal readability
- The container expands when widgets are expanded, ensuring all content is visible and scrollable
- Multiple widgets are neatly stacked without overlapping

### Custom Positioning: Avoiding Collapsible Section

To position widgets **anywhere** in your interaction (not in a collapsible section), add a widget container in your **HTML code**:

#### Method 1: Add HTML Container in Interaction Code

**In Interaction Builder → HTML Code tab:**

```html
<!-- Place widget container where you want it -->
<div id="widget-image-carousel-{instanceId}" style="margin: 20px; padding: 10px;">
  <!-- Widget will render here instead of collapsible section -->
</div>
```

**How it works:**
1. Widget SDK checks for existing container: `document.getElementById('widget-image-carousel-' + instanceId)`
2. If found → Uses existing container (no collapsible section created)
3. If not found → Creates default collapsible section

**Example: Position Image Carousel at Top of Interaction**

```html
<!-- HTML Code -->
<div id="my-interaction-content">
  <h1>My Interaction</h1>
  
  <!-- Widget container at top (no collapsible section) -->
  <div id="widget-image-carousel-{instanceId}" style="margin: 20px 0; padding: 10px; border: 1px solid #00d4ff;">
    <!-- Image carousel will appear here -->
  </div>
  
  <div id="interaction-main-content">
    <!-- Rest of your interaction -->
  </div>
</div>
```

**Note:** Replace `{instanceId}` with the actual instance ID. The instance ID is generated when the widget is enabled in Interaction Builder (format: `widget-id-timestamp`, e.g., `image-carousel-1768605625260`). You can:
- Hardcode it if you know it
- Or let the SDK create the default collapsible section and inspect the HTML to find the instance ID

#### Method 2: Create Container Dynamically in JavaScript

**In Interaction Builder → JavaScript Code tab:**

```javascript
// Wait for SDK to be ready
if (window.aiSDK && window.aiSDK.isReady) {
  window.aiSDK.isReady(() => {
    // Get widget config to find instance ID
    const widgetConfigs = window.interactionConfig?.widgetConfigs || {};
    const instanceId = Object.keys(widgetConfigs).find(id => 
      widgetConfigs[id].type === 'image-carousel'
    );
    
    if (instanceId) {
      // Create custom container
      const customContainer = document.createElement('div');
      customContainer.id = `widget-image-carousel-${instanceId}`;
      customContainer.style.position = 'absolute';
      customContainer.style.top = '50px';
      customContainer.style.left = '50px';
      customContainer.style.width = '400px';
      customContainer.style.padding = '20px';
      customContainer.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
      customContainer.style.border = '2px solid #00d4ff';
      customContainer.style.borderRadius = '8px';
      document.body.appendChild(customContainer);
      
      // Widget will initialize in this container automatically
      // (SDK checks for existing container before creating collapsible section)
    }
  });
}
```

**Better Approach: Create Container in HTML, Then Style in CSS/JS**

```html
<!-- HTML Code -->
<div id="custom-widget-container">
  <div id="widget-image-carousel-{instanceId}">
    <!-- Widget will appear here -->
  </div>
</div>
```

```css
/* CSS Code */
#custom-widget-container {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  padding: 20px;
  background: rgba(0, 212, 255, 0.1);
  border: 2px solid #00d4ff;
  border-radius: 8px;
}

#widget-image-carousel-{instanceId} {
  width: 100%;
}
```

### Accessing Widget Configuration

Widget configuration is passed via `window.interactionConfig.widgetConfigs[instanceId].config`:

```javascript
// Get widget config
const widgetConfigs = window.interactionConfig?.widgetConfigs || {};
const instanceId = Object.keys(widgetConfigs).find(id => 
  widgetConfigs[id].type === 'image-carousel'
);

if (instanceId) {
  const config = widgetConfigs[instanceId].config;
  console.log('Image IDs:', config.imageIds);
  console.log('Autoplay:', config.autoplay);
  console.log('Interval:', config.interval);
}
```

### Available Widgets

#### Image Carousel Widget

**Configuration (Lesson Builder):**
- `imageIds` (array): Comma-separated list of image IDs from lesson
- `autoplay` (boolean): Enable automatic image rotation
- `interval` (number): Autoplay interval in milliseconds (default: 3000)
- `showControls` (boolean): Show navigation arrows (default: true)
- `showIndicators` (boolean): Show image indicators/dots (default: true)

**Usage:**
```javascript
// Widget is automatically initialized when SDK is ready
// Access carousel programmatically:
const instanceId = Object.keys(window.interactionConfig.widgetConfigs)
  .find(id => window.interactionConfig.widgetConfigs[id].type === 'image-carousel');

if (instanceId && window.aiSDK) {
  // Get current image index
  window.aiSDK.carouselGetCurrentIndex(instanceId, (index) => {
    console.log('Current image:', index);
  });
  
  // Navigate programmatically
  window.aiSDK.carouselNext(instanceId);
  window.aiSDK.carouselPrevious(instanceId);
  window.aiSDK.carouselGoTo(instanceId, 2); // Go to image at index 2
}
```

**Custom Positioning Example:**
```html
<!-- HTML Code -->
<div style="margin: 20px; border: 2px solid #00d4ff; padding: 20px;">
  <h2>Lesson Images</h2>
  <div id="widget-image-carousel-{instanceId}">
    <!-- Carousel will appear here (no collapsible section) -->
  </div>
</div>
```

#### Timer Widget

**Configuration (Lesson Builder):**
- `initialTime` or `duration` or `timeLimit` (number): Duration in seconds (default: 60)
- `direction` (string): 'countdown' or 'countup' (default: 'countdown')
- `format` (string): 'mm:ss', 'hh:mm:ss', or 'ss' (default: 'mm:ss')
- `showMilliseconds` (boolean): Show milliseconds (default: false)
- `startOnLoad` (boolean): Start timer automatically when interaction loads (default: false)
- `hideControls` (boolean): Hide start/stop/reset buttons (default: false)
- `onComplete` (string): Action when timer completes - 'emit-event' or 'show-message' (default: 'emit-event')

**Usage:**
```javascript
// Widget is automatically initialized when SDK is ready
// Timer is automatically controlled by user (unless hideControls is true)

// Programmatic control (if widget instance is available):
// Timer controls are internal to the widget
// You can listen for timer-complete events:
window.addEventListener('message', (event) => {
  if (event.data.type === 'ai-sdk-event' && event.data.event?.type === 'timer-complete') {
    console.log('Timer completed!');
  }
});
```

**Custom Positioning Example:**
```html
<!-- HTML Code -->
<div style="position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px;">
  <div id="widget-timer-{instanceId}">
    <!-- Timer will appear here (no collapsible section) -->
  </div>
</div>
```

### Programmatic Widget Control

**Initialize Widget Manually:**
```javascript
// Initialize widget programmatically (if not auto-initialized)
const config = window.interactionConfig?.widgetConfigs?.[instanceId]?.config || {};
config.instanceId = instanceId;

if (window.aiSDK && window.aiSDK.initWidget) {
  window.aiSDK.initWidget('image-carousel', instanceId, config);
}
```

**Check if Widget is Initialized:**
```javascript
// Check if widget instance exists
const instance = window.aiSDK?._widgetInstances?.get(instanceId);
if (instance && instance.element) {
  console.log('Widget is initialized:', instance.element);
}
```

### Widget Events

Widgets can emit events that trigger AI Teacher responses:

```javascript
// Listen for widget events
window.addEventListener('message', (event) => {
  if (event.data.type === 'ai-sdk-event') {
    const eventData = event.data.event;
    
    if (eventData.type === 'timer-complete') {
      console.log('Timer completed:', eventData.instanceId);
      // Handle timer completion
    }
  }
});
```

### Best Practices

1. **Use Default Collapsible Section** for most cases (clean, consistent UX)
2. **Use Custom Positioning** when widget needs to be part of interaction flow (e.g., image carousel as part of a quiz)
3. **Always provide fallback** if widget config is missing
4. **Check for container existence** before manipulating widget DOM
5. **Use instance IDs** consistently (from `window.interactionConfig.widgetConfigs`)

## Notes

- The SDK uses `postMessage` to communicate with the parent window
- All messages are automatically handled by the lesson-view component
- The SDK is initialized when the interaction becomes active
- The SDK is destroyed when the interaction is no longer active
- Processed content ID is automatically passed if available
- Widgets are automatically initialized when SDK is ready (unless disabled or custom initialized)

