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

**Example:**
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

**Note:** Required fields (stage/substage IDs, timestamps, attempts, completed) are automatically tracked. Custom fields are defined by the interaction builder in the schema.

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

## Notes

- The SDK uses `postMessage` to communicate with the parent window
- All messages are automatically handled by the lesson-view component
- The SDK is initialized when the interaction becomes active
- The SDK is destroyed when the interaction is no longer active
- Processed content ID is automatically passed if available

