# Complete Interaction Library - Implementation Ready

**Version:** 1.0 | **Date:** November 2025 | **Status:** Ready for Development

---

## Quick Reference

**Total Interaction Types:** 21  
**Auto-Generable:** 19/21 (90%)  
**Require Manual Assets:** 2/20 (Anomaly Hunter, some media clips)  
**TEACH Stage Coverage:** All 5 stages, all sub-stages

### Stage Distribution
- **TEASE:** 4 types (Mystery Reveal, Explosive Poll, Memory Lane Timeline, True/False Selection)
- **EXPLORE:** 5 types (Physics Sandbox, Card Clue Peeler, Scratch-Off Explorer, Prediction Branching, Anomaly Hunter)
- **ABSORB:** 5 types (Paraphrase Builder, Topic Spinner, Fragment Builder, Concept Checker, Bridge Matcher)
- **CULTIVATE:** 4 types (Skill Drill Arcade, Scenario Remix Sorter, Blank Canvas Creator, Stepping Stones)
- **HONE:** 3 types (Retrieval Race, Progress Reflection, Exit Bridge Maze)

---

## Complete Interaction Type Definitions

### TEASE Stage Interactions

#### 1. Mystery Reveal (Curtain Swipe)
- **ID:** `mystery-reveal`
- **Sub-Stage:** Trigger
- **Cognitive Load:** Low
- **Duration:** 2-3 min

**Input Data:**
```json
{
  "imageUrl": "string",
  "imageSource": "extracted | ai-generated | manual",
  "overlayTexture": "fog | curtain | jigsaw",
  "revealSteps": [
    {"percent": 33, "question": "string", "hint": "string?"},
    {"percent": 66, "question": "string", "hint": "string?"},
    {"percent": 100, "question": "string", "hint": "string?"}
  ],
  "finalQuestion": {
    "text": "string",
    "options": ["string"],
    "correctIndex": 0,
    "explanation": "string"
  },
  "audioTeaser": "string?"
}
```

**LLM Can Generate:** ✅ All questions, ⚠️ Image (extract or generate), ❌ Audio (optional)  
**Confidence Threshold:** 0.7  
**Score:** 40 (base) + 10/step (max 30) + 30 (final) = 0-100  
**Mobile:** Touch drag or tap buttons (25%/50%/75%/100%)  
**Assets:** fog.png, curtain.png, confetti particles

---

#### 2. Explosive Poll with Particle Burst
- **ID:** `explosive-poll`
- **Sub-Stage:** Ignite
- **Cognitive Load:** Low
- **Duration:** 1-2 min

**Input Data:**
```json
{
  "mediaClip": {
    "url": "string",
    "type": "gif | video",
    "startTime": 0,
    "endTime": 10,
    "freezeAt": 8
  },
  "pollQuestion": "string",
  "options": [
    {"text": "string", "isCorrect": false}
  ],
  "explanation": "string"
}
```

**LLM Can Generate:** ✅ Question + options, ⚠️ Media (extract or manual), ✅ Live results  
**Confidence Threshold:** 0.7  
**Score:** Correct=100, Incorrect=20 (participation credit)  
**Mobile:** Large touch buttons (min 48x48px)  
**Assets:** particle-green.png, particle-red.png, explosion.mp3, fireworks.mp3  
**DB Access:** Poll results aggregation for live display

---

#### 3. Memory Lane Timeline
- **ID:** `memory-lane-timeline`
- **Sub-Stage:** Evoke
- **Cognitive Load:** Medium
- **Duration:** 3-5 min

**Input Data:**
```json
{
  "promptTemplates": [
    "A time I felt lost...",
    "When I discovered something new...",
    "A moment that changed my perspective..."
  ],
  "topicConnection": "string - How prompts relate to lesson topic",
  "emojiAssets": ["😊", "😢", "🤔", "🎉"],
  "timelineOrientation": "horizontal | vertical",
  "aiReflectionPrompt": "Reflect on student's memory and connect to {topicConnection}"
}
```

