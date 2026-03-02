# Interaction Builder SDK

The Interaction Builder SDK provides a unified JavaScript API for all interaction types running inside lessons. It handles communication between your interaction code and the lesson host (AI Teacher, navigation, data storage, media controls, etc.).

**This is the single reference for all 5 interaction categories.** The SDK API is identical across categories; only the transport mechanism differs (iframes use `postMessage`, same-document interactions use `CustomEvent`).

## Table of Contents

- [Interaction Categories](#interaction-categories)
- [Quick Start](#quick-start)
- [Lifecycle](#lifecycle)
- [Events and State](#events-and-state)
- [AI Teacher Chat](#ai-teacher-chat)
- [UI Controls](#ui-controls)
- [Audio](#audio)
- [User Progress](#user-progress)
- [Data Storage](#data-storage)
- [Image Generation](#image-generation)
- [Media Controls](#media-controls)
- [Cross-Interaction Navigation](#cross-interaction-navigation)
- [Shared Lesson Data](#shared-lesson-data)
- [Prefetch (Lesson-Load Pre-execution)](#prefetch-lesson-load-pre-execution)
- [Cross-Lesson Navigation and Data](#cross-lesson-navigation-and-data)
- [Widgets](#widgets)
- [Display Modes](#display-modes)

---

## Interaction Categories

| Category | Runs In | SDK Variable | Transport |
|---|---|---|---|
| **HTML** | iframe (blob URL) | `window.createIframeAISDK()` | `postMessage` |
| **PixiJS** | iframe (blob URL) | `window.createIframeAISDK()` | `postMessage` |
| **iFrame** | iframe (external URL or blob) | `window.createIframeAISDK()` | `postMessage` |
| **MediaPlayer** | Main document (overlay/section) | `window.aiSDK` | `CustomEvent` |
| **VideoURL** | Main document (overlay/section) | `window.aiSDK` | `CustomEvent` |

All categories have the same methods. The SDK is automatically injected before your code runs.

---

## Quick Start

### For iframe-based interactions (HTML, PixiJS, iFrame)

```javascript
const aiSDK = createIframeAISDK();

aiSDK.isReady(function(ready) {
  console.log("SDK ready:", ready);

  // Subscribe to AI responses
  aiSDK.onResponse(function(response) {
    console.log("AI says:", response.response);
  });

  // Emit an event to the AI teacher
  aiSDK.emitEvent({ type: "interaction-started" });
});
```

### For same-document interactions (MediaPlayer, VideoURL)

```javascript
// window.aiSDK is already available
aiSDK.isReady(function(ready) {
  console.log("SDK ready:", ready);
  aiSDK.emitEvent({ type: "interaction-started" });
});
```

---

## Lifecycle

### `isReady(callback)`
Wait for the SDK to be initialized and the lesson host to be ready.

```javascript
aiSDK.isReady(function(ready) {
  // ready is always true when called
});
```

### `completeInteraction()`
Signal that the interaction is finished. The lesson will advance to the next substage.

```javascript
aiSDK.completeInteraction();
```

---

## Events and State

### `emitEvent(event, processedContentId?)`
Send an event to the AI Teacher. Events trigger AI responses based on lesson prompts.

| Parameter | Type | Description |
|---|---|---|
| `event` | `object` | Event payload (must include `type`) |
| `processedContentId` | `string` | Optional. Processed content ID for context |

```javascript
aiSDK.emitEvent({ type: "answer-submitted", answer: "photosynthesis", correct: true });
```

### `updateState(key, value)`
Update a state value tracked by the lesson host.

```javascript
aiSDK.updateState("score", 85);
aiSDK.updateState("currentStep", 3);
```

### `getState(callback)`
Get the current interaction state.

```javascript
aiSDK.getState(function(state) {
  console.log("Current state:", state);
});
```

### `onResponse(callback)`
Subscribe to AI Teacher responses. Returns an unsubscribe function.

```javascript
var unsubscribe = aiSDK.onResponse(function(response) {
  console.log("AI:", response.response);
  if (response.actions) {
    response.actions.forEach(function(action) {
      console.log("Action:", action.type, action.data);
    });
  }
});

// Later: unsubscribe();
```

---

## AI Teacher Chat

### `postToChat(content, role?, openChat?)`
Post a message to the AI Teacher chat.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | — | Message text |
| `role` | `string` | `"assistant"` | `"user"`, `"assistant"`, or `"error"` |
| `openChat` | `boolean` | `false` | Open the chat widget |

```javascript
aiSDK.postToChat("Great job! You scored 90%.", "assistant", true);
```

### `showScript(script, autoPlay?)`
Show a script block in the chat widget.

```javascript
aiSDK.showScript("Welcome to this lesson! Let's explore the solar system.", true);
```

---

## UI Controls

### `minimizeChatUI()` / `showChatUI()`
Toggle the floating teacher chat widget.

```javascript
aiSDK.minimizeChatUI();
// Later...
aiSDK.showChatUI();
```

### `activateFullscreen()` / `deactivateFullscreen()`
Toggle fullscreen mode for the interaction area.

```javascript
aiSDK.activateFullscreen();
```

### `showSnack(content, duration?, hideFromChatUI?, actions?, callback?)`
Show a snack bar notification.

| Parameter | Type | Description |
|---|---|---|
| `content` | `string` | Notification text |
| `duration` | `number` | Auto-dismiss in ms (omit for persistent) |
| `hideFromChatUI` | `boolean` | Don't log to chat transcript |
| `actions` | `string[]` | Button labels |
| `callback` | `function` | Receives `snackId` |

```javascript
aiSDK.showSnack("Well done!", 3000);
aiSDK.showSnack("Choose an option:", null, false, ["Option A", "Option B"]);
```

### `hideSnack()`
Dismiss the current snack bar.

### `setInteractionInfo(content)`
Set an info message displayed in the lesson UI.

```javascript
aiSDK.setInteractionInfo({ text: "Tap the image to explore", icon: "touch" });
aiSDK.setInteractionInfo(null); // Clear
```

---

## Audio

### `playSfx(name)`
Play a sound effect. Available: `"correct"`, `"incorrect"`, `"click"`, `"complete"`, `"pop"`, `"whoosh"`.

```javascript
aiSDK.playSfx("correct");
```

### `startBgMusic(style?)` / `startBgMusicFromUrl(url, loopConfig?)` / `stopBgMusic()`
Control background music.

```javascript
aiSDK.startBgMusic("calm");
aiSDK.startBgMusicFromUrl("https://example.com/music.mp3", { loopStart: 10, loopEnd: 60 });
aiSDK.stopBgMusic();
```

### `setAudioVolume(channel, level)`
Set volume for a channel (`"sfx"`, `"music"`, `"tts"`). Level: 0.0 to 1.0.

```javascript
aiSDK.setAudioVolume("music", 0.3);
```

---

## User Progress

### `saveUserProgress(data, callback?)`
Save progress for this interaction. Score is validated and rounded to 2 decimal places.

| Field | Type | Description |
|---|---|---|
| `score` | `number` | 0-100, validated |
| `completed` | `boolean` | Mark as completed |
| `timeTakenSeconds` | `number` | Time spent |
| `customData` | `object` | Any custom data |
| `interactionEvents` | `array` | Event log |

```javascript
aiSDK.saveUserProgress({
  score: 85,
  completed: true,
  timeTakenSeconds: 120,
  customData: { selectedAnswers: [1, 3, 2] }
}, function(progress, error) {
  if (error) console.error(error);
  else console.log("Saved:", progress);
});
```

### `getUserProgress(callback)`
Get previously saved progress for this interaction.

```javascript
aiSDK.getUserProgress(function(progress, error) {
  if (progress && progress.customData) {
    restoreState(progress.customData);
  }
});
```

### `markCompleted(callback?)` / `incrementAttempts(callback?)`
Convenience methods for completion and attempt tracking.

### `getUserPublicProfile(userId?, callback?)`
Get a user's public profile. Omit `userId` for the current user.

```javascript
aiSDK.getUserPublicProfile(null, function(profile, error) {
  console.log("User:", profile.displayName);
});
```

---

## Data Storage

### `saveInstanceData(data, callback?)`
Save arbitrary data associated with this interaction instance (persisted across sessions).

```javascript
aiSDK.saveInstanceData({ highScore: 95, attempts: 3 }, function(success, error) {
  console.log("Saved:", success);
});
```

### `getInstanceDataHistory(filters?, callback?)`
Retrieve historical instance data.

```javascript
aiSDK.getInstanceDataHistory({ limit: 10 }, function(data, error) {
  console.log("History:", data);
});
```

---

## Image Generation

### `generateImage(options, callback?)`
Generate an AI image.

| Option | Type | Description |
|---|---|---|
| `prompt` | `string` | Required. Image description |
| `userInput` | `string` | User's theme/input |
| `width` / `height` | `number` | Dimensions |
| `dualViewport` | `boolean` | Generate mobile + desktop versions |

```javascript
aiSDK.generateImage({
  prompt: "A colorful diagram of the water cycle",
  width: 1024,
  height: 768,
  dualViewport: true
}, function(response) {
  if (response.success) {
    document.getElementById("img").src = response.imageUrl;
  }
});
```

### `getLessonImages(callback)` / `getLessonImageIds(callback)`
Get all images generated for this lesson.

```javascript
aiSDK.getLessonImages(function(images, error) {
  images.forEach(function(img) {
    console.log(img.id, img.imageUrl, img.prompt);
  });
});
```

### `findImagePair(options, callback)`
Find a cached image pair (mobile + desktop) matching criteria.

### `selectBestTheme(options, callback)`
Ask the AI to select the best visual theme for content.

### `deleteImage(imageId, callback)`
Delete a generated image.

---

## Media Controls

These methods control the media player. Available in all categories but primarily used by **MediaPlayer** and **VideoURL** interactions.

### `playMedia(callback?)` / `pauseMedia()`
Play or pause the media player.

```javascript
aiSDK.playMedia(function(success, error) {
  if (success) console.log("Playing");
});

aiSDK.pauseMedia();
```

### `seekMedia(time)`
Seek to a time in seconds.

```javascript
aiSDK.seekMedia(30); // Jump to 30 seconds
```

### `setMediaVolume(volume)`
Set volume (0.0 to 1.0).

```javascript
aiSDK.setMediaVolume(0.5);
```

### `getMediaCurrentTime(callback)` / `getMediaDuration(callback)`
Get current playback position or total duration.

```javascript
aiSDK.getMediaCurrentTime(function(time) {
  console.log("Position:", time, "seconds");
});
```

### `isMediaPlaying(callback)`
Check if media is currently playing.

```javascript
aiSDK.isMediaPlaying(function(playing) {
  console.log("Playing:", playing);
});
```

### `showOverlayHtml()` / `hideOverlayHtml()`
Show or hide the HTML overlay on top of the media player.

---

## Cross-Interaction Navigation

Navigate between substages within the same lesson.

### `navigateToSubstage(stageId, substageId)`
Jump to a specific substage.

```javascript
aiSDK.navigateToSubstage("stage-1", "substage-3");
```

### `getLessonStructure(callback)`
Get the full lesson structure (stages, substages, interaction info).

```javascript
aiSDK.getLessonStructure(function(structure) {
  // structure = [{ id, title, subStages: [{ id, title, interactionTypeId, interactionTitle }] }]
  structure.forEach(function(stage) {
    console.log("Stage:", stage.title);
    stage.subStages.forEach(function(ss) {
      console.log("  -", ss.title, "(", ss.interactionTypeId, ")");
    });
  });
});
```

---

## Shared Lesson Data

Pass data between interactions within the same lesson. Data persists for the duration of the lesson session (cleared on unload).

### `setSharedData(key, value, callback?)`

```javascript
aiSDK.setSharedData("userTheme", "Breaking Bad");
```

### `getSharedData(key, callback)`

```javascript
aiSDK.getSharedData("userTheme", function(response) {
  console.log("Theme:", response.value);
});
```

### `getAllSharedData(callback)`

```javascript
aiSDK.getAllSharedData(function(response) {
  console.log("All shared data:", response.data);
});
```

---

## Prefetch (Lesson-Load Pre-execution)

Prefetch allows expensive operations to run in the background when the lesson loads, so results are ready before the student reaches the interaction.

### Declaring prefetch tasks

Add a `prefetch` array to the interaction's instance config (set in Lesson Builder):

```json
{
  "prefetch": [
    { "key": "myData", "type": "generateImage", "options": { "prompt": "...", "width": 1024 } },
    { "key": "themeData", "type": "selectBestTheme", "options": { "contentItems": ["A", "B"] } }
  ]
}
```

**Available types:** `generateImage`, `selectBestTheme`, `findImagePair`, `imageExplorerPreload`

Image Explorer interactions with `testMode: false` auto-prefetch on lesson load (no config needed).

### `getPrefetchResult(key, callback)`
Check if a prefetched result is ready.

```javascript
aiSDK.getPrefetchResult("myData", function(response) {
  if (response.status === "ready") {
    useData(response.result);
  } else if (response.status === "pending") {
    // Still generating, poll again later
    setTimeout(function() { checkAgain(); }, 1000);
  } else {
    // "none" or "error" — run normal pipeline
    runFallback();
  }
});
```

---

## Cross-Lesson Navigation and Data

Navigate to a different lesson and optionally pass data. **Data sharing requires both lessons to have the same builder** (`createdBy`). Data from different builders is rejected.

### `navigateToLesson(lessonId, options?)`
Navigate to another lesson.

| Option | Type | Description |
|---|---|---|
| `lessonId` | `string` | Required. Target lesson ID |
| `options.stageId` | `string` | Jump to specific stage |
| `options.substageId` | `string` | Jump to specific substage |
| `options.interactionTypeId` | `string` | Find substage by interaction type |
| `options.interactionName` | `string` | Find substage by name (partial match) |
| `options.sharedData` | `object` | Data to pass (same-builder only) |

**Target resolution priority:** `stageId/substageId` > `interactionTypeId` > `interactionName`

```javascript
// Simple navigation
aiSDK.navigateToLesson("lesson-abc-123");

// Navigate to specific interaction with data
aiSDK.navigateToLesson("lesson-abc-123", {
  interactionName: "Results Dashboard",
  sharedData: {
    score: 85,
    completedTopics: ["photosynthesis", "cell-division"]
  }
});
```

### `setCrossLessonData(targetLessonId, data, callback?)`
Stage data for a lesson without navigating. Multiple calls merge data.

```javascript
aiSDK.setCrossLessonData("lesson-xyz", { quizScore: 90 }, function() {
  console.log("Data staged");
});
```

### Receiving cross-lesson data

Data automatically loads into shared lesson data when the target lesson opens. Use `getSharedData` / `getAllSharedData` to read it.

```javascript
// In the target lesson's interaction:
aiSDK.getAllSharedData(function(response) {
  if (response.data && response.data.score) {
    console.log("Score from previous lesson:", response.data.score);
  }
});
```

**Constraints:**
- Same-builder only (source and target `createdBy` must match)
- 30-minute expiry in localStorage
- Consumed (deleted) when the target lesson loads

---

## Widgets

Widgets are reusable UI components (image carousel, timer) that can be embedded in interactions. See the [Widget Developer Guide](../../../../WIDGET_DEVELOPER_GUIDE.md) for details.

### `initWidget(widgetId, config)`
Initialize a widget.

```javascript
aiSDK.initWidget("image-carousel", { imageIds: ["img-1", "img-2"], autoplay: true });
aiSDK.initWidget("timer", { duration: 60, autoStart: true });
```

---

## Display Modes

### Overlay Mode
HTML/CSS/JS content displays **on top** of the media player or interaction area. Ideal for: subtitles, hotspots, minimal controls.

### Section Mode
HTML/CSS/JS content displays **below** the interaction. Ideal for: test buttons, forms, quizzes, panels.

**Section sizing** (MediaPlayer/VideoURL, configurable in Settings):
- `sectionHeight`: `"auto"` (default), `"300px"`, `"50vh"`, etc.
- `sectionMinHeight`: `"200px"` (default)
- `sectionMaxHeight`: `"none"` (default), `"500px"`, etc.

Access in code: `window.interactionConfig.sectionHeight`

---

## Category-Specific Extensions

While the core SDK API is identical across all 5 categories, some categories provide additional methods through their host environment. These extensions are available alongside all standard SDK methods.

### iFrame Overlay – PixiJS Layering Utilities

When an iFrame interaction runs in **overlay mode** (on top of a PixiJS canvas), the SDK also exposes:

| Method | Description |
|---|---|
| `aiSDK.initWidget(widgetId, config)` | Initialise a built-in widget (e.g. `'image-carousel'`, `'timer'`). |
| `aiSDK.showOverlayHtml()` | Show the overlay HTML layer (visible by default). |
| `aiSDK.hideOverlayHtml()` | Hide the overlay HTML layer. |

**PixiJS Stage Access** – The overlay host manages the PixiJS `Application` and stage. Interaction builders configure PixiJS sprites/animations through the overlay's layering API, which auto-resizes on viewport changes.

### HTML / PixiJS Widget SDK

When HTML or PixiJS interactions run in the lesson's widget/section area, the full standard SDK is available. Additionally, the host injects widget management:

| Method | Description |
|---|---|
| `aiSDK.initWidget(widgetId, config)` | Initialise a widget component. |
| `aiSDK.showOverlayHtml()` / `hideOverlayHtml()` | Toggle HTML overlay visibility. |
| `aiSDK.minimizeChatUI()` / `showChatUI()` | Control the chat panel. |
| `aiSDK.activateFullscreen()` / `deactivateFullscreen()` | Toggle fullscreen for the interaction area. |
| `aiSDK.showSnack(content, duration, hideFromChatUI, actions)` | Show a snack notification. |
| `aiSDK.hideSnack()` | Hide the current snack. |
| `aiSDK.postToChat(content, role, show)` | Inject a message into the AI chat. |
| `aiSDK.showScript(script, autoPlay)` | Display a teacher script block. |

### MediaPlayer Interactions

MediaPlayer interactions (audio/video files uploaded to the platform) get all standard SDK methods plus media-specific controls:

| Method | Description |
|---|---|
| `aiSDK.playMedia(callback)` | Start/resume media playback. |
| `aiSDK.pauseMedia()` | Pause media. |
| `aiSDK.seekMedia(timeSeconds)` | Seek to a position. |
| `aiSDK.setMediaVolume(0-1)` | Set media volume. |
| `aiSDK.getMediaCurrentTime(callback)` | Get current playback position. |
| `aiSDK.getMediaDuration(callback)` | Get total duration. |
| `aiSDK.isMediaPlaying(callback)` | Check if media is currently playing. |

These methods are also available in other categories for controlling a co-existing media player.

### VideoURL Interactions

VideoURL interactions (YouTube embeds) receive all standard SDK methods. The host generates embed URLs with the playlist trick to disable ads (`?playlist=VIDEO_ID&start=X&end=Y&rel=0`). The SDK does not directly control YouTube playback but can:

- Use `saveUserProgress` / `getUserProgress` to track watch state
- Use `setSharedData` to pass video timestamps to other interactions
- Use `navigateToSubstage` to jump to related interactions after a video segment ends

---

## Notes

- The SDK uses `postMessage` (iframes) or `CustomEvent` (same-document) to communicate with the lesson host
- The SDK is initialized automatically when the interaction becomes active
- All methods are available in all 5 categories
- Shared lesson data persists for the lesson session only
- Prefetch tasks run on lesson load; results may arrive before or after the interaction loads
- Cross-lesson data requires same builder and expires after 30 minutes
- The canonical source of truth for SDK methods is `interaction-sdk-builder.ts`
