# AI Teacher SDK for Media Player Interactions

This guide explains how to integrate the AI Teacher SDK into Media Player interactions, which allow you to create interactive content with video or audio players.

## Overview

Media Player interactions use the same SDK infrastructure as iframe interactions, with additional media-specific control methods. The SDK is automatically initialized when a Media Player interaction is active in a lesson.

## Display Modes

Media Player interactions support two display modes, configurable in the Settings tab:

### Section Mode (Default)
The HTML/CSS/JS content is displayed in a section **below** the media player. This is ideal for:
- SDK test buttons
- Detailed information panels
- Forms or quizzes
- Any content that needs more space

**Section Sizing Configuration:**
You can configure the section size in the Settings tab:
- **Section Height**: `auto` (default), `300px`, `50vh`, etc.
- **Section Min Height**: `200px` (default), `150px`, etc.
- **Section Max Height**: `none` (default), `500px`, `50vh`, etc.

These settings are stored in `mediaConfig` and can be accessed in your code via `window.interactionConfig.sectionHeight`, `sectionMinHeight`, and `sectionMaxHeight`.

### Overlay Mode
The HTML/CSS/JS content is displayed as an **overlay on top** of the media player. This is ideal for:
- Subtitles or captions
- Interactive hotspots
- Minimal UI controls
- Content that should appear over the video

The overlay is positioned at the bottom of the player with a semi-transparent background. Media controls remain accessible above the overlay.

## Quick Start

Include this code at the top of your interaction's HTML/JavaScript:

```javascript
// Create the AI SDK client for media player interactions
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
            case 'play-media':
              aiSDK.playMedia();
              break;
            case 'pause-media':
              aiSDK.pauseMedia();
              break;
            case 'seek-media':
              aiSDK.seekMedia(action.data.time);
              break;
            case 'show-hint':
              showHint(action.data.message);
              break;
          }
        });
      }
    });
  }
});
```

## Media Control Methods

### `playMedia()`

Play the media player. Returns a Promise that resolves when play starts.

**Example:**
```javascript
try {
  await aiSDK.playMedia();
  console.log('Media started playing');
} catch (error) {
  console.error('Failed to play media:', error);
}
```

### `pauseMedia()`

Pause the media player.

**Example:**
```javascript
aiSDK.pauseMedia();
```

### `seekMedia(time)`

Seek to a specific time in the media.

**Parameters:**
- `time` (number): Time in seconds

**Example:**
```javascript
// Jump to 30 seconds
aiSDK.seekMedia(30);

// Jump to 1 minute 15 seconds
aiSDK.seekMedia(75);
```

### `setMediaVolume(volume)`

Set the media volume.

**Parameters:**
- `volume` (number): Volume level from 0.0 (muted) to 1.0 (full volume)

**Example:**
```javascript
// Set to 50% volume
aiSDK.setMediaVolume(0.5);

// Mute
aiSDK.setMediaVolume(0);

// Full volume
aiSDK.setMediaVolume(1.0);
```

### `getMediaCurrentTime()`

Get the current playback time in seconds.

**Returns:** Number (time in seconds)

**Example:**
```javascript
const currentTime = aiSDK.getMediaCurrentTime();
console.log(`Current time: ${currentTime} seconds`);
```

### `getMediaDuration()`

Get the total duration of the media in seconds.

**Returns:** Number (duration in seconds)

**Example:**
```javascript
const duration = aiSDK.getMediaDuration();
console.log(`Media duration: ${duration} seconds`);
```

### `isMediaPlaying()`

Check if the media is currently playing.

**Returns:** Boolean (true if playing, false if paused)

**Example:**
```javascript
if (aiSDK.isMediaPlaying()) {
  console.log('Media is playing');
} else {
  console.log('Media is paused');
}
```

### `showOverlayHtml()`

Show the overlay HTML content (if it was previously hidden).

**Example:**
```javascript
// Show overlay when a question appears
aiSDK.showOverlayHtml();
```

### `hideOverlayHtml()`

Hide the overlay HTML content.

**Example:**
```javascript
// Hide overlay when media starts playing
aiSDK.hideOverlayHtml();
```

