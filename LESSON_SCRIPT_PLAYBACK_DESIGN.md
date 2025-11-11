# Lesson Script Playback Design

## Problem Statement
The AI teacher needs to deliver scripted content at specific moments during a lesson:
1. **At lesson start** - Introduction and context
2. **Between sub-stages** - Transitions and guidance
3. **Before interactions** - Instructions and setup
4. **After interactions** - Feedback and next steps

Currently, there's no mechanism to control when the AI speaks or to ensure it delivers the exact scripted words.

## Current State
- Lessons have `script` blocks in the database
- No playback controls in the lesson player
- No visual indication of script progress
- No synchronization between script and lesson flow

## Proposed Solution: Script Playback Bar

### 🎮 **Control Bar UI** (Bottom of lesson player)

```
┌─────────────────────────────────────────────────────┐
│  ⏯ Play  ⏸ Pause  ⏭ Skip  📍 Progress: 00:45 / 02:30 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🎙️ AI Teacher: "Welcome to Photosynthesis..."       │
└─────────────────────────────────────────────────────┘
```

### Components:
1. **⏯ Play/Pause Button**
   - Starts/stops AI teacher narration
   - Synthesizes script text to speech (TTS)
   
2. **⏭ Skip Button**
   - Skip current script block
   - Jump to next sub-stage or interaction
   
3. **📍 Progress Bar**
   - Shows position in current script block
   - Shows total script duration
   - Click to seek (optional)
   
4. **🎙️ Live Caption**
   - Shows current script text being spoken
   - Helps students follow along
   - Accessibility feature

## Script Data Structure

### Lesson JSON:
```json
{
  "stages": [
    {
      "id": "stage-1",
      "title": "Understanding Photosynthesis",
      "script": {
        "intro": {
          "text": "Welcome! Today we're exploring how plants make their food using sunlight...",
          "estimatedDuration": 15
        }
      },
      "subStages": [
        {
          "id": "substage-1-1",
          "title": "What is Photosynthesis?",
          "script": {
            "before": {
              "text": "Let's start by understanding the basics. Photosynthesis is...",
              "estimatedDuration": 20
            },
            "after": {
              "text": "Great! Now that you understand the process, let's test your knowledge.",
              "estimatedDuration": 10
            }
          },
          "content": "...",
          "interactionTypeId": "..."
        }
      ]
    }
  ]
}
```

### Script Block Schema:
```typescript
interface ScriptBlock {
  text: string;              // Exact words AI must deliver
  estimatedDuration: number; // Seconds (for progress bar)
  voiceConfig?: {            // Optional TTS settings
    speed: number;           // 0.5 - 2.0
    pitch: number;           // 0.5 - 2.0
    voice: string;           // Voice ID
  };
}

interface SubStageScript {
  before?: ScriptBlock;  // Before content/interaction
  after?: ScriptBlock;   // After interaction completion
}
```

## Playback Flow

### Scenario 1: Sub-stage with Content Only
```
1. Student clicks sub-stage
2. ⏯ Auto-play "before" script
3. Show content while speaking
4. [Pause] when script ends
5. Student reads content
6. Student clicks "Next" → move to next sub-stage
```

### Scenario 2: Sub-stage with Interaction
```
1. Student clicks sub-stage
2. ⏯ Auto-play "before" script (instructions)
3. Show interaction setup
4. [Pause] when script ends
5. ⏯ Student clicks "Start Interaction"
6. Interaction begins (script paused)
7. Student completes interaction
8. ⏯ Auto-play "after" script (feedback)
9. [Pause] when script ends
10. Student clicks "Next" → move to next sub-stage
```

### Scenario 3: Stage Introduction
```
1. Student enters lesson
2. ⏯ Auto-play stage intro script
3. Show stage overview
4. [Pause] when script ends
5. Student clicks first sub-stage
```

## Implementation Plan

### Phase 1: Data Setup ✅ (Current)
- [x] Define script schema
- [ ] Add script blocks to test lessons
- [ ] Seed database with scripted content

### Phase 2: Playback Bar UI
- [ ] Create `ScriptPlaybackBar` component
- [ ] Play/Pause/Skip buttons
- [ ] Progress bar with time display
- [ ] Live caption display