**LLM Can Generate:** ✅ Prompt templates, ✅ Topic connection, ✅ AI reflection  
**Confidence Threshold:** 0.8  
**Score:** 100 (completion-based, no right/wrong)  
**Mobile:** Vertical timeline for better mobile UX  
**Assets:** memory-card-bg.png, emoji sprites, timeline-line.png  
**UGC:** Student memories stored privately (opt-in to share with class)  
**AI Role:** Real-time chat reflection after submission

---

#### 4. True/False Selection
- **ID:** `true-false-selection`
- **Sub-Stage:** Trigger
- **Cognitive Load:** Low
- **Duration:** 2-3 min

**Purpose:** Activate prior knowledge and surface misconceptions before diving into new content. Students identify which statements are TRUE, revealing what they already know (or think they know).

**Input Data:**
```json
{
  "fragments": [
    {
      "text": "Plants perform photosynthesis",
      "isTrueInContext": true,
      "explanation": "Plants are primary organisms that carry out photosynthesis"
    },
    {
      "text": "Plants eat soil",
      "isTrueInContext": false,
      "explanation": "Plants make their own food through photosynthesis, they don't consume soil"
    }
  ],
  "targetStatement": "Which of these statements about photosynthesis are TRUE?",
  "maxFragments": 8
}
```

**LLM Can Generate:** ✅ All statements, ✅ Explanations, ✅ Common misconceptions  
**Confidence Threshold:** 0.8  
**Score:** (True statements selected / Total true statements) × 100  
**Mobile:** Large tap targets (min 48x48px), haptic feedback for selection  
**Assets:** fragment-tile.png, checkmark.png, x-mark.png, tap.mp3, correct.mp3, incorrect.mp3

**Interaction Flow:**
1. Student sees 6-10 statement tiles
2. Taps to select statements they believe are TRUE
3. Can tap again to deselect
4. Submits answer when ready
5. Sees which were correct/incorrect with explanations
6. Misconceptions are flagged for teacher/AI to address

**LLM Prompt Focus:**
- Generate clear, unambiguous statements
- Include common misconceptions as false options
- Mix obvious and subtle differences
- Provide explanations that teach, not just correct

---

### EXPLORE Stage Interactions

#### 5. Physics Sandbox Closed Sort
- **ID:** `physics-sandbox-sort`
- **Sub-Stage:** Handle
- **Cognitive Load:** High
- **Duration:** 5-7 min

**Input Data:**
```json
{
  "groupingQuestion": "string - e.g., 'Organize these by word type'",
  "objects": [
    {
      "id": "obj1",
      "label": "running",
      "correctGroup": "verb",
      "sprite": "text | circle | square | custom-url",
      "mass": 1.0,
      "color": "#3498db"
    }
  ],
  "groups": [
    {
      "id": "verb",
      "label": "Verbs",
      "x": 100,
      "y": 200,
      "width": 150,
      "height": 100,
      "color": "#2ecc71"
    }
  ],
  "physicsEnabled": true,
  "forces": ["gravity", "drag", "snap-to-zone"],
  "allowUndo": true
}
```

**LLM Can Generate:** ✅ Objects, groups, question, ⚠️ Sprites (use generic or generate)  
**Confidence Threshold:** 0.75  
**Score:** (Correct placements / Total objects) × 100  
**Mobile:** Reduce object count if >10 objects, simplify physics  
**Assets:** Generic shapes (circle, square, triangle), group-zone-bg.png  
**Physics:** Matter.js integration for collision/gravity

---

#### 6. Card Clue Peeler
- **ID:** `card-clue-peeler`
- **Sub-Stage:** Uncover
- **Cognitive Load:** Medium
- **Duration:** 3-4 min

**Input Data:**
```json
{
  "criterionQuestion": "string - e.g., 'Which of these are verbs?'",
  "cards": [
    {
      "id": "card1",
      "label": "running",
      "isMatch": true,
      "clue": "This word describes an action",
      "explanation": "Running is a verb because it's an action word"
    }
  ],
  "peelAnimation": "curl | flip | fade",
  "scoreMode": "penalize-peeks | reward-confidence"
}
```

