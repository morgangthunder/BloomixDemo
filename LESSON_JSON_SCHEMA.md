# Lesson JSON Schema - Complete Specification

**Version:** 1.0  
**Date:** November 2025  
**Companion to:** INTERACTION_LIBRARY_COMPLETE.md

---

## Core Requirement: Lesson Objectives

**CRITICAL:** Every lesson MUST have structured learning objectives with topics and desired proficiencies. These objectives power:
- Progress Reflection interaction (topic wheel)
- Exit Bridge Maze (weakness-based routing)
- AI Tutor contextual help
- Student performance tracking
- Adaptive interaction selection

---

## Complete Lesson JSON Structure

```typescript
{
  // Metadata
  id: "string (UUID)",
  tenantId: "string",
  title: "string",
  description: "string",
  thumbnailUrl: "string (optional)",
  category: "string",
  difficulty: "beginner | intermediate | advanced",
  estimatedDuration: "number (minutes)",
  tags: ["string"],
  
  // Learning Objectives (REQUIRED)
  objectives: {
    global: {
      summary: "string - Overall lesson goal",
      keyTakeaways: ["string"] // 3-5 main points students should remember
    },
    byStage: [
      {
        stageId: "tease",
        stageName: "TEASE",
        topics: [
          {
            id: "topic-tease-1",
            name: "Introduction to Photosynthesis",
            learningObjectives: [
              "Recognize photosynthesis as energy conversion",
              "Identify key components (CO₂, H₂O, light)",
              "Understand why plants need this process"
            ],
            facts: [
              "Plants convert light energy to chemical energy",
              "CO₂ + H₂O + light → glucose + O₂",
              "Occurs in chloroplasts"
            ],
            proficiencies: [
              "Can explain photosynthesis in simple terms",
              "Can identify inputs and outputs"
            ]
          }
        ]
      },
      {
        stageId: "explore",
        stageName: "EXPLORE",
        topics: [
          {
            id: "topic-explore-1",
            name: "Light Reactions",
            learningObjectives: [
              "Explain how light is captured",
              "Describe electron transport chain",
              "Understand ATP synthesis"
            ],
            facts: [
              "Chlorophyll absorbs red and blue light",
              "Electrons flow through photosystems I & II",
              "ATP synthase creates energy currency"
            ],
            proficiencies: [
              "Can diagram light reaction steps",
              "Can explain ATP production process"
            ]
          },
          {
            id: "topic-explore-2",
            name: "Calvin Cycle",
            learningObjectives: [...],
            facts: [...],
            proficiencies: [...]
          }
        ]
      }
      // ... Additional stages (ABSORB, CULTIVATE, HONE)
    ]
  },
  
  // TEACH Stages
  stages: [
    {
      id: "stage-1-tease",
      type: "tease",
      name: "TEASE - Hook the Learner",
      orderIndex: 0,
      
      subStages: [
        {
          id: "substage-1-trigger",
          type: "trigger",
          name: "Trigger Curiosity",
          orderIndex: 0,
          
          interactions: [
            {
              id: "interaction-1",
              interactionTypeId: "mystery-reveal",
              processedContentId: "abc123", // Links to processed_content_outputs table
              orderIndex: 0,
              config: {
                // Overrides for this specific instance (optional)
                "overlayTexture": "fog"
              }
            }
          ],
          
          aiTeacherPrompts: {
            introduction: "string - What AI says before interaction",
            guidance: "string - Hints during interaction",
            transition: "string - Bridge to next sub-stage"
          }
        },
        {
          id: "substage-1-ignite",
          type: "ignite",
          name: "Ignite Interest",
          orderIndex: 1,
          interactions: [
            {
              id: "interaction-2",
              interactionTypeId: "explosive-poll",
              processedContentId: "def456",
              orderIndex: 0
            }
          ],
          aiTeacherPrompts: {...}
        },
        {
          id: "substage-1-evoke",
          type: "evoke",
          name: "Evoke Prior Knowledge",
          orderIndex: 2,
          interactions: [
            {
              id: "interaction-3",
              interactionTypeId: "memory-lane-timeline",
              processedContentId: "ghi789",
              orderIndex: 0
            }
          ],
          aiTeacherPrompts: {...}
        }
      ]
    },
    
    {
      id: "stage-2-explore",
      type: "explore",
      name: "EXPLORE - Discover",
      orderIndex: 1,
      subStages: [
        {
          id: "substage-2-handle",
          type: "handle",
          name: "Handle the Material",
          orderIndex: 0,
          interactions: [
            {
              id: "interaction-4",
              interactionTypeId: "physics-sandbox-sort",
              processedContentId: "jkl012",
              orderIndex: 0
            }
          ],
          aiTeacherPrompts: {...}
        }
        // ... Additional EXPLORE sub-stages
      ]
    }
    
    // ... Additional stages (ABSORB, CULTIVATE, HONE)
  ],
  
  // Metadata
  status: "draft | pending | approved | rejected",
  createdBy: "string (userId)",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  approvedBy: "string (userId, optional)",
  approvedAt: "timestamp (optional)",
  viewCount: "number",
  completionCount: "number",
  averageRating: "number",
  averageCompletionTime: "number (minutes)"
}
```