### Phase 3: TTS Integration
- [ ] Integrate Web Speech API (browser TTS)
- [ ] Or: Integrate cloud TTS (e.g., Google Cloud TTS, Amazon Polly)
- [ ] Voice configuration per lesson
- [ ] Fallback to text-only if TTS unavailable

### Phase 4: Playback Logic
- [ ] Auto-play on sub-stage enter
- [ ] Pause on script end
- [ ] Resume on user action
- [ ] Skip functionality
- [ ] Progress tracking

### Phase 5: Polish
- [ ] Keyboard shortcuts (Spacebar = Play/Pause, N = Next)
- [ ] Accessibility (screen reader support)
- [ ] Mobile optimization
- [ ] Save progress (resume from last position)

## Technical Considerations

### TTS Options:

**Option A: Web Speech API** (Browser Native)
- ✅ No API costs
- ✅ Works offline
- ❌ Limited voice quality
- ❌ Inconsistent across browsers

**Option B: Cloud TTS** (Google/Amazon/Azure)
- ✅ High-quality voices
- ✅ Consistent across devices
- ✅ Multiple languages
- ❌ API costs (~$4 per 1M characters)
- ❌ Requires internet

**Recommendation:** Start with Web Speech API, add cloud TTS as premium feature.

### Script Storage:

**Option A: Inline in Lesson JSON** (Current)
- ✅ Simple, self-contained
- ✅ Easy to version with lesson
- ❌ Large JSON files

**Option B: Separate Script Assets**
- ✅ Smaller lesson JSON
- ✅ Can cache separately
- ❌ More complex to manage

**Recommendation:** Inline for MVP, optimize later if needed.

## User Experience Flow

### Student Perspective:
1. **Enters lesson** → Hears AI welcome & overview
2. **Clicks sub-stage** → Hears AI explain what to do
3. **Sees interaction** → Hears AI give instructions
4. **Completes interaction** → Hears AI feedback
5. **Can pause/skip anytime** → Student controls pace

### Lesson Builder Perspective:
1. **Writes script for each sub-stage**
2. **Tests with TTS preview**
3. **Adjusts duration estimates**
4. **Optionally configures voice settings**

## Example: Photosynthesis Lesson

```json
{
  "stages": [
    {
      "id": "stage-1",
      "title": "Understanding Photosynthesis",
      "script": {
        "intro": {
          "text": "Welcome to Photosynthesis! Did you know that plants are like tiny solar panels? Today, we'll discover how they turn sunlight into food. Let's dive in!",
          "estimatedDuration": 12
        }
      },
      "subStages": [
        {
          "id": "substage-1-1",
          "title": "What is Photosynthesis?",
          "script": {
            "before": {
              "text": "Let's start with the basics. Photosynthesis is how plants make their own food using three simple ingredients: sunlight, water, and carbon dioxide. Watch closely!",
              "estimatedDuration": 15
            },
            "after": {
              "text": "Got it? Now let's see if you can identify the TRUE statements about photosynthesis. Click to begin!",
              "estimatedDuration": 8
            }
          },
          "content": "...",
          "contentOutputId": "..."
        }
      ]
    }
  ]
}
```

## Questions for Morgan:

1. **Auto-play vs Manual?**
   - Should script auto-play when entering a sub-stage?
   - Or require student to click Play?
   
2. **Skip Behavior**
   - Skip just current block, or skip to next sub-stage?
   
3. **Voice Preference**
   - Start with browser TTS?
   - Budget for cloud TTS ($4 per 1M characters)?
   
4. **Script Source**
   - Lesson builder writes manually?
   - Or AI generates from content (with human review)?
   
5. **Progress Persistence**
   - Save which scripts have been heard?
   - Auto-skip heard scripts on re-entry?

## Next Steps

**Immediate:**
1. ✅ Fix sub-stages display bug (in progress)
2. Add script blocks to test lesson
3. Create basic playback bar component

**Short-term:**
4. Implement Web Speech API
5. Add play/pause controls
6. Test with students

**Long-term:**
7. Cloud TTS integration
8. Voice customization
9. Multi-language support

