# AI Teacher SDK for Iframe Interactions

This guide explains how to integrate the AI Teacher SDK into HTML, PixiJS, and iframe-based interactions.

## Overview

Interactions that run in iframes (HTML, PixiJS, or external iframe embeds) can communicate with the AI Teacher using postMessage. The SDK is automatically initialized when an interaction is active in a lesson.

## Quick Start

Include this code at the top of your interaction's HTML/JavaScript:

```javascript
// Create the AI SDK client for iframe interactions
const aiSDK = createIframeAISDK();

// Wait for SDK to be ready
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
```

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

### `minimizeChatUI()`
Minimize the AI Teacher chat widget.

**Example:**
```javascript
aiSDK.minimizeChatUI();
```

### `activateFullscreen()`
Activate fullscreen mode for the lesson view.

**Example:**
```javascript
aiSDK.activateFullscreen();
```

## Notes

- The SDK uses `postMessage` to communicate with the parent window
- All messages are automatically handled by the lesson-view component
- The SDK is initialized when the interaction becomes active
- The SDK is destroyed when the interaction is no longer active
- Processed content ID is automatically passed if available

