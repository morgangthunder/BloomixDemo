# Uploaded Media Interaction Category - Implementation Plan

## Overview

Create a new interaction category `uploaded-media` that allows builders to upload video or audio files and create interactive overlays on top of them, similar to the iframe overlay capability. The media player will support SDK methods for playback control, time-based triggers, and overlay management.

## Architecture Decision: Single Category vs. Separate Categories

**Recommendation: Single `uploaded-media` category**
- Both video and audio use HTML5 `<video>` and `<audio>` elements with similar APIs
- Overlay functionality is identical for both
- SDK methods are the same
- Configuration can distinguish between video/audio via file type detection
- Simpler to maintain and extend

## Architecture Decision: Content Source Workflow

**IMPORTANT:** Uploaded media files must go through the content source approval workflow:
1. **Upload**: User uploads media file as a content source (type: 'media', via content-sources endpoint)
2. **Submit**: Content source is submitted for approval (status: 'pending')
3. **Approve**: Admin approves the content source (status: 'approved')
4. **Process**: Content source is processed:
   - Extract metadata (duration, file size, codec, dimensions for video)
   - Generate transcription (using Whisper or similar)
   - Store file URL and all metadata
   - Create processed content/output
5. **Use**: Interaction instances reference processed content by `processedContentId`

**Key Points:**
- Media files are NOT directly uploaded to interactions
- Media files are content sources with type `'media'`
- Matching processed content by: content source ID, metadata (duration, file size), or filename
- Once approved and processed, the processed output contains:
  - Media file URL
  - Media metadata (duration, size, type, codec, dimensions)
  - Transcription (if available)
- Interaction instances use `processedContentId` to reference the media file
- This ensures all media content is approved and tracked
- File size and duration limits enforced during upload

## Phase 1: Database Schema & Backend Infrastructure

### 1.1 Update Content Source Entity/Service
**File:** `Upora/backend/src/modules/content-sources/content-sources.service.ts`