---

## Student Performance Tracking Schema

To power Progress Reflection and Exit Bridge Maze, we track:

### Database Tables Required

#### `student_topic_scores`
```sql
CREATE TABLE student_topic_scores (
  id UUID PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  lesson_id VARCHAR NOT NULL,
  topic_id VARCHAR NOT NULL, -- Links to lesson.objectives.byStage[].topics[].id
  stage_id VARCHAR NOT NULL,
  score DECIMAL(5,2), -- 0-100 score for this topic
  attempts INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL,
  
  UNIQUE(student_id, lesson_id, topic_id)
);
```

#### `student_mistakes`
```sql
CREATE TABLE student_mistakes (
  id UUID PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  lesson_id VARCHAR NOT NULL,
  topic_id VARCHAR NOT NULL,
  concept VARCHAR NOT NULL, -- Specific concept student got wrong
  mistake_count INTEGER DEFAULT 1,
  first_occurred_at TIMESTAMP DEFAULT NOW(),
  last_occurred_at TIMESTAMP DEFAULT NOW(),
  example_incorrect_answer TEXT, -- Store what they said for context
  tenant_id VARCHAR NOT NULL,
  
  UNIQUE(student_id, lesson_id, topic_id, concept)
);
```

#### `student_reflections`
```sql
CREATE TABLE student_reflections (
  id UUID PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  lesson_id VARCHAR NOT NULL,
  interaction_id VARCHAR NOT NULL,
  topic_id VARCHAR NOT NULL,
  emotion VARCHAR NOT NULL, -- confident | confused | kind-of | boring
  ai_feedback TEXT, -- What AI said in mirror reflection
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);
```

---

## Lesson Builder Interface Requirements

### Objectives Editor

When creating/editing a lesson, builders must define:

1. **Global Objectives Section:**
   - Summary (1 sentence)
   - 3-5 key takeaways

2. **Per-Stage Objectives:**
   - For each TEACH stage, define topics
   - For each topic, specify:
     - Learning objectives (what students will learn)
     - Facts (specific knowledge points)
     - Proficiencies (what students will be able to do)

3. **Scope Selection for Progress Reflection:**
   - Checkbox: "Include only current stage topics"
   - Multi-select: "Include these stages: [TEASE] [EXPLORE] [ABSORB]"
   - Checkbox: "Include all stages"

### UI Mockup (Text)
```
┌─────────────────────────────────────────┐
│ Lesson Objectives Editor                │
├─────────────────────────────────────────┤
│ Global Summary:                         │
│ [Students will understand how plants    │
│  convert light to energy...]            │
│                                         │
│ Key Takeaways:                          │
│ 1. [Photosynthesis = light → sugar]    │
│ 2. [Occurs in chloroplasts]            │
│ 3. [Produces oxygen as byproduct]      │
│                                         │
│ [+ Add Takeaway]                        │
├─────────────────────────────────────────┤
│ Stage: TEASE ▼                          │
│                                         │
│ Topic 1: Introduction to Photosynthesis│
│   Learning Objectives:                  │
│   • [Recognize energy conversion]      │
│   • [Identify key components]          │
│   [+ Add Objective]                     │
│                                         │
│   Key Facts:                            │
│   • [Plants convert light to chemical] │
│   [+ Add Fact]                          │
│                                         │
│   Proficiencies:                        │
│   • [Can explain in simple terms]      │
│   [+ Add Proficiency]                   │
│                                         │
│ [+ Add Topic to TEASE Stage]            │
├─────────────────────────────────────────┤
│ [Next Stage: EXPLORE ▼]                 │
└─────────────────────────────────────────┘
```