**LLM Can Generate:** ✅ Criterion, cards, clues, explanations  
**Confidence Threshold:** 0.8  
**Score:** Base 50 + (10 × correct without peeking) - (5 × incorrect guesses)  
**Mobile:** Tap to select, long-press to peek clue  
**Assets:** card-front.png, card-back.png, peel-curl-animation frames

---

#### 7. Scratch-Off Explorer
- **ID:** `scratch-off-explorer`
- **Sub-Stage:** Uncover (Image variant)
- **Cognitive Load:** Medium
- **Duration:** 3-5 min

**Input Data:**
```json
{
  "images": [
    {
      "url": "string",
      "question": "string",
      "correctAnswer": "string",
      "hint": "string (appears if 50% scratched without answer)"
    }
  ],
  "scratchTexture": "silver | gold | custom-url",
  "minScratchPercent": 10,
  "maxScratchPercent": 80
}
```

**LLM Can Generate:** ✅ Questions/answers, ⚠️ Images (extract or generate), ✅ Hints  
**Confidence Threshold:** 0.7  
**Score:** 100 - (Scratch% × 1.25) = Higher score for less scratching  
**Mobile:** Touch brush for scratch effect  
**Assets:** scratch-texture.png, brush-cursor.png  
**DB Access:** Average scratch% for comparison leaderboard

---

#### 8. Prediction Branching Tree
- **ID:** `prediction-branching`
- **Sub-Stage:** Noodle
- **Cognitive Load:** High
- **Duration:** 5-8 min

**Input Data:**
```json
{
  "rootNode": {
    "id": "root",
    "content": "string - Starting scenario",
    "position": {"x": 400, "y": 50}
  },
  "nodes": [
    {
      "id": "node1",
      "content": "string - Outcome or next step",
      "correctParents": ["root"],
      "position": {"x": 200, "y": 150},
      "outcome": "bloom | wilt",
      "feedback": "string - Why this path works/fails"
    }
  ],
  "connections": [
    {"from": "root", "to": "node1", "animated": true}
  ]
}
```

**LLM Can Generate:** ✅ Tree structure, outcomes, hints, feedback  
**Confidence Threshold:** 0.75  
**Score:** (Correct placements / Total nodes) × 100  
**Mobile:** Tap to connect instead of drag-lines  
**Assets:** bloom-animation.json, wilt-animation.json, tree-connector.png

---

#### 9. Anomaly Hunter (Image Hotspots)
- **ID:** `anomaly-hunter`
- **Sub-Stage:** Track
- **Cognitive Load:** Medium
- **Duration:** 2-4 min

**Input Data:**
```json
{
  "baseImage": "string - URL to main image",
  "questions": [
    {
      "id": "q1",
      "text": "Find the cell nucleus",
      "hotspots": [
        {"x": 120, "y": 80, "radius": 20}
      ],
      "explanation": "string - Zoom-in explanation on correct tap",
      "maxAttempts": 3
    }
  ],
  "timerSeconds": 60,
  "penaltyPerWrongTap": 5
}
```

**LLM Can Generate:** ✅ Questions, ❌ Hotspot coordinates (needs manual or vision AI), ⚠️ Image (extract or manual)  
**Confidence Threshold:** 0.5 (requires human verification of coordinates)  
**Score:** 100 - (Wrong taps × 5) - (Time penalty)  
**Mobile:** Tap detection with visual feedback circle  
**Assets:** zoom-lens.png, correct-ping.mp3, wrong-buzz.mp3  
**Implementation Note:** May need **vision AI** (future) to auto-detect hotspots

---

### ABSORB Stage Interactions

#### 10. Paraphrase Builder
- **ID:** `paraphrase-builder`
- **Sub-Stage:** Interpret
- **Cognitive Load:** High
- **Duration:** 4-6 min

**Input Data:**
```json
{
  "originalText": "string - Core concept to paraphrase",
  "scrambledChunks": ["array", "of", "sentence", "parts"],
  "synonymBank": ["optional", "alternative", "words"],
  "minSimilarityScore": 0.7,
  "aiScoringPrompt": "Evaluate semantic similarity between original and student's rebuild. Score 0-1."
}
```

