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

**Response:**
- `success`: Boolean indicating if generation was successful
- `imageUrl`: URL to the generated image (if available)
- `imageData`: Base64-encoded image data (if available)
- `error`: Error message if generation failed
- `requestId`: Unique request ID for tracking

**Configuration:**
API configuration is managed in Super Admin at `/super-admin/ai-prompts?assistant=image-generator`:
- **default**: Prompt template (use `{prompt}` placeholder for user prompt)
- **api-config**: JSON configuration with `apiEndpoint`, `apiKey`, `apiKeyHeader`, `model`, etc.

**Event Triggering:**
When an image is successfully generated, you can emit an `image-generated` event to trigger other interactions or update UI state. The event includes the image URL/data and request ID.

## Adding Input Fields for PixiJS Interactions

For PixiJS category interactions, you can add HTML input fields that work seamlessly with your PixiJS canvas. This is useful for text inputs, prompts, and user data collection.

### Step 1: Add Input Field to HTML Code

In the Interaction Builder, add your input field to the **HTML Code** section:

```html
<div id="pixi-container"></div>
<input 
  type="text" 
  id="my-input-field" 
  placeholder="Enter your text here..." 
  style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" 
/>
```

**Key Points:**
- Use `position: absolute` to overlay the input on the canvas
- Set `z-index: 1000` to ensure it appears above the canvas
- Position using `left` and `top` coordinates
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

### Step 3: Access Input in JavaScript Code

In your **JavaScript Code** section, access the input field using `document.getElementById()`:

```javascript
// Get the input field
const myInput = document.getElementById("my-input-field");

if (!myInput) {
  console.warn("Input field not found. Make sure HTML code includes the input element.");
}

// Listen for input changes
if (myInput) {
  myInput.addEventListener("input", (e) => {
    const value = e.target.value;
    console.log("User typed:", value);
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