---

## Validation Rules

1. **Every lesson MUST have:**
   - At least 1 global key takeaway
   - At least 1 topic per stage
   - At least 1 learning objective per topic

2. **Interactions can reference objectives:**
   - Progress Reflection reads all topics from selected stages
   - Concept Checker pulls facts for CCQ generation
   - Exit Bridge uses topic scores for weakness routing

3. **Objectives are immutable after approval:**
   - Changes require re-approval
   - Student progress tied to objective IDs

---

## LLM Scaffolder (Super-Lesson-Builder) Usage

When AI generates a lesson from scratch:

**Input:** "Build a lesson about photosynthesis for 8th graders"

**LLM Generates:**
1. Global summary + key takeaways
2. For each TEACH stage:
   - Identify 1-3 topics to cover
   - Define learning objectives, facts, proficiencies per topic
3. Select appropriate interactions per sub-stage
4. Generate interaction inputs from content sources
5. Create AI teacher prompts for transitions

**Output:** Complete lesson JSON ready for human review

---

## Example: Complete Lesson JSON (Simplified)

```json
{
  "id": "lesson-photo-101",
  "title": "Photosynthesis Explained",
  "objectives": {
    "global": {
      "summary": "Understand how plants convert light to chemical energy",
      "keyTakeaways": [
        "Photosynthesis transforms light into glucose",
        "Occurs in chloroplasts using chlorophyll",
        "Produces oxygen as a byproduct"
      ]
    },
    "byStage": [
      {
        "stageId": "tease",
        "topics": [
          {
            "id": "topic-tease-1",
            "name": "Why Plants Are Green",
            "learningObjectives": ["Understand light absorption"],
            "facts": ["Chlorophyll reflects green light"],
            "proficiencies": ["Can explain why leaves are green"]
          }
        ]
      },
      {
        "stageId": "explore",
        "topics": [
          {
            "id": "topic-explore-1",
            "name": "Light Reactions",
            "learningObjectives": ["Explain electron transport"],
            "facts": ["Electrons flow through PS I & II"],
            "proficiencies": ["Can diagram light reactions"]
          }
        ]
      }
    ]
  },
  "stages": [
    {
      "id": "stage-1",
      "type": "tease",
      "subStages": [
        {
          "id": "substage-1-1",
          "type": "trigger",
          "interactions": [
            {
              "id": "int-1",
              "interactionTypeId": "mystery-reveal",
              "processedContentId": "content-001"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## API Endpoints Needed

### Lesson Objectives Management
```
POST   /api/lessons/:id/objectives         - Set/update objectives
GET    /api/lessons/:id/objectives         - Retrieve objectives
GET    /api/lessons/:id/objectives/topics  - Get all topics (for Progress Reflection)
```

### Student Performance Tracking
```
POST   /api/students/:id/topic-scores      - Record score for topic
GET    /api/students/:id/topic-scores?lessonId=X - Get all topic scores
POST   /api/students/:id/mistakes          - Log mistake
GET    /api/students/:id/mistakes?topicId=X - Get mistakes for topic
PATCH  /api/students/:id/mistakes/:concept - Increment mistake count
```

### Progress Reflection Data
```
GET    /api/students/:id/reflection-data?lessonId=X&scope=current-stage
  Response: {
    topics: [...], // With scores and mistakes
    classAverages: {...}, // For comparison
    progressOverTime: {...} // Historical scores
  }