**LLM Can Generate:** ✅ Original text, chunks, synonyms, scoring  
**Confidence Threshold:** 0.85  
**Score:** (AI similarity score × 100)  
**Mobile:** Drag chunks into rebuild zone, keyboard for synonym entry  
**Assets:** chunk-bg.png, drop-zone.png  
**AI Role:** Grok API call for semantic similarity scoring

---

#### 11. Topic Spinner
- **ID:** `topic-spinner`
- **Sub-Stage:** Show
- **Cognitive Load:** Low
- **Duration:** 1-2 min

**Input Data:**
```json
{
  "topics": [
    {
      "id": "topic1",
      "label": "Photosynthesis Overview",
      "linkedSubStageId": "substage-1",
      "completed": false
    }
  ],
  "spinnerStyle": "wheel | slots | drum",
  "excludeCompleted": true
}
```

**LLM Can Generate:** ✅ Fully auto (from lesson structure)  
**Confidence Threshold:** 1.0 (always works if lesson has sub-stages)  
**Score:** N/A (navigation tool, not graded)  
**Mobile:** Swipe to spin, tap to stop  
**Assets:** spinner-wheel.png, arrow-pointer.png, spin-sound.mp3  
**Lesson Access:** Reads `lesson.stages[].subStages[]` to populate topics

---

#### 12. Fragment Builder (Sentence Pairs)
- **ID:** `fragment-builder`
- **Sub-Stage:** Show
- **Cognitive Load:** Medium
- **Duration:** 3-5 min

**Purpose:** Students drag sentence fragments (beginnings + endings) to build TRUE statements. Fragments can be combined incorrectly, making this a puzzle-solving activity that reinforces content understanding.

**Input Data:**
```json
{
  "sentencePairs": [
    {
      "id": "pair1",
      "beginning": "Plants convert light energy",
      "ending": "into chemical energy",
      "isCorrectPair": true,
      "explanation": "This describes photosynthesis accurately"
    },
    {
      "id": "pair2",
      "beginning": "Plants eat",
      "ending": "nutrients from soil",
      "isCorrectPair": false,
      "explanation": "This is a misconception - plants make their own food"
    }
  ],
  "distractorEndings": [
    "at night without light",
    "only in winter months"
  ],
  "targetCount": 3,
  "allowPartialCredit": true
}
```

**Interaction Flow:**
1. Sentence beginnings appear on left, endings on right (shuffled)
2. Student drags endings to match with beginnings
3. Can test combinations and undo
4. Submits when they've built their target number of statements
5. Feedback shows which pairs are TRUE and which are FALSE with explanations

**LLM Can Generate:** ✅ Sentence pairs, ✅ Distractor endings, ✅ Explanations  
**Confidence Threshold:** 0.8  
**Score:** (Correct pairs built / Target count) × 100  
**Mobile:** Large drag targets, tap-to-select-then-tap-to-connect as alternative  
**Assets:** fragment-tile.png, connection-line.png, snap-sound.mp3, success.mp3

---

#### 13. Concept Checker
- **ID:** `concept-checker`
- **Sub-Stage:** Show
- **Cognitive Load:** Medium
- **Duration:** 4-6 min

**Input Data:**
```json
{
  "paragraphs": [
    {
      "id": "para1",
      "text": "string - Content to read",
      "readingTime": 60
    }
  ],
  "ccqs": [
    {
      "id": "ccq1",
      "question": "What does chlorophyll do?",
      "type": "multiple-choice | short-answer",
      "options": ["string"] | null,
      "correctAnswer": "string | index",
      "aiEvaluationPrompt": "string (if short-answer)"
    }
  ]
}
```

**LLM Can Generate:** ✅ Paragraphs (from content), ✅ CCQs, ✅ AI evaluation  
**Confidence Threshold:** 0.85  
**Score:** (Correct CCQs / Total CCQs) × 100  
**Mobile:** Standard text display + form inputs  
**AI Role:** Evaluates short-answer CCQs via Grok

---

#### 14. Bridge Matcher (Analogy Connector)
- **ID:** `bridge-matcher`
- **Sub-Stage:** Parallel
- **Cognitive Load:** Medium
- **Duration:** 3-4 min

