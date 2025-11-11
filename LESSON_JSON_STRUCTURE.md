# Lesson JSON Structure

## Overview

All lesson content is stored in **JSON files** in the `/Upora/lessons/` directory. These files define the complete structure, content, and timing of lessons.

---

## File Location

```
/Upora/lessons/
  ├── photosynthesis-basics.json
  ├── algebra-intro.json
  └── ...
```

---

## Root Structure

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "thumbnailUrl": "string (URL)",
  "category": "string",
  "difficulty": "Beginner | Intermediate | Advanced",
  "estimatedDuration": "number (minutes)",
  "tags": ["string"],
  "objectives": { ... },
  "metadata": { ... },
  "stages": [ ... ]
}
```

---

## Script Block Structure (Key Feature)

Script blocks define **what the AI teacher says and when**:

```json
{
  "id": "script-1-1-intro",
  "order": 0,
  "idealTimestamp": 0,
  "text": "Welcome to this lesson...",
  "estimatedDuration": 15,
  "audioUrl": "https://... (optional TTS URL)",
  "playbackRules": {
    "autoPlay": true,
    "canSkip": true,
    "pauseOnInteraction": false,
    "displayIfMissed": "asap | never | onRequest"
  },
  "triggerCondition": "time | interactionStart | interactionComplete | stageChange (optional)"
}
```

### Timestamp Rules

| Field | Type | Description |
|-------|------|-------------|
| `idealTimestamp` | number | Seconds from substage start when this should play |
| `triggerCondition` | string | Alternative trigger (overrides timestamp) |
| `displayIfMissed` | string | What to do if ideal time has passed |

### Display If Missed Options

- **`"asap"`**: Display as soon as possible (default)
- **`"never"`**: Skip if timestamp passed
- **`"onRequest"`**: Only show if student clicks "Replay script"

### Example Timeline

```
Substage Start (t=0s)
│
├─ t=0s:  Script "intro" plays automatically
├─ t=20s: Script "pre-interaction" plays
├─ t=21s: Student starts interaction (takes 45 seconds)
├─ t=66s: Interaction completes → Script "post-interaction" plays
│         (even though idealTimestamp was null, triggerCondition="interactionComplete")
└─ Substage End
```

### Handling Delays

If a student takes longer to engage:

```
Substage Start (t=0s)
│
├─ t=0s:  Script "intro" (idealTimestamp: 0)
├─ t=5s:  Student pauses to chat with AI
├─ t=30s: Student resumes
├─ t=30s: Script "pre-interaction" plays IMMEDIATELY (displayIfMissed: "asap")
│         (idealTimestamp: 20 has passed, so display ASAP)
└─ Continue...
```

---

## Stage Types (TEACH Framework)

| Type | Purpose | Typical Interactions |
|------|---------|---------------------|
| `tease` | Hook & Engage | Mystery Reveal, Explosive Poll |
| `expose` | Introduce Core Concept | Video, Layered Hotspot |
| `absorb` | Deep Dive | Fragment Builder, Kinetic Typography |
| `contribute` | Practice & Create | Invention Lab, Skill Drill |
| `hone` | Refine & Perfect | Prediction Branching, Progress Reflection |

---

## Interaction Types

Each substage can have:
- **`interactionTypeId`**: ID of the interaction type (e.g., "true-false-selection")
- **`contentOutputId`**: ID of processed content that feeds the interaction

Interactions pause script playback based on `pauseOnInteraction` rule.

---

## Complete Example: Script Flow with Interaction

```json
{
  "id": "substage-1-1",
  "title": "What is Photosynthesis?",
  "scriptBlocks": [
    {
      "id": "script-intro",
      "order": 0,
      "idealTimestamp": 0,
      "text": "Welcome! Let's learn about photosynthesis.",
      "playbackRules": {
        "autoPlay": true,
        "pauseOnInteraction": false,
        "displayIfMissed": "asap"
      }
    },
    {
      "id": "script-pre-quiz",
      "order": 1,
      "idealTimestamp": 20,
      "text": "Now let's test your knowledge with a quiz!",
      "playbackRules": {
        "autoPlay": true,
        "pauseOnInteraction": true,  // Pause script while quiz is active
        "displayIfMissed": "asap"
      }
    },
    {
      "id": "script-post-quiz",
      "order": 2,
      "idealTimestamp": null,
      "triggerCondition": "interactionComplete",  // Play after quiz
      "text": "Great job! You scored {score}%.",
      "playbackRules": {
        "autoPlay": true,
        "displayIfMissed": "never"  // Don't play if stage ends before quiz
      }
    }
  ]
}
```

---

## Loading Lessons into Database

### Option 1: Manual Upload (Lesson Builder)
1. Open Lesson Builder
2. Upload JSON file
3. Review and publish

### Option 2: Bulk Import (API Endpoint)
```bash
POST /api/lessons/import
Content-Type: application/json

{
  "file": "photosynthesis-basics.json",
  "action": "create | update | replace"
}
```

### Option 3: Development Seeding (SQL Script)
For test data only, the SQL script in `test-data-setup.sql` seeds the database with JSON content from lesson files.

---

## Version Control

Lesson JSON files are **version controlled in Git**, allowing:
- **Rollback** to previous lesson versions
- **Branching** for experimental lessons
- **Collaboration** between lesson creators
- **Approval workflow** via pull requests

---

## Future Enhancements

### Planned Features

1. **Variable Substitution in Scripts**
   ```json
   {
     "text": "Great job, {studentName}! You scored {score}%."
   }
   ```

2. **Conditional Scripts**
   ```json
   {
     "conditions": {
       "if": "score >= 80",
       "text": "Excellent work!",
       "else": "Let's review that again."
     }
   }
   ```

3. **Multi-Language Support**
   ```json
   {
     "text": {
       "en": "Welcome to the lesson!",
       "es": "¡Bienvenido a la lección!",
       "fr": "Bienvenue à la leçon!"
     }
   }
   ```

4. **Adaptive Timing**
   ```json
   {
     "playbackRules": {
       "adaptiveTiming": true,  // Adjust based on student pace
       "minDelay": 5,           // Minimum seconds before next script
       "maxDelay": 60           // Maximum wait time
     }
   }
   ```

---

## Summary

- ✅ **All lesson content in JSON files** (not SQL)
- ✅ **Timestamps define ideal script playback times**
- ✅ **"displayIfMissed": "asap"** handles student delays
- ✅ **Trigger conditions** for event-based scripts
- ✅ **Version controlled** in Git
- ✅ **Imported into database** via API or Lesson Builder

**The SQL files are ONLY for test data seeding during development.**

