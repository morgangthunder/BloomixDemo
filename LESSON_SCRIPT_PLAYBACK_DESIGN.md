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

## Proposed Solution: Floating Teacher Widget

### 👨‍🏫 **Floating Teacher UI** (Over lesson content)

```
┌─────── Lesson Content ───────────────────────────────┐
│                                                       │
│  [Lesson content displays here]                      │
│                                                       │
│                     ┌───────────────────────────┐    │
│                     │  👨‍🏫  AI Teacher      [−][✕]│    │
│                     │                           │    │
│                     │  "Welcome to              │    │
│                     │  Photosynthesis! Today    │    │
│                     │  we'll discover how       │    │
│                     │  plants turn sunlight     │    │
│                     │  into food..."            │    │
│                     │                           │    │
│                     │  ⏸ Pause  ⏭ Skip         │    │
│                     └───────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘

When minimized:
┌─────── Lesson Content ───────────────────────────────┐
│                                                       │
│  [Lesson content displays here]                      │
│                                                       │
│                                         ┌─────┐      │
│                                         │ 👨‍🏫 │      │
│                                         │ ... │      │
│                                         └─────┘      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Components:
1. **👨‍🏫 Teacher Avatar**
   - Animated/pulsing when speaking
   - Static when paused
   
2. **💬 Speech Bubble**
   - Shows current script text
   - Auto-scrolls as text progresses
   - Closes when script ends
   
3. **⏸ Pause Button**
   - Pauses current script
   - Becomes ▶ Play when paused
   
4. **⏭ Skip Button**
   - Skip current script block
   - Move to interaction/content
   
5. **[−] Minimize Button**
   - Collapses to small icon
   - Still shows "..." when speaking
   
6. **[✕] Close Button**
   - Completely hides teacher
   - Auto-restores on next script

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

## ✅ Design Decisions (Confirmed):

1. **Auto-play vs Manual?**
   - ✅ **Auto-play** when entering sub-stage
   - Student can **pause anytime**
   
2. **Skip Behavior**
   - ✅ **Skip current block only** (not entire sub-stage)
   
3. **TTS/STT Provider System**
   - ✅ **Multi-provider approach** (like LLM providers)
   - Add to existing `llm-usage` dashboard as "TTS/STT Usage"
   - Switch providers to explore cost vs performance
   - **For now:** Basic text display in speech bubble
   
4. **Script Creation**
   - ✅ **Manual entry** in lesson-builder interface
   - AI assistant can **auto-populate** on request
   - **Scaffolder AI** generates full lesson JSONs with scripts
   - All scripts **editable** in lesson-builder
   
5. **UI Implementation (MVP)**
   - ✅ **Floating teacher icon** with speech bubble
   - Positioned over lesson content window
   - **Auto-popup** when teacher speaks
   - Can be **minimized** by student
   - **Auto-restore** when new script starts

## TTS/STT Provider System (Like LLM Providers)

### Database Schema:
```sql
CREATE TABLE tts_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- 'google-cloud-tts', 'amazon-polly', 'azure', 'elevenlabs'
  api_endpoint VARCHAR(255),
  api_key TEXT,
  voice_id VARCHAR(100),
  cost_per_million_chars DECIMAL(10, 4),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB, -- voice settings, speed, pitch, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tts_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL,
  provider_id UUID REFERENCES tts_providers(id),
  use_case VARCHAR(100), -- 'lesson-script', 'ai-chat-response', etc.
  text_length INTEGER NOT NULL,
  characters_used INTEGER NOT NULL,
  processing_time_ms INTEGER,
  voice_used VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Usage Dashboard Integration:
Add to existing `/super-admin/llm-usage` page:
- New tab: "TTS/STT Usage"
- Cost tracking per provider
- Characters used vs allocation
- Cost per million characters
- Provider comparison

### Provider Examples:
1. **Google Cloud TTS**
   - Cost: ~$4-16 per 1M characters
   - Voices: 380+ in 50+ languages
   - Quality: Excellent
   
2. **Amazon Polly**
   - Cost: ~$4-16 per 1M characters
   - Voices: 60+ in 30+ languages
   - Quality: Excellent
   
3. **ElevenLabs**
   - Cost: ~$30 per 1M characters
   - Voices: Ultra-realistic
   - Quality: Best-in-class
   
4. **Browser Web Speech API**
   - Cost: FREE
   - Voices: Device-dependent
   - Quality: Basic

## Implementation Phases

### Phase 1: MVP - Text-Only Script Display ✅ (Current Priority)
- [x] Define script schema
- [ ] Add floating teacher widget component
- [ ] Speech bubble with text display
- [ ] Pause/Skip controls
- [ ] Minimize/Close functionality
- [ ] Auto-popup on new script
- [ ] Add script fields to lesson-builder interface

### Phase 2: TTS Provider Infrastructure
- [ ] Create `tts_providers` table
- [ ] Create `tts_usage_logs` table
- [ ] Backend API for provider CRUD
- [ ] Frontend provider management (like LLM providers)
- [ ] Usage dashboard integration

### Phase 3: TTS Integration (Start with Google Cloud)
- [ ] Google Cloud TTS API integration
- [ ] Voice selection per lesson
- [ ] Audio playback in widget
- [ ] Usage tracking
- [ ] Cost calculation

### Phase 4: Multi-Provider Support
- [ ] Amazon Polly integration
- [ ] Azure TTS integration
- [ ] ElevenLabs integration
- [ ] Provider switching/comparison
- [ ] Voice library per provider

### Phase 5: Advanced Features
- [ ] STT for student voice input
- [ ] Real-time transcript
- [ ] Multi-language support
- [ ] Voice cloning (ElevenLabs)
- [ ] Emotion/tone control

## Next Steps (Prioritized)

**NOW (Block E2E testing):**
1. ✅ Fix sub-stages display bug → **DONE**
2. Test lesson player with existing Python lesson
3. Test interaction loading with Photosynthesis lesson
4. Complete E2E test

**THEN (Script System MVP):**
1. Create `FloatingTeacherWidget` component
2. Add script display (text only, no TTS yet)
3. Add pause/skip/minimize controls
4. Add script editor to lesson-builder
5. Update test lessons with script content

**LATER (TTS Infrastructure):**
1. Design TTS provider system
2. Implement provider management
3. Integrate first TTS provider (Google Cloud)
4. Add usage tracking/costs