**Input Data:**
```json
{
  "leftColumn": [
    {"id": "l1", "text": "Chloroplast", "image": "url?"}
  ],
  "rightColumn": [
    {"id": "r1", "text": "Solar Panel", "image": "url?"}
  ],
  "correctPairs": [
    {"left": "l1", "right": "r1", "explanation": "Both convert light to energy"}
  ],
  "lineStyle": "straight | curved | animated"
}
```

**LLM Can Generate:** ✅ Concepts, analogies, pairs, explanations  
**Confidence Threshold:** 0.8  
**Score:** (Correct pairs / Total pairs) × 100  
**Mobile:** Tap item → tap match (instead of drag-line)  
**Assets:** Connector line textures, glow-effect.png

---

### CULTIVATE Stage Interactions

#### 15. Skill Drill Arcade (Endless Runner)
- **ID:** `skill-drill-arcade`
- **Sub-Stage:** Grip
- **Cognitive Load:** Medium
- **Duration:** 5-10 min (endless)

**Input Data:**
```json
{
  "problemSet": [
    {
      "question": "6CO₂ + 6H₂O → ?",
      "answer": "C₆H₁₂O₆",
      "difficulty": "easy | medium | hard"
    }
  ],
  "characterSprite": "student-runner.png | custom-url",
  "obstacles": ["rock", "pit", "wall"],
  "powerUps": ["jump-boost", "shield", "coin"],
  "speedIncrease": 0.05,
  "streakThreshold": 5
}
```

**LLM Can Generate:** ✅ Problem set, ⚠️ Character (use generic or generate)  
**Confidence Threshold:** 0.75  
**Score:** (Streak × 10) + (Coins collected) = 0-100 (capped)  
**Mobile:** Tap to jump, swipe for lane change  
**Assets:** Generic runner sprite, obstacle sprites, coin.png

---

#### 16. Scenario Remix Sorter
- **ID:** `scenario-remix-sorter`
- **Sub-Stage:** Repurpose
- **Cognitive Load:** High
- **Duration:** 6-8 min

**Input Data:**
```json
{
  "scenarioCards": [
    {
      "id": "card1",
      "text": "A plant in direct sunlight",
      "metadata": {"light": "high", "water": "medium"}
    }
  ],
  "suggestedGroupings": [
    {"name": "High Light Needs", "criteria": {"light": "high"}},
    {"name": "Low Light Needs", "criteria": {"light": "low"}}
  ],
  "allowCustomGroupNames": true,
  "aiDiscussionPrompt": "Discuss student's grouping logic and suggest improvements"
}
```

**LLM Can Generate:** ✅ Scenarios, suggested groupings, AI discussion  
**Confidence Threshold:** 0.75  
**Score:** (AI evaluation of grouping logic) × 100  
**Mobile:** Drag cards, tap to create new group, keyboard for group names  
**Assets:** scenario-card-bg.png, group-container.png  
**AI Role:** Evaluates custom groupings and provides feedback

---

#### 17. Blank Canvas Creator
- **ID:** `blank-canvas-creator`
- **Sub-Stage:** Originate
- **Cognitive Load:** Very High
- **Duration:** 10-15 min

**Input Data:**
```json
{
  "toolPalette": ["rectangle", "circle", "line", "text", "arrow", "image-upload"],
  "canvasSize": {"width": 800, "height": 600},
  "prompt": "string - What student should create (e.g., 'Draw a diagram of photosynthesis')",
  "aiCritiquePrompt": "Evaluate student's diagram for accuracy and creativity. Provide constructive feedback.",
  "exportFormat": "png | svg",
  "allowPublicGallery": true
}
```

**LLM Can Generate:** ✅ Prompt, ✅ AI critique, ❌ Student creation (UGC)  
**Confidence Threshold:** 0.8  
**Score:** AI critique score (0-100) based on accuracy + creativity  
**Mobile:** Simplified tool palette (5 tools max), pinch-zoom canvas  
**Assets:** Tool icons, color-picker.png  
**UGC Storage:** MinIO (tenant-isolated), public gallery with AI moderation  
**AI Role:** Critiques creation after student exports

---