```

---

## Lesson Builder Workflow

1. **Create Lesson Metadata** (title, description, category)
2. **Define Global Objectives** (summary + key takeaways)
3. **For Each TEACH Stage:**
   - Define topics for this stage
   - Set learning objectives, facts, proficiencies per topic
4. **Add Content Sources** (URLs, PDFs, etc.)
5. **Process Content** → LLM generates interaction outputs
6. **Build Sub-Stages:**
   - Select interactions from processed outputs
   - Arrange in sub-stage sequence
   - Add AI teacher prompts
7. **Configure Progress Reflection:**
   - Set topic scope (which stages to include in wheel)
   - Set max spins (default = # of stages)
8. **Submit for Approval**

---

## Validation & Constraints

### Required Fields
- ✅ Global summary (min 10 chars)
- ✅ At least 3 key takeaways
- ✅ At least 1 topic per stage
- ✅ At least 1 learning objective per topic
- ✅ At least 1 fact per topic
- ✅ At least 1 interaction per sub-stage

### Recommended Limits
- Topics per stage: 1-4 (avoid overwhelming)
- Learning objectives per topic: 2-5
- Facts per topic: 3-7
- Key takeaways (global): 3-5

### Auto-Generated Suggestions
If lesson builder doesn't define objectives, LLM Scaffolder can:
1. Analyze content sources
2. Extract key concepts → topics
3. Generate learning objectives per topic
4. Suggest facts and proficiencies
5. Present to builder for approval/editing

---

## Example: Objectives for "Photosynthesis Explained" Lesson

```json
{
  "objectives": {
    "global": {
      "summary": "Students will understand how plants convert sunlight into chemical energy through photosynthesis.",
      "keyTakeaways": [
        "Photosynthesis transforms light energy into glucose (sugar)",
        "The process occurs in chloroplasts using chlorophyll",
        "Oxygen is produced as a byproduct, which we breathe",
        "The formula: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂"
      ]
    },
    "byStage": [
      {
        "stageId": "tease",
        "stageName": "TEASE",
        "topics": [
          {
            "id": "topic-tease-1",
            "name": "Why Plants Are Green",
            "learningObjectives": [
              "Understand why chlorophyll makes plants green",
              "Recognize that green light is reflected, not absorbed"
            ],
            "facts": [
              "Chlorophyll absorbs red and blue light wavelengths",
              "Green light is reflected, which is why we see plants as green",
              "This absorption powers photosynthesis"
            ],
            "proficiencies": [
              "Can explain why leaves appear green to the human eye"
            ]
          }
        ]
      },
      {
        "stageId": "explore",
        "stageName": "EXPLORE",
        "topics": [
          {
            "id": "topic-explore-1",
            "name": "Light Reactions",
            "learningObjectives": [
              "Explain how light energy is captured by chlorophyll",
              "Describe the electron transport chain process",
              "Understand ATP and NADPH production"
            ],
            "facts": [
              "Light reactions occur in thylakoid membranes",
              "Photosystem II comes before Photosystem I (discovered in reverse order)",
              "Water is split (photolysis) to provide electrons",
              "ATP synthase creates ATP from ADP using proton gradient"
            ],
            "proficiencies": [
              "Can diagram the light reaction pathway",
              "Can explain how ATP is produced in photosynthesis",
              "Can identify the role of water in the process"
            ]
          },
          {
            "id": "topic-explore-2",
            "name": "Calvin Cycle (Dark Reactions)",
            "learningObjectives": [
              "Understand how CO₂ is fixed into organic molecules",
              "Recognize that this doesn't require light directly",
              "Identify the role of RuBisCO enzyme"
            ],
            "facts": [
              "Calvin Cycle occurs in the stroma of chloroplasts",
              "RuBisCO is the most abundant enzyme on Earth",
              "3 CO₂ molecules are needed to make 1 G3P (sugar precursor)",
              "The cycle regenerates RuBP to continue"
            ],
            "proficiencies": [
              "Can explain the three phases: fixation, reduction, regeneration",
              "Can describe where the carbon in glucose comes from"
            ]
          }
        ]
      },
      {
        "stageId": "absorb",
        "stageName": "ABSORB",
        "topics": [
          {
            "id": "topic-absorb-1",
            "name": "Photosynthesis Formula",
            "learningObjectives": [
              "Memorize the balanced chemical equation",
              "Understand what each component represents"
            ],
            "facts": [
              "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂",
              "Six molecules of each reactant needed",
              "Glucose (C₆H₁₂O₆) is the main product"
            ],
            "proficiencies": [
              "Can write the photosynthesis equation from memory",
              "Can explain each component's role"
            ]
          }
        ]
      },
      {
        "stageId": "cultivate",
        "stageName": "CULTIVATE",
        "topics": [
          {
            "id": "topic-cultivate-1",
            "name": "Real-World Applications",
            "learningObjectives": [
              "Apply photosynthesis knowledge to real scenarios",
              "Predict outcomes when variables change"
            ],
            "facts": [
              "Greenhouses optimize light, CO₂, and temperature",
              "Deforestation reduces global oxygen production",
              "Algae perform ~50% of Earth's photosynthesis"
            ],
            "proficiencies": [
              "Can explain why plants grow better in greenhouses",
              "Can predict what happens if light/CO₂ is limited"
            ]
          }
        ]
      },
      {
        "stageId": "hone",
        "stageName": "HONE",
        "topics": [
          {
            "id": "topic-hone-1",
            "name": "Photosynthesis Mastery",
            "learningObjectives": [
              "Synthesize all concepts into cohesive understanding",
              "Self-assess knowledge gaps"
            ],
            "facts": [
              "All previous facts (cumulative review)"
            ],
            "proficiencies": [
              "Can teach photosynthesis to someone else",
              "Can identify own strengths and areas for improvement"
            ]
          }
        ]
      }
    ]
  }
}
```

---

## How Interactions Use Objectives

### Progress Reflection
- **Reads:** All topics from selected stages (current/selected/all)
- **Uses:** Topic name, student score, mistake history
- **Writes:** Reflection log (topic + emotion + AI feedback)

### Exit Bridge Maze
- **Reads:** All topics + student scores
- **Uses:** Weak topics (score < 60%) for island placement
- **Logic:** Shortest path forces student through weak topic islands

### Concept Checker
- **Reads:** Facts from current topic
- **Generates:** CCQs based on facts
- **Validates:** Student answers against facts

### AI Tutor Chat
- **Reads:** All objectives + current topic context
- **Uses:** Learning objectives to guide explanations
- **References:** Facts to answer questions accurately

---

## LLM Scaffolder Auto-Generation

When LLM creates objectives from content:

**Prompt:**
```
FROM CONTENT SOURCES: {photosynthesis-wikipedia.txt, video-transcript.txt}

