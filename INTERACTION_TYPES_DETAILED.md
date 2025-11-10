# Interaction Types - Detailed JSON Schemas

**Companion to:** INTERACTION_TYPES_REFERENCE.md  
**Purpose:** Complete JSON schemas, LLM prompts, and implementation specs for all 20 interaction types

---

## How to Read This Document

Each interaction type includes:
1. **ID & Metadata** - Unique identifier, name, description
2. **TEACH Stage Fit** - Recommended stages (not restrictive)
3. **JSON Schema** - TypeScript-style interface for input data
4. **LLM Generation Prompt** - Embedded prompt for auto-creation
5. **Auto-Generation Capability** - What LLM can/cannot generate
6. **Mobile Adaptations** - Touch/tap modifications
7. **Scoring Logic** - How 0-100 score is calculated
8. **Asset Requirements** - Sprites, textures, effects needed
9. **Implementation Notes** - Pixi.js guidance

---

## Interaction Type Schemas

### 1. Mystery Reveal (Curtain Swipe)

```typescript
{
  id: "mystery-reveal",
  name: "Mystery Reveal",
  category: "tease-trigger",
  description: "Dramatic curtain/fog overlay covers provocative image. Students swipe to reveal in 3 steps with questions at each stage. Final multiple-choice question after full reveal.",
  
  teachStageFit: ["tease-trigger", "explore-handle"],
  cognitiveLoad: "low",
  estimatedDuration: "2-3 minutes",
  
  inputSchema: {
    imageUrl: "string (required) - URL to provocative/intriguing image",
    imageSource: "extracted | ai-generated | manual-upload",
    overlayTexture: "'fog' | 'curtain' | 'jigsaw' - Mask style",
    revealSteps: [
      {
        percentRevealed: "number (33, 66, 100)",
        question: "string - Question about partially visible content",
        hint: "string (optional) - Clue if student stuck",
        expectedInsight: "string - What student should notice at this reveal level"
      }
    ],
    finalQuestion: {
      text: "string - Bold multiple choice question after full reveal",
      options: "string[] - 3-5 answer choices",
      correctIndex: "number - Index of correct answer (0-based)",
      explanation: "string - Why correct answer is right"
    },
    audioTeaser: "string (optional) - URL to dramatic sound effect"
  },
  
  llmGenerationPrompt: `
    FROM CONTENT: {contentText}
    
    TASK: Generate a Mystery Reveal interaction.
    
    1. IDENTIFY: A striking image concept related to the content (e.g., "exploding star" for supernova topic)
    2. IF IMAGE URL exists in content: Extract it
       ELSE: Generate image prompt for Grok image API (e.g., "dramatic photo of supernova explosion in space")
    3. CREATE 3 REVEAL QUESTIONS:
       - 33% revealed: Ask about visible portion (e.g., "What shape do you see?")
       - 66% revealed: Ask about emerging pattern (e.g., "Why might this be glowing?")
       - 100% revealed: Ask about full context (e.g., "What phenomenon is this?")
    4. CREATE FINAL MULTIPLE CHOICE:
       - Bold surprising question (e.g., "What caused this explosion?")
       - 4 plausible options (1 correct, 3 tempting distractors)
       - Explanation connecting to lesson objectives
    
    CONFIDENCE SCORING:
    - 0.9-1.0: Content has perfect image + clear reveal progression
    - 0.7-0.9: Content allows good questions but needs AI-generated image
    - <0.7: Content too abstract/unsuitable (skip this interaction)
    
    OUTPUT FORMAT: {JSON matching inputSchema above}
  `,
  
  autoGenerationCapability: {
    questions: "✅ Fully auto-generable",
    image: "⚠️ Extract from content OR generate via Grok image API",
    audioTeaser: "❌ Manual upload only (optional)"
  },
  
  mobileAdaptations: {
    swipeGesture: "Touch drag with haptic feedback",
    fallback: "Tap buttons (25%, 50%, 75%, 100% reveal) if drag not detected",
    orientation: "Lock to portrait for best UX"
  },
  
  scoringLogic: {
    base: "40 points for completing all reveals",
    stepBonus: "10 points per correct step question (max 30)",
    finalBonus: "30 points for correct final answer",
    timeBonus: "0 points (no time pressure)",
    formula: "base + stepBonus + finalBonus = 0-100"
  },
  
  assetRequirements: {
    overlayTextures: ["fog.png", "curtain.png", "jigsaw-pieces.png"],
    soundEffects: ["swipe.mp3", "reveal-ding.mp3", "confetti-burst.mp3"],
    uiElements: ["progress-bar.png", "hint-button.png"]
  },
  
  pixiImplementation: {
    mainContainer: "PIXI.Container for layered image + mask",
    maskLayer: "PIXI.Graphics with alpha channel for reveal effect",
    interactivity: "PIXI.InteractionManager for drag events",
    animation: "GSAP Tween for smooth mask transition on swipe",
    particles: "PIXI.ParticleContainer for confetti on correct final answer"
  }
}
```