#### 18. Stepping Stones
- **ID:** `stepping-stones`
- **Sub-Stage:** Originate (NOTE: "Work" was typo)
- **Cognitive Load:** Medium
- **Duration:** 5-7 min

**Input Data:**
```json
{
  "riverScene": "generic-river-bg.png | custom-url",
  "characterSprite": "student-avatar.png",
  "questions": [
    {
      "id": "q1",
      "text": "What do you know about photosynthesis?",
      "position": 1,
      "acceptableKeywords": ["light", "CO2", "glucose", "chlorophyll"],
      "minKeywordMatches": 2
    }
  ],
  "aiFeedbackPrompt": "Evaluate open-ended answer and provide hints if weak",
  "stoneAnimation": "solidify | sink"
}
```

**LLM Can Generate:** ✅ Questions, acceptable answers, AI feedback  
**Confidence Threshold:** 0.8  
**Score:** (Good answers / Total questions) × 100  
**Mobile:** Voice input (STT) option for answers  
**Assets:** river-bg.png (reusable), stone-solid.png, stone-sink-animation.json, character-sprite.png  
**AI Role:** Evaluates answer quality, provides feedback, decides stone fate

---

### HONE Stage Interactions

#### 19. Retrieval Race (Speed Flashcards)
- **ID:** `retrieval-race`
- **Sub-Stage:** Verify
- **Cognitive Load:** Medium
- **Duration:** 3-5 min

**Input Data:**
```json
{
  "flashcards": [
    {
      "term": "Chlorophyll",
      "answer": "Green pigment in plants",
      "acceptableSynonyms": ["pigment", "green molecule"]
    }
  ],
  "timerPerCard": 10,
  "streakMultiplier": 1.2,
  "leaderboardEnabled": true
}
```

**LLM Can Generate:** ✅ Flashcards, synonyms  
**Confidence Threshold:** 0.9  
**Score:** (Correct × 10) + (Streak bonus) = 0-100  
**Mobile:** Tap to flip, keyboard or voice for answer  
**Assets:** card-flip-animation.json, speedboost-particle.png  
**DB Access:** Leaderboard (tenant-isolated or global)

---

#### 20. Progress Reflection
- **ID:** `progress-reflection`
- **Sub-Stage:** Evaluate
- **Cognitive Load:** Low
- **Duration:** 3-5 min (per spin)

**Input Data:**
```json
{
  "topicScope": "current-stage | selected-stages | all-stages",
  "selectedStages": ["tease", "explore"] | null,
  "topics": [
    {
      "id": "topic1",
      "name": "Light Reactions",
      "stageId": "explore",
      "studentScore": 65,
      "mistakes": [
        {"concept": "ATP production", "count": 3},
        {"concept": "Electron transport", "count": 2}
      ],
      "learningObjectives": ["Explain ATP synthesis", "Describe electron flow"]
    }
  ],
  "emotionOptions": [
    {"label": "Confident 😊", "value": "confident", "color": "#2ecc71"},
    {"label": "Confused 😕", "value": "confused", "color": "#e74c3c"},
    {"label": "Kind of get it 🤔", "value": "kind-of", "color": "#f39c12"},
    {"label": "Boring! 😴", "value": "boring", "color": "#95a5a6"}
  ],
  "maxSpins": "number (default: number of stages in lesson)",
  "allowEarlyExit": true,
  "mirrorVisuals": {
    "showStrengthsChart": true,
    "showProgressOverTime": true,
    "showClassComparison": true
  },
  "aiMirrorPrompt": "Based on student's emotion '{emotion}' for topic '{topicName}' and their mistakes {mistakes}, provide personalized feedback, highlight their strengths/weaknesses, and give 1-2 key tips to remember."
}
```

**LLM Can Generate:** ✅ Feedback/tips, ✅ Gap analysis, ⚠️ Topics (from lesson objectives + student performance data)  
**Confidence Threshold:** 0.9 (always works with lesson objectives + performance data)  
**Score:** N/A (reflection tool, not graded)  
**Mobile:** Tap to spin wheel, tap emotion buttons (large targets)  
**Assets:** spinner-wheel.svg (reusable), emotion-icons, mirror-frame.png, chart-bg.png  
**AI Role:** Generates personalized feedback based on emotion + topic + mistake history  
**Database Access:**
- **Read:** `student_topic_scores` (score per topic), `student_mistakes` (concept errors + count)
- **Write:** Log emotion selection for analytics