**Changes:**
- Add support for media file uploads (video/audio) with type `'media'`
- Validate file types (video/*, audio/*)
- Validate file size limits (max 500MB, configurable)
- Validate duration limits (max 60min video, 120min audio, configurable)
- Extract metadata during processing:
  - Duration (using ffprobe or similar)
  - File size
  - Codec, bitrate, resolution (for video)
  - Sample rate, channels (for audio)
- Generate transcription using Whisper (or similar)
- Store media file URL, metadata, and transcription in processed output

**Transcription Service:**
- Use OpenAI Whisper (open source, self-hosted)
- Alternative: Web Speech API (browser-based, limited)
- Store transcription with timestamps (segments)
- Handle errors gracefully (transcription optional, not required)

**Processed Output Structure for Media:**
```json
{
  "outputData": {
    "mediaFileUrl": "/uploads/media/...",
    "mediaFileName": "example.mp4",
    "mediaFileType": "video",
    "mediaFileSize": 12345678,
    "mediaFileDuration": 120.5,
    "mediaMetadata": {
      "width": 1920,
      "height": 1080,
      "codec": "h264",
      "bitrate": 5000,
      "fps": 30
    },
    "transcription": {
      "text": "Full transcript text...",
      "segments": [
        {
          "start": 0.0,
          "end": 5.2,
          "text": "Segment text..."
        }
      ],
      "language": "en"
    }
  }
}
```

**File Size and Duration Limits:**
- Maximum file size: 500MB (configurable)
- Maximum duration: 60 minutes for video, 120 minutes for audio (configurable)
- Enforced during upload validation

### 1.2 Update InteractionType Entity
**File:** `Upora/backend/src/entities/interaction-type.entity.ts`

**Changes:**
- `interactionTypeCategory` enum should be extended to include `'uploaded-media'`
- **NO direct media file fields needed** - media comes from processed content
- `mediaConfig` (jsonb, nullable): Media-specific config (autoplay, loop, muted, controls, etc.)
  - This is interaction-level config, not file-level

**Note:** Media file URL comes from processed content, not stored directly in interaction type

### 1.3 Create Migration
**File:** `Upora/backend/src/migrations/[timestamp]-AddMediaConfigToInteractionTypes.ts`

Add `mediaConfig` column to `interaction_types` table (jsonb, nullable).

### 1.4 Update Content Sources Controller
**File:** `Upora/backend/src/modules/content-sources/content-sources.controller.ts`

**Changes:**
- Add media file upload support to existing upload endpoint
- Accept `type: 'media'` for media file uploads
- Validate media file types (video/*, audio/*)
- Validate file size and duration limits
- Extract metadata during upload/processing
- Trigger transcription generation (async, non-blocking)
- Store media metadata and transcription in processed output

**Upload Endpoint Enhancement:**
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @Body('type') type: 'pdf' | 'text' | 'media',
  @Body('title') title?: string,
  // ... other fields
) {
  // Validate file type based on 'type' parameter
  if (type === 'media') {
    // Validate video/audio file
    // Check file size and duration limits
    // Extract metadata
    // Generate transcription (async)
  }
  // ... existing logic
}
```

### 1.5 Update Interaction Types Controller
**File:** `Upora/backend/src/modules/interaction-types/interaction-types.controller.ts`

- Add validation for `uploaded-media` category
- Validate that `mediaConfig` is properly structured
- **Note:** Media file validation happens at content source level, not interaction level

## Phase 2: Frontend - Content Source Integration

### 2.1 Create Dedicated Media Upload UI in Content Sources
**File:** `Upora/frontend/src/app/features/content-sources/content-sources.component.ts` (or create new component)

**Changes:**
- Add dedicated media upload section/tab in content sources UI
- File input with drag-and-drop support for video/audio files
- Preview player for uploaded media
- Display file metadata (duration, file size, type) before upload
- Show upload progress
- Validate file size and duration limits (client-side)
- Display transcription status (pending, completed, failed)
- Link to content source upload from interaction builder

**UI Features:**
- Upload button/area with drag-and-drop
- Media preview player (video/audio)
- File info display (name, size, duration, type)
- Validation error messages
- Upload progress indicator
- Transcription status indicator

### 2.2 Create Media Content Source Selector Component
**File:** `Upora/frontend/src/app/shared/components/media-content-selector/media-content-selector.component.ts` (new)

**Features:**
- Search/filter approved media content sources
- Display media preview (video/audio thumbnail/player)
- Show media metadata (filename, duration, file size, transcription status)
- Allow selection of processed content by:
  - Content source ID (primary)
  - Metadata matching (duration, file size)
  - Filename (secondary, for display only)
- Link to content source upload if no media found
- **Allow direct upload from selector** (if user has permission)

**UI:**
- Search input
- List of approved media content sources
- Preview player for each item
- Select button
- "Upload New Media" button (opens upload dialog or navigates to content sources)
- Upload dialog/modal (if upload allowed from interaction config)

### 2.3 Integrate into Interaction Builder
**File:** `Upora/frontend/src/app/features/interaction-builder/interaction-builder.component.ts`

**Changes:**
- Add media content selector component to Settings tab when `interactionTypeCategory === 'uploaded-media'`
- Store selected processed content ID (not direct file URL)
- Display selected media preview in Settings tab
- Show media filename and metadata
- Link to content source upload if media not found
- **Allow upload from interaction builder** (opens upload dialog, creates content source, submits for approval)
- Update `onTypeChange()` to show/hide media selector based on category

**Upload from Interaction Builder:**
- User clicks "Upload New Media" in selector
- Upload dialog opens (reuse media upload component)
- File is uploaded as content source (type: 'media', status: 'pending')
- User can continue building interaction (media will be available after approval)
- Show pending status in selector

**Configuration Schema:**
- Add `mediaConfig` fields to config schema:
  - `autoplay` (boolean)
  - `loop` (boolean)
  - `muted` (boolean)
  - `controls` (boolean)
  - `preload` ('none' | 'metadata' | 'auto')

### 2.4 Update Config Modal
**File:** `Upora/frontend/src/app/shared/components/interaction-configure-modal/interaction-configure-modal.component.ts`

**Changes:**
- Add media content selector if interaction type is `uploaded-media`
- Allow lesson-builders to select approved media content source
- **Allow upload from config modal** (same as interaction builder)
- Display media preview in config modal
- Show media configuration options (autoplay, loop, muted, controls, etc.)
- Show transcription status if available

## Phase 3: Frontend - Media Player Component

### 3.1 Create Media Player Wrapper
**File:** `Upora/frontend/src/app/features/lesson-view/media-player-wrapper.component.ts` (new)

**Features:**
- Renders HTML5 `<video>` or `<audio>` element
- Supports overlay mode (similar to iframe overlay)
- Injects builder's HTML/CSS/JS into overlay
- Handles media events (play, pause, timeupdate, ended, etc.)
- Exposes media control methods to SDK

**Structure:**
```html
<div class="media-player-container">
  <video/audio id="media-player" [src]="mediaUrl" [attr.controls]="showControls"></video/audio>
  <div id="media-overlay" class="media-overlay">
    <!-- Builder's overlay HTML/CSS/JS injected here -->
  </div>
</div>
```

### 3.2 Integrate into Lesson View
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Changes:**
- Add case for `interactionTypeCategory === 'uploaded-media'` in `loadInteractionData()`
- Fetch processed content to get media file URL (from `processedContentId`)
- Extract media file URL from processed output: `processedOutput.outputData.mediaFileUrl`
- Create media player blob URL (similar to iframe wrapper)
- Render media player with overlay
- Pass media player reference to SDK bridge
- **Store media player reference** for lesson play/pause control integration

**Media Player Blob URL Generation:**
- Similar to `createIframeWrapperWithOverlay()`
- Create HTML document with:
  - Media element (video/audio)
  - Overlay container
  - Builder's HTML/CSS/JS
  - SDK initialization code

**Media File Resolution:**
```typescript
// In loadInteractionData() for uploaded-media category
if (processedContentId) {
  // Fetch processed output
  const processedOutput = await this.fetchProcessedOutput(processedContentId);
  const mediaFileUrl = processedOutput.outputData.mediaFileUrl;
  // Use mediaFileUrl in media player
}
```

### 3.3 Integrate Lesson Play/Pause Controls
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Changes:**
- Store reference to active media player element
- Update `togglePlayback()` method to:
  - Check if active interaction is `uploaded-media` type
  - If yes, control BOTH media player AND script playback simultaneously
  - Sync media player state with `isScriptPlaying`
- Listen to media player events (play, pause) to update `isScriptPlaying` state
- Listen to script playback events to update media player state

**Implementation:**
```typescript
private activeMediaPlayer: HTMLVideoElement | HTMLAudioElement | null = null;

togglePlayback() {
  const isUploadedMedia = this.activeInteractionType?.interactionTypeCategory === 'uploaded-media';
  
  if (isUploadedMedia && this.activeMediaPlayer) {
    // Control both media player and script simultaneously
    if (this.activeMediaPlayer.paused) {
      this.activeMediaPlayer.play();
      this.onTeacherPlay(); // Start script playback
      this.isScriptPlaying = true;
    } else {
      this.activeMediaPlayer.pause();
      this.onTeacherPause(); // Pause script playback
      this.isScriptPlaying = false;
    }
  } else {
    // Existing script playback logic (no media player)
    if (this.isScriptPlaying) {
      this.onTeacherPause();
    } else {
      this.onTeacherPlay();
    }
  }
}

// Listen to media player events
onMediaPlay() {
  if (!this.isScriptPlaying) {
    this.onTeacherPlay();
    this.isScriptPlaying = true;
  }
}

onMediaPause() {
  if (this.isScriptPlaying) {
    this.onTeacherPause();
    this.isScriptPlaying = false;
  }
}
```

## Phase 4: SDK Extensions

### 4.1 Add Media Control Methods to SDK
**File:** `Upora/frontend/src/app/core/services/interaction-ai-sdk.service.ts`

**New Methods:**
```typescript
// Media Control
playMedia(): void;
pauseMedia(): void;
seekTo(timeInSeconds: number): void;
getCurrentTime(): Promise<number>;
getDuration(): Promise<number>;
setPlaybackRate(rate: number): void; // 0.5, 1.0, 1.5, 2.0, etc.
getPlaybackRate(): Promise<number>;
isPlaying(): Promise<boolean>;

// Overlay Management
showOverlay(overlayId?: string): void; // Show specific overlay or all
hideOverlay(overlayId?: string): void; // Hide specific overlay or all
toggleOverlay(overlayId?: string): void;

// Time-based Triggers
onTimeReached(timeInSeconds: number, callback: () => void): () => void; // Returns unsubscribe function
clearTimeTriggers(): void;
```

### 4.2 Update SDK Bridge Service
**File:** `Upora/frontend/src/app/core/services/interaction-ai-bridge.service.ts`

**Add Message Handlers:**
- `ai-sdk-play-media`
- `ai-sdk-pause-media`
- `ai-sdk-seek-to`
- `ai-sdk-get-current-time`
- `ai-sdk-get-duration`
- `ai-sdk-set-playback-rate`
- `ai-sdk-get-playback-rate`
- `ai-sdk-is-playing`
- `ai-sdk-show-overlay`
- `ai-sdk-hide-overlay`
- `ai-sdk-toggle-overlay`
- `ai-sdk-on-time-reached`
- `ai-sdk-clear-time-triggers`

### 4.3 Update Iframe SDK Helper
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**In `createIframeAISDK()` (or create `createMediaAISDK()`):**
- Add media control methods
- Add overlay management methods
- Add time-based trigger methods
- Expose media player element reference

### 4.4 Lesson Time Sync
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Features:**
- Track lesson playback time (if lesson has script/audio)
- Sync media player with lesson time
- Trigger media events based on lesson time
- Allow media to control lesson playback (optional)

**Implementation:**
- Listen to lesson script playback events
- Update media player time when lesson time changes
- Trigger SDK callbacks when media time reaches trigger points

## Phase 5: SDK Documentation & Test Interaction

### 5.1 Create SDK Documentation
**File:** `Upora/frontend/src/app/core/services/UPLOADED_MEDIA_INTERACTION_AI_SDK.md` (new)

**Content:**
- Overview of uploaded-media interactions
- Media control methods
- Overlay management methods
- Time-based triggers
- Event handling
- Code examples

### 5.2 Create SDK Test Interaction
**File:** `Upora/backend/src/migrations/[timestamp]-CreateSDKTestUploadedMediaInteraction.ts`

**Features:**
- Sample video or audio file (or instructions to upload one)
- Overlay with test buttons for all SDK methods
- Examples of:
  - Play/pause controls
  - Seek to time
  - Show/hide overlays
  - Time-based triggers
  - Overlay button interactions

**File:** `Upora/backend/scripts/sdk-test-uploaded-media-full-code.js` (new)

Contains full HTML, CSS, and JavaScript code for the test interaction.

### 5.3 Update AI Prompts
**File:** `Upora/frontend/src/app/features/super-admin/ai-prompts.component.ts`

**Add/Update Prompts:**

1. **`sdk-uploaded-media`** - New prompt for uploaded-media interaction SDK:
   - Media control methods (play, pause, seek, etc.)
   - Overlay management (show/hide/toggle)
   - Time-based triggers (onTimeReached)
   - Code examples
   - Integration with lesson play/pause controls

2. **`interaction-builder-uploaded-media`** - Prompt for AI assistant helping build uploaded-media interactions:
   - How to create uploaded-media interactions
   - Content source workflow (upload -> approve -> use)
   - Media configuration options
   - Overlay code examples
   - SDK method usage

3. **`content-source-media`** - Prompt for AI assistant helping with media content sources:
   - How to upload media files as content sources
   - Media file requirements and formats
   - Metadata extraction
   - Approval process

4. **Update existing prompts** that mention interaction types to include `uploaded-media`:
   - `sdk-html` - Mention that overlay functionality is similar
   - `sdk-iframe` - Mention that uploaded-media uses similar overlay system
   - `interaction-builder-general` - Add uploaded-media to list of categories

## Phase 6: Integration & Testing

### 6.1 Update Interaction Builder Preview
**File:** `Upora/frontend/src/app/features/interaction-builder/interaction-builder.component.ts`

- Add preview for `uploaded-media` category
- Show media player with overlay
- Test media controls in preview

### 6.2 Update Type Definitions
**File:** `Upora/frontend/src/app/features/interaction-builder/interaction-builder.component.ts`

Update `InteractionType` interface:
```typescript
interface InteractionType {
  // ... existing fields
  interactionTypeCategory?: 'html' | 'pixijs' | 'iframe' | 'uploaded-media';
  // Note: Media file info comes from processed content, not stored here
  mediaConfig?: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
  };
}
```

**Processed Content Structure:**
```typescript
interface ProcessedOutput {
  id: string;
  contentSourceId: string;
  outputData: {
    mediaFileUrl: string;
    mediaFileName: string;
    mediaFileType: 'video' | 'audio';
    mediaFileSize: number;
    mediaFileDuration?: number;
    mediaMetadata?: {
      width?: number;
      height?: number;
      codec?: string;
      bitrate?: number;
    };
  };
  // ... other fields
}
```

### 6.3 Testing Checklist
- [ ] Upload video file as content source
- [ ] Upload audio file as content source
- [ ] Submit content source for approval
- [ ] Approve content source (admin)
- [ ] Verify processed output contains media file URL
- [ ] Create uploaded-media interaction type
- [ ] Select approved media content source in interaction builder
- [ ] Configure media settings (autoplay, loop, etc.)
- [ ] Preview media player in interaction builder
- [ ] Save interaction with media configuration
- [ ] Add interaction instance to lesson with processed content
- [ ] Load interaction in lesson view
- [ ] Verify media player loads with correct file
- [ ] Test lesson play/pause controls operate on media
- [ ] Test all SDK media control methods
- [ ] Test overlay show/hide/toggle
- [ ] Test time-based triggers
- [ ] Test overlay button interactions
- [ ] Test lesson time sync (if applicable)
- [ ] Test SDK test interaction
- [ ] Test media player state syncs with lesson play/pause button

## Implementation Order

1. **Phase 1**: Database schema, file upload endpoint, migration
2. **Phase 2**: File upload component, integration into builder
3. **Phase 3**: Media player component, integration into lesson view
4. **Phase 4**: SDK extensions, bridge updates
5. **Phase 5**: Documentation and test interaction
6. **Phase 6**: Integration testing and refinements

## Technical Considerations

### File Storage & Content Source Workflow
- Media files uploaded via content sources endpoint
- Files stored using existing FileStorageService
- Files go through approval workflow (pending -> approved)
- Processed outputs contain media file URLs and metadata
- Interaction instances reference processed content by ID
- File deletion handled through content source deletion
- Access control enforced at content source level

### Media Player
- Use native HTML5 `<video>` and `<audio>` elements
- Support common formats (MP4, WebM, OGG for video; MP3, OGG, WAV for audio)
- Handle CORS if media is served from different domain
- Support mobile browsers (iOS Safari, Android Chrome)

### Overlay System
- Reuse iframe overlay infrastructure
- Inject builder's HTML/CSS/JS into overlay container
- Ensure overlay doesn't block media controls (unless intended)
- Support z-index management for overlay layers

### SDK Communication
- Use postMessage API (similar to iframe SDK)
- Bridge service handles messages from media player
- Support async operations (getCurrentTime, getDuration, etc.)
- Handle errors gracefully (media not loaded, invalid time, etc.)

### Performance
- Lazy load media files (don't load until interaction is active)
- Preload metadata only (not full file) by default
- Support progressive loading for large files
- Cache media URLs to prevent re-upload

### Security
- Validate file types on upload
- Validate file sizes (prevent DoS)
- Sanitize overlay HTML/CSS/JS
- Restrict media file access to authorized users
- Support CORS headers for media files

## Transcription Implementation

### Option 1: OpenAI Whisper (Recommended - Fully Open Source)
- **Self-hosted**: Run Whisper API server locally or in Docker
- **Free**: No API costs, fully open source
- **Accurate**: State-of-the-art transcription quality
- **Languages**: Supports 99+ languages
- **Implementation**: 
  - Docker container with Whisper API
  - Backend service calls Whisper API endpoint
  - Async processing (non-blocking)
  - Store transcription in processed output

### Option 2: Web Speech API (Browser-based)
- **Free**: Built into browsers
- **Limitations**: Requires user interaction, browser-dependent, less accurate
- **Not recommended** for server-side processing

### Option 3: AssemblyAI / Deepgram (Cloud Services)
- **Free tier available**: Limited minutes per month
- **Accurate**: Good transcription quality
- **Requires API key**: External dependency
- **Not fully open source**: Relies on external service

**Recommendation**: Use Whisper (self-hosted) for full control and no costs.

## Future Enhancements

- **Subtitles/Captions**: Support SRT/VTT files for video (can be generated from transcription)
- **Multiple Overlays**: Support multiple overlay layers with IDs
- **Media Events**: Expose media events (play, pause, ended, etc.) to SDK
- **Playback Speed Control**: UI for adjusting playback speed
- **Volume Control**: SDK method for volume control
- **Media Analytics**: Track playback time, completion rate, etc.
- **Media Transcoding**: Automatically transcode to web-compatible formats
- **Thumbnail Generation**: Generate thumbnails for video files
- **Transcription Search**: Search within transcriptions for specific content
- **Transcription Highlighting**: Highlight transcript segments as media plays