---

### 2. Explosive Poll with Particle Burst

```typescript
{
  id: "explosive-poll",
  name: "Explosive Poll",
  category: "tease-ignite",
  description: "Surprising demo (GIF/video) plays briefly, freezes on cliffhanger. Students vote via animated poll buttons that explode with colored particles (green=correct, red=incorrect). Live aggregate results with fireworks.",
  
  teachStageFit: ["tease-ignite", "explore-track"],
  cognitiveLoad: "low",
  estimatedDuration: "1-2 minutes",
  
  inputSchema: {
    mediaClip: {
      url: "string (required) - GIF or video URL",
      source: "extracted | manual-upload",
      startTime: "number (optional) - For videos, start timestamp",
      endTime: "number (optional) - Freeze timestamp (cliffhanger moment)",
      duration: "number - Clip length in seconds"
    },
    pollQuestion: "string - Question appearing after freeze",
    options: [
      {
        text: "string - Option text",
        isCorrect: "boolean"
      }
    ],
    explanation: "string - Why correct answer is right (shown after vote)",
    celebrationIntensity: "'low' | 'medium' | 'high' - Particle burst intensity"
  },
  
  llmGenerationPrompt: `
    FROM CONTENT: {contentText}
    
    TASK: Generate an Explosive Poll interaction.
    
    1. IDENTIFY: A surprising fact, demo, or "aha moment" from content
    2. FIND MEDIA: Extract GIF/video URL from content if available
       - Look for embedded media, YouTube links, diagrams
       - If none: Suggest search query for lesson builder (e.g., "volcano eruption GIF")
    3. CREATE CLIFFHANGER:
       - Identify dramatic "freeze frame" moment in media
       - OR: Describe ideal freeze moment if media not available
    4. CREATE POLL QUESTION:
       - Surprising question about what happens next or why phenomenon occurs
       - Example: "What happens when you drop Mentos in Coke?"
    5. CREATE 3-5 OPTIONS:
       - 1 correct answer
       - 2-4 plausible distractors (common misconceptions or tempting wrongs)
    6. WRITE EXPLANATION:
       - Connect answer to lesson objectives
       - Include "wow factor" detail
    
    CONFIDENCE SCORING:
    - 0.9-1.0: Content has media + clear surprise moment + good question
    - 0.7-0.9: Content has surprise but needs media search/upload
    - <0.7: Content too dry/predictable (skip)
    
    OUTPUT FORMAT: {JSON matching inputSchema}
  `,
  
  autoGenerationCapability: {
    question: "✅ Fully auto-generable",
    options: "✅ Fully auto-generable (with distractors)",
    mediaClip: "⚠️ Extract from content OR manual upload OR suggest search query",
    liveResults: "✅ Auto (database query for all user responses)"
  },
  
  mobileAdaptations: {
    buttons: "Large touch targets (min 48x48px)",
    particleBurst: "Reduce particle count on low-end devices",
    videoPlayback: "Inline player with play/pause controls"
  },
  
  scoringLogic: {
    correctVote: "100 points",
    incorrectVote: "0 points",
    participationCredit: "20 points for attempting (even if wrong)",
    formula: "correct ? 100 : 20"
  },
  
  assetRequirements: {
    particles: ["particle-green.png", "particle-red.png", "particle-gold.png"],
    soundEffects: ["explosion.mp3", "correct-ding.mp3", "wrong-buzz.mp3", "fireworks.mp3"],
    uiElements: ["poll-button-base.png", "results-chart-bg.png"]
  },
  
  databaseAccess: {
    read: "SELECT COUNT(*), option_index FROM poll_responses WHERE interaction_id = ? GROUP BY option_index",
    write: "INSERT INTO poll_responses (interaction_id, student_id, option_index, is_correct, timestamp)"
  }
}
```

---

*Document continues with remaining 18 interaction types...*

**NOTE:** This document is split into multiple files for readability. See:
- `INTERACTION_TYPES_DETAILED_PART2.md` - Types 3-10
- `INTERACTION_TYPES_DETAILED_PART3.md` - Types 11-20
- `LESSON_JSON_SCHEMA.md` - Complete lesson structure
- `SHARED_ASSET_LIBRARY.md` - Sprite catalog
- `LLM_GENERATION_PROMPTS.md` - Master analyzer prompt