**Note:** The overlay can be configured to automatically hide during playback via the "Hide HTML Content During Playback" setting in the interaction configuration. These methods allow you to programmatically control overlay visibility regardless of that setting.

## Standard SDK Methods

Media Player interactions also support all standard SDK methods from iframe interactions:

### `emitEvent(event, processedContentId?)`

Emit an event to the AI Teacher.

```javascript
aiSDK.emitEvent({
  type: 'media-time-reached',
  data: {
    time: 30,
    action: 'show-question'
  },
  requiresLLMResponse: true
});
```

### `updateState(key, value)`

Update the interaction's state.

```javascript
aiSDK.updateState('lastSeekTime', 45);
aiSDK.updateState('playbackSpeed', 1.5);
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
aiSDK.postToChat("Media paused at 30 seconds", "assistant", true);
```

### `showScript(text, openChat?)`

Show a script block in the teacher widget.

**Parameters:**
- `text` (string): Script text to display
- `openChat` (boolean, default: false): If true, opens/restores the chat widget if minimized

**Example:**
```javascript
aiSDK.showScript("Let's pause here and discuss what we've learned.", true);
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

## Data Storage Methods

Media Player interactions support all standard data storage methods:

### `saveInstanceData(data)`

Save anonymous instance data (stored separately from user accounts, accessible to interaction builders).

**Example:**
```javascript
await aiSDK.saveInstanceData({
  playbackPositions: [10, 30, 60],
  pausesCount: 3,
  totalWatchTime: 120
});
```

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

### `saveUserProgress(data)`

Save or update user progress for this interaction.

**Example:**
```javascript
await aiSDK.saveUserProgress({
  score: 85,
  timeTakenSeconds: 120,
  completed: true,
  customData: {
    watchPercentage: 75,
    notes: "Found this section interesting"
  }
});
```

### `getUserProgress()`

Get current user's progress for this interaction.

**Example:**
```javascript
const progress = await aiSDK.getUserProgress();
console.log('Score:', progress?.score);
console.log('Watch time:', progress?.timeTakenSeconds);
```

### `updateUserProgress(updates)`

Update user progress with partial updates.

**Example:**
```javascript
await aiSDK.updateUserProgress({
  score: 90,
  customData: {
    watchPercentage: 100
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

## Example: Interactive Video Quiz

```javascript
const aiSDK = createIframeAISDK();

let questionShown = false;

aiSDK.isReady((ready) => {
  if (ready) {
    // Check media time periodically
    const checkInterval = setInterval(() => {
      const currentTime = aiSDK.getMediaCurrentTime();
      const duration = aiSDK.getMediaDuration();
      
      // Show question at 30 seconds
      if (currentTime >= 30 && !questionShown) {
        questionShown = true;
        aiSDK.pauseMedia();
        aiSDK.showScript("Let's pause here. What did the narrator say about the main topic?");
        aiSDK.postToChat("Please answer the question before continuing.", "assistant", true);
      }
      
      // Auto-complete at end
      if (currentTime >= duration - 1 && duration > 0) {
        clearInterval(checkInterval);
        aiSDK.markCompleted();
      }
    }, 1000);
    
    // Handle user interactions
    window.addEventListener('message', (event) => {
      if (event.data.type === 'user-answered-question') {
        if (event.data.isCorrect) {
          aiSDK.showSnack("Correct! Well done.", 3000);
          aiSDK.playMedia();
        } else {
          aiSDK.showSnack("Not quite. Let's review that section.", 3000);
          aiSDK.seekMedia(25); // Rewind 5 seconds
        }
      }
    });
  }
});
```

## Example: Time-Based Triggers

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady((ready) => {
  if (ready) {
    // Define trigger points
    const triggers = [
      { time: 15, action: () => aiSDK.showScript("Key point coming up!") },
      { time: 45, action: () => {
        aiSDK.pauseMedia();
        aiSDK.postToChat("Let's discuss this concept before continuing.", "assistant", true);
      }},
      { time: 90, action: () => aiSDK.showSnack("Great progress!") }
    ];
    
    // Check for triggers
    const checkInterval = setInterval(() => {
      const currentTime = aiSDK.getMediaCurrentTime();
      
      triggers.forEach(trigger => {
        if (currentTime >= trigger.time && currentTime < trigger.time + 1) {
          trigger.action();
        }
      });
      
      // Stop checking if media ended
      if (!aiSDK.isMediaPlaying() && currentTime >= aiSDK.getMediaDuration()) {
        clearInterval(checkInterval);
      }
    }, 500);
  }
});
```

## Example: Overlay Controls

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady((ready) => {
  if (ready) {
    // Create overlay buttons
    const overlay = document.getElementById('media-overlay');
    
    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.textContent = 'Play';
    playPauseBtn.onclick = () => {
      if (aiSDK.isMediaPlaying()) {
        aiSDK.pauseMedia();
        playPauseBtn.textContent = 'Play';
      } else {
        aiSDK.playMedia();
        playPauseBtn.textContent = 'Pause';
      }
    };
    
    // Volume control
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = 0;
    volumeSlider.max = 100;
    volumeSlider.value = 100;
    volumeSlider.oninput = (e) => {
      aiSDK.setMediaVolume(e.target.value / 100);
    };
    
    // Show/Hide overlay buttons
    const showOverlayBtn = document.createElement('button');
    showOverlayBtn.textContent = 'Show Overlay';
    showOverlayBtn.onclick = () => {
      aiSDK.showOverlayHtml();
      showOverlayBtn.textContent = 'Overlay Shown';
    };
    
    const hideOverlayBtn = document.createElement('button');
    hideOverlayBtn.textContent = 'Hide Overlay';
    hideOverlayBtn.onclick = () => {
      aiSDK.hideOverlayHtml();
      hideOverlayBtn.textContent = 'Overlay Hidden';
    };
    
    overlay.appendChild(playPauseBtn);
    overlay.appendChild(volumeSlider);
    overlay.appendChild(showOverlayBtn);
    overlay.appendChild(hideOverlayBtn);
    
    // Auto-hide overlay when media starts playing (if configured)
    // Auto-show overlay when media pauses
    setInterval(() => {
      if (aiSDK.isMediaPlaying()) {
        // Overlay can be hidden during playback via config
        // You can programmatically show it when needed
      } else {
        // Show overlay when paused (e.g., for questions)
        aiSDK.showOverlayHtml();
      }
    }, 1000);
  }
});
```

## Example: Show/Hide Overlay Based on Events

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady((ready) => {
  if (ready) {
    // Hide overlay when media starts playing
    let wasPlaying = false;
    setInterval(() => {
      const isPlaying = aiSDK.isMediaPlaying();
      if (isPlaying && !wasPlaying) {
        // Media just started - hide overlay for clean viewing
        aiSDK.hideOverlayHtml();
      }
      wasPlaying = isPlaying;
    }, 500);
    
    // Show overlay when question appears
    aiSDK.onResponse((response) => {
      if (response.actions && response.actions.some(a => a.type === 'show-question')) {
        aiSDK.showOverlayHtml();
        aiSDK.pauseMedia();
      }
    });
    
    // Show overlay at specific timestamps
    const showOverlayAt = [30, 60, 90]; // seconds
    setInterval(() => {
      const currentTime = aiSDK.getMediaCurrentTime();
      if (showOverlayAt.includes(Math.floor(currentTime))) {
        aiSDK.showOverlayHtml();
        aiSDK.pauseMedia();
        aiSDK.showScript("Let's pause here to discuss this point.");
      }
    }, 1000);
  }
});
```

## Integration with Lesson Play/Pause Controls

Media Player interactions automatically integrate with the lesson's play/pause controls:

- When the lesson play button is clicked, the media will start playing
- When the lesson pause button is clicked, the media will pause
- The lesson timer syncs with the media playback time
- Media playback state is synchronized with the lesson script playback state

## Notes

- The SDK uses `postMessage` to communicate with the parent window
- All messages are automatically handled by the lesson-view component
- The SDK is initialized when the interaction becomes active
- The SDK is destroyed when the interaction is no longer active
- Processed content ID is automatically passed if available
- Media file URL comes from the processed content associated with the interaction
- Overlay HTML/CSS/JS is defined in the interaction builder and injected into the media player overlay