**Flow:**
1. Wheel spins → lands on random topic from selected scope
2. Student selects 1 of 4 emotions for that topic
3. AI generates mirror reflection showing:
   - Strengths chart (topics above 80%)
   - Weaknesses chart (topics below 60%)
   - Progress over time graph
   - Class average comparison (optional)
   - 1-2 specific tips addressing their mistakes
4. Student can spin again (up to maxSpins) or exit
5. All reflections logged for lesson improvement analytics

---

#### 21. Exit Bridge Maze
- **ID:** `exit-bridge-maze`
- **Sub-Stage:** Target
- **Cognitive Load:** High
- **Duration:** 8-12 min

**Input Data:**
```json
{
  "mazeLayout": "grid-6x6 | custom-islands",
  "avatarStart": {"x": 3, "y": 3},
  "exitPosition": {"x": 5, "y": 0},
  "islands": [
    {
      "id": "island1",
      "topic": "Photosynthesis Basics",
      "position": {"x": 2, "y": 2},
      "questions": [
        {
          "text": "What is chlorophyll?",
          "type": "multiple-choice | free-form",
          "options": ["string"] | null,
          "correctAnswer": "string | index"
        }
      ],
      "threshold": 0.8,
      "slabAnimation": "fall | explode"
    }
  ],
  "weaknessSource": "lesson-performance",
  "shortestPathHint": true
}
```

**LLM Can Generate:** ✅ Q&A by topic, ✅ Threshold scores, ⚠️ Maze layout (generic or custom)  
**Confidence Threshold:** 0.75  
**Score:** (100 - Islands crossed) + (Speed bonus) = Shorter path = higher score  
**Mobile:** Tap to move avatar, tap slab to answer quiz  
**Assets:** maze-bg.png (reusable), island-sprites, slab-fall-animation.json, avatar-sprite.png  
**Performance Data Access:** Query student's weak topics from `lesson_performance` table

---

## Summary Table: Auto-Generation Matrix

| Interaction Type | Fully Auto? | Needs Manual/Upload | LLM Confidence | Notes |
|------------------|-------------|---------------------|----------------|-------|
| Mystery Reveal | ⚠️ Partial | Image (extract or generate) | 0.7-0.9 | Questions auto, image AI-gen |
| Explosive Poll | ⚠️ Partial | Media clip (extract or manual) | 0.7-0.9 | Questions auto, media extract |
| Memory Lane Timeline | ✅ Yes | None | 0.8 | Prompts auto, UGC from students |
| Physics Sandbox Sort | ⚠️ Partial | Sprites (generic OK) | 0.75 | Objects/groups auto, use generic sprites |
| Card Clue Peeler | ✅ Yes | None | 0.8 | Fully auto-generable |
| Scratch-Off Explorer | ⚠️ Partial | Images (extract or generate) | 0.7 | Questions auto, images AI-gen |
| Prediction Branching | ✅ Yes | None | 0.75 | Tree structure fully auto |
| Anomaly Hunter | ❌ No | Image + coordinates | 0.5 | Needs manual hotspot mapping (or vision AI future) |
| Paraphrase Builder | ✅ Yes | None | 0.85 | Fully auto-generable |
| Topic Spinner | ✅ Yes | None | 1.0 | Auto from lesson structure |
| Fragment Builder | ✅ Yes | None | 0.8 | Fully auto-generable |
| Concept Checker | ✅ Yes | None | 0.85 | Fully auto-generable |
| Bridge Matcher | ✅ Yes | None | 0.8 | Fully auto-generable |
| Skill Drill Arcade | ⚠️ Partial | Character sprite (generic OK) | 0.75 | Problems auto, use generic runner |
| Scenario Remix Sorter | ✅ Yes | None | 0.75 | Fully auto-generable |
| Blank Canvas Creator | ✅ Yes | None (UGC) | 0.8 | Prompt auto, student creates |
| Stepping Stones | ⚠️ Partial | River scene (generic OK) | 0.8 | Questions auto, use generic scene |
| Retrieval Race | ✅ Yes | None | 0.9 | Fully auto-generable |
| Progress Reflection | ✅ Yes | None | 0.9 | Auto from lesson objectives + student performance |
| Exit Bridge Maze | ⚠️ Partial | Maze sprites (generic OK) | 0.75 | Q&A auto, use generic maze |