LESSON REQUEST: "Photosynthesis for 8th graders"

TASK: Generate structured learning objectives following TEACH methodology.

1. ANALYZE CONTENT:
   - Identify 5-8 key topics
   - Map topics to TEACH stages (Tease=hook, Explore=depth, Absorb=memorize, Cultivate=apply, Hone=master)

2. CREATE GLOBAL OBJECTIVES:
   - 1-sentence summary
   - 3-5 key takeaways (simple, memorable)

3. FOR EACH STAGE, DEFINE TOPICS:
   - Topic name (concise, student-friendly)
   - 2-5 learning objectives (verb-led: "Explain...", "Identify...", "Apply...")
   - 3-7 facts (specific knowledge points)
   - 1-3 proficiencies (observable skills: "Can diagram...", "Can teach...")

4. ENSURE PROGRESSION:
   - TEASE: Broad, accessible concepts
   - EXPLORE: Deeper mechanisms
   - ABSORB: Memorizable facts
   - CULTIVATE: Real-world application
   - HONE: Synthesis and self-assessment

OUTPUT FORMAT: {JSON matching lesson.objectives schema}
```

---

## Testing Strategy

### Unit Tests
- [ ] Validate lesson JSON with objectives schema
- [ ] Ensure every topic has required fields
- [ ] Test topic ID uniqueness

### Integration Tests
- [ ] Progress Reflection loads correct topics based on scope
- [ ] Student scores persist to database correctly
- [ ] Mistake tracking increments on wrong answers
- [ ] Exit Bridge routes through weak topics

### E2E Tests
- [ ] Lesson builder creates objectives → saves → appears in Progress Reflection
- [ ] Student completes quiz → scores recorded → Progress Reflection shows accurate data
- [ ] AI provides personalized feedback based on emotion + mistakes

---

*This schema is now complete and ready for database migration + UI implementation!*
