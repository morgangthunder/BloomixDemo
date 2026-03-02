# Interaction Builder SDK - Quick Reference

Full docs: [INTERACTION_BUILDER_SDK.md](./INTERACTION_BUILDER_SDK.md)
Source of truth: [interaction-sdk-builder.ts](./interaction-sdk-builder.ts)

## Setup

**iframe (HTML / PixiJS / iFrame):**
```javascript
const aiSDK = createIframeAISDK();
aiSDK.isReady(function() { /* start */ });
```

**Same-document (MediaPlayer / VideoURL):**
```javascript
// window.aiSDK is pre-injected
aiSDK.isReady(function() { /* start */ });
```

---

## Lifecycle
| Method | Description |
|---|---|
| `isReady(cb)` | Wait for SDK ready |
| `completeInteraction()` | Finish and advance to next substage |

## Events & State
| Method | Description |
|---|---|
| `emitEvent(event, pcId?)` | Send event to AI Teacher |
| `updateState(key, value)` | Update state |
| `getState(cb)` | Get state: `cb(state)` |
| `onResponse(cb)` | Subscribe to AI responses: `cb(response)` |

## AI Chat & UI
| Method | Description |
|---|---|
| `postToChat(content, role?, openChat?)` | Post to chat |
| `showScript(script, autoPlay?)` | Show script block |
| `showSnack(content, duration?, hide?, actions?, cb?)` | Show notification |
| `hideSnack()` | Dismiss notification |
| `setInteractionInfo(content)` | Set info message (or `null` to clear) |
| `minimizeChatUI()` / `showChatUI()` | Toggle chat widget |
| `activateFullscreen()` / `deactivateFullscreen()` | Toggle fullscreen |

## Audio
| Method | Description |
|---|---|
| `playSfx(name)` | Play SFX: `"correct"`, `"incorrect"`, `"click"`, `"complete"`, `"pop"`, `"whoosh"` |
| `startBgMusic(style?)` | Start background music (`"calm"`, etc.) |
| `startBgMusicFromUrl(url, loopConfig?)` | Custom music URL |
| `stopBgMusic()` | Stop background music |
| `setAudioVolume(channel, level)` | Set volume (0-1): `"sfx"`, `"music"`, `"tts"` |

## User Progress
| Method | Description |
|---|---|
| `saveUserProgress(data, cb?)` | Save score/completion/customData: `cb(progress, error)` |
| `getUserProgress(cb)` | Load saved progress: `cb(progress, error)` |
| `markCompleted(cb?)` | Mark complete |
| `incrementAttempts(cb?)` | Increment attempt counter |
| `getUserPublicProfile(userId?, cb?)` | Get user profile: `cb(profile, error)` |

## Data Storage
| Method | Description |
|---|---|
| `saveInstanceData(data, cb?)` | Persist data: `cb(success, error)` |
| `getInstanceDataHistory(filters?, cb?)` | Load history: `cb(data, error)` |

## Image Generation
| Method | Description |
|---|---|
| `generateImage(options, cb?)` | Generate AI image: `cb(response)` |
| `getLessonImages(cb)` | All lesson images: `cb(images, error)` |
| `getLessonImageIds(cb)` | Image IDs only: `cb(ids, error)` |
| `findImagePair(options, cb)` | Find cached pair: `cb(response)` |
| `selectBestTheme(options, cb)` | AI theme selection: `cb(response)` |
| `deleteImage(imageId, cb)` | Delete image: `cb(response)` |

## Media Controls
| Method | Description |
|---|---|
| `playMedia(cb?)` | Play: `cb(success, error)` |
| `pauseMedia()` | Pause |
| `seekMedia(time)` | Seek to seconds |
| `setMediaVolume(volume)` | Volume 0-1 |
| `getMediaCurrentTime(cb)` | Position: `cb(time)` |
| `getMediaDuration(cb)` | Duration: `cb(duration)` |
| `isMediaPlaying(cb)` | Status: `cb(playing)` |
| `showOverlayHtml()` / `hideOverlayHtml()` | Toggle overlay |

## Cross-Interaction Navigation
| Method | Description |
|---|---|
| `navigateToSubstage(stageId, substageId)` | Jump to substage |
| `getLessonStructure(cb)` | Get structure: `cb(stages)` |

## Shared Lesson Data
| Method | Description |
|---|---|
| `setSharedData(key, value, cb?)` | Store data for other interactions |
| `getSharedData(key, cb)` | Read: `cb({ value })` |
| `getAllSharedData(cb)` | Read all: `cb({ data })` |

## Prefetch
| Method | Description |
|---|---|
| `getPrefetchResult(key, cb)` | Check: `cb({ result, status, error })` |

Status: `"ready"`, `"pending"`, `"error"`, `"none"`

Config: `{ "prefetch": [{ "key": "x", "type": "generateImage", "options": {...} }] }`

Image Explorer with `testMode: false` auto-prefetches (no config needed).

## Cross-Lesson Navigation & Data
| Method | Description |
|---|---|
| `navigateToLesson(lessonId, options?)` | Jump to lesson |
| `setCrossLessonData(targetLessonId, data, cb?)` | Stage data for lesson |

Options: `{ stageId, substageId, interactionTypeId, interactionName, sharedData }`

Same-builder only. 30min expiry. Data loads into shared data on target lesson.

## Category-Specific Extensions

### iFrame Overlay (PixiJS Layering)
| `initWidget(widgetId, config)` | Init built-in widget |
| `showOverlayHtml()` / `hideOverlayHtml()` | Toggle HTML layer |

### HTML / PixiJS Widget
Full standard SDK + `initWidget`, overlay toggles, chat/fullscreen/snack controls, `postToChat`, `showScript`.

### MediaPlayer
All standard + `playMedia`, `pauseMedia`, `seekMedia`, `setMediaVolume`, `getMediaCurrentTime`, `getMediaDuration`, `isMediaPlaying`.

### VideoURL
All standard SDK methods. YouTube embed is handled by the host (playlist trick for ad-free). Use `saveUserProgress` and `setSharedData` for watch-state tracking.