**Summary:**
- **Fully Auto:** 10/20 (50%)
- **Partial Auto (generic assets OK):** 8/20 (40%)
- **Requires Manual Work:** 2/20 (10%) - Anomaly Hunter (hotspots), some media clips

---

## HTML-Category Interactions (Iframe-Based)

The following interactions render entirely inside an iframe using the Interaction AI SDK bridge. They are registered in the `interaction_types` table with `interaction_type_category = 'html'`.

### Image with Questions
- **ID:** `image-with-questions`
- **Category:** absorb-show
- **Cognitive Load:** Low–Medium
- **Duration:** 2–5 min

**Description:** Generates a themed banner image (personalised to student preferences) with Who Wants to be a Millionaire-style quiz questions below. Supports two question types that can be freely mixed:

- **Multiple-choice** — 4 options (1 correct, 3 wrong), WWTBAM styling with answer reveal
- **Slider** — configurable numeric scale with optional correct answer, community average display

**Input Data (config_schema / sample_data):**
```json
{
  "title": "The Solar System",
  "imageDescription": "A panoramic view of the solar system...",
  "questions": [
    {
      "question": "Which planet is the Red Planet?",
      "correct": "Mars",
      "wrong": ["Venus", "Jupiter", "Mercury"]
    },
    {
      "question": "What is the average distance from the Sun to Earth?",
      "type": "slider",
      "min": 50,
      "max": 300,
      "step": 1,
      "unit": "million km",
      "correct": 150,
      "labels": { "low": "50 million km", "high": "300 million km" }
    }
  ]
}
```

**Question Types:**

| Field | MC (default) | Slider |
|-------|-------------|--------|
| `question` | Required | Required |
| `type` | omit or `"multiple-choice"` | `"slider"` |
| `correct` | Correct answer string | Optional numeric value |
| `wrong` | Array of 3 wrong answers | N/A |
| `min` / `max` | N/A | Scale endpoints (default 0–100) |
| `step` | N/A | Increment (default 1) |
| `unit` | N/A | Display unit (default `"%"`) |
| `labels.low` / `labels.high` | N/A | Endpoint labels |

**Slider Behaviour:**
- If `correct` is provided: after submit, a feedback banner shows the correct answer vs the user's answer, colour-coded by accuracy (green ≤5%, orange ≤20%, red >20% of range)
- On completion, `saveInstanceData` persists slider answers; `getInstanceDataHistory` retrieves all past submissions to compute and display community averages in the completion modal
- If `correct` is provided, the correct answer is shown alongside the average

**Image Generation:**
- Uses `selectBestTheme` → `generateImage` with `dualViewport: true` (16:9 desktop, 3:4 mobile)
- Caches images by dictionary label and style for instant reload
- Supports prefetch pipeline for zero-wait loading

**LLM Can Generate:** ✅ Questions, ✅ Image (via AI generation), ✅ Theme selection
**Score:** MC questions: correct/total ratio. Slider questions: no score (opinion-based or accuracy feedback)
**Mobile:** Single-column answer layout on narrow screens. Slider thumb optimised for touch.
**Assets:** None required (AI-generated image, all UI in iframe)

---

## Next Steps

See companion documents:
- **`LESSON_JSON_SCHEMA.md`** - Complete lesson structure with TEACH stages
- **`SHARED_ASSET_LIBRARY.md`** - Catalog of reusable sprites/textures
- **`LLM_ANALYZER_MASTER_PROMPT.md`** - Complete prompt for content → interactions
- **`IMPLEMENTATION_ROADMAP.md`** - Build order and testing strategy

---

*Ready for implementation - all questions clarified!*

