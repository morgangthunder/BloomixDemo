# LLM-First Interaction Generation Plan - November 2025

## Executive Summary

This plan outlines a **LLM-first architecture** where content sources are analyzed once by an LLM to automatically generate multiple interaction outputs. Instead of hardcoded n8n workflows per content type, the LLM intelligently determines which of 18 interaction types can be powered by each content source, generating validated outputs with confidence scores.

**Core Innovation:** One Content Source → LLM Analysis → 10-20 Auto-Generated Interactions → Lesson Builder Selection

---

## Core Idea: "One Content Source → Many Interaction Outputs"

### Example Flow

| **Input** | **LLM Processing** | **Output (Auto-Generated)** |
| --- | --- | --- |
| https://en.wikipedia.org/wiki/Photosynthesis | LLM reads + analyzes | 16-18 possible interaction assets |

**The Lesson Builder then sees:**

> "This content can power:
> 
> **INTERACTION TYPE EXAMPLES:**
> - Mystery Reveal
> - Physics Sandbox (CO₂ flow)
> - Analogy Bridge
> - Explosive Poll
> - Kinetic Typography
> - Skill Drill Arcade
> - ... and 10 more"

---

## Auto-Generated Interaction Outputs (Example)

**Source**: https://en.wikipedia.org/wiki/Photosynthesis

| Interaction Type | Auto-Generated? | Output Preview |
| --- | --- | --- |
| **Mystery Reveal** | ✅ Yes | `{ image: "chloroplast.jpg", question: "What if plants couldn't do this?" }` |
| **Explosive Poll** | ✅ Yes | `{ options: ["Plants eat soil", "Plants breathe CO₂", ...], correct: 1 }` |
| **Physics Sandbox** | ✅ Yes | `{ objects: ["sun", "CO₂", "H₂O"], forces: ["light_energy"] }` |
| **Layered Hotspot** | ✅ Yes | `{ layers: [{ clue: "Where does light enter?", coord: [120,80] }] }` |
| **Prediction Branching** | ✅ Yes | `{ branches: ["No sunlight → ?", "Too much CO₂ → ?"] }` |
| **Anomaly Hunter** | ❌ No | *(needs image pair — skipped)* |
| **Kinetic Typography** | ✅ Yes | `{ chunks: ["Photo", "Synthesis", "Light → Sugar"] }` |
| **Analogy Bridge** | ✅ Yes | `{ left: "Chloroplast", right: "Solar Panel" }` |
| **Skill Drill Arcade** | ✅ Yes | `{ questions: [{ q: "6CO₂ + 6H₂O → ?", a: "C₆H₁₂O₆" }] }` |
| **Goal Forge** | ✅ Yes | `{ goal: "Explain photosynthesis to a 5th grader" }` |

**Total: 16/18 auto-generated**  
**Time: ~3.2 sec (Grok + caching)**

---

## Smart Guardrails (Prevent Garbage)

| Rule | Implementation |
| --- | --- |
| **1. Confidence Threshold** | LLM returns confidence: 0.0–1.0 per output → only save if ≥0.7 |
| **2. Schema Validation** | Zod / JSON Schema per interaction type → reject malformed |
| **3. Duplicate Detection** | Hash output → skip if identical to existing |
| **4. Teacher Override** | All auto-generated outputs go to **"Draft"** state → require approval |
| **5. Cost Control** | Cap at **N outputs per source** (e.g. max 20) |

---

## Phased Implementation Plan

---

### **Phase 1: Define Interaction Type Library + Schemas (Week 1)**

**Why First:** The LLM needs to know **what it can generate**. This is your "menu" of possibilities.

#### **Day 1-3: Define 18 Interaction Types + Input Schemas**

Create a JSON schema library for each interaction type:

```typescript
// Example: Mystery Reveal
{
  id: "mystery-reveal",
  name: "Mystery Reveal",
  description: "Present a puzzle/question with dramatic reveal",
  requiredInputs: {
    question: "string",          // e.g., "What if plants couldn't do this?"
    image: "url (optional)",      // Visual hook
    reveal: "string",             // The answer/insight
    hook: "string"                // Attention-grabbing lead-in
  },
  llmGenerationPrompt: `
    From the content, identify a surprising "what if" scenario.
    Format: { question: "...", reveal: "...", hook: "..." }
    Return confidence: 0.0-1.0 based on content fit.
  `,
  pixiRenderer: "mystery-reveal-component",
  minConfidence: 0.7
}
```

**Tasks:**
- [ ] Define all 18 interaction types (from your table)
- [ ] Create JSON schemas for each type's input data
- [ ] Write LLM generation prompts for each type (embedded in schema)
- [ ] Define confidence thresholds per type
- [ ] Document which types require specific content (e.g., Anomaly Hunter needs image pairs)

**Output:** `interaction-types.json` - A canonical library the LLM will reference.

---

#### **Day 4-5: Build Interaction Type Registry Service**

```typescript
// Backend service
export class InteractionTypeRegistry {
  getAllTypes(): InteractionType[]  // Returns all 18 types
  getTypeById(id: string): InteractionType
  validateOutput(typeId: string, output: any): boolean  // Zod validation
  canGenerateFromContent(typeId: string, contentType: string): boolean
}
```

**Tasks:**
- [ ] Create `interaction-types` table (id, schema, prompt, confidence threshold)
- [ ] Seed database with 18 types
- [ ] Implement validation service (Zod schemas)
- [ ] API endpoints: `GET /interaction-types`, `GET /interaction-types/:id`

---

#### **Day 6-7: Define Lesson JSON Schema with TEACH Stages**

Now that you know what interactions exist, define how they fit into lessons:

```json
{
  "lesson": {
    "title": "Photosynthesis Explained",
    "stages": [
      {
        "type": "tease",
        "interactions": [
          {
            "interactionTypeId": "mystery-reveal",
            "processedContentId": "abc123",  // Links to auto-generated output
            "orderIndex": 0
          }
        ]
      },
      {
        "type": "explain",
        "interactions": [
          {
            "interactionTypeId": "kinetic-typography",
            "processedContentId": "def456",
            "orderIndex": 0
          }
        ]
      }
      // ... Apply, Challenge, Hone stages
    ]
  }
}
```

**Tasks:**
- [ ] Finalize lesson JSON schema with TEACH stages
- [ ] Define how interactions are linked to stages
- [ ] Create JSON Schema validators
- [ ] Document with examples

**Output:** Locked lesson structure + interaction types library.

---

### **Phase 2: LLM Content Analyzer + Multi-Output Generator (Week 2)**

**The Core Innovation:** When a content source is added, the LLM analyzes it **once** and generates outputs for **all applicable** interaction types.

#### **Day 1-3: Build Content Analysis Service**

```typescript
export class ContentAnalyzerService {
  async analyzeContentSource(contentSourceId: string): Promise<AnalysisResult> {
    // 1. Fetch content (URL, PDF text, etc.)
    // 2. Build LLM prompt with ALL 18 interaction type schemas
    // 3. Ask LLM: "Which interactions can this content power? Generate outputs."
    // 4. Return: Array of { interactionTypeId, output, confidence }
  }
}
```

**LLM Prompt Structure:**
```
You are analyzing content to generate educational interaction assets.

CONTENT:
{contentSourceText}

AVAILABLE INTERACTION TYPES:
{interactionTypes.json}  // All 18 types with their schemas and generation prompts

TASK:
For each interaction type, determine if you can generate high-quality input data.
Return JSON array:
[
  {
    "interactionTypeId": "mystery-reveal",
    "confidence": 0.85,
    "output": { "question": "...", "reveal": "...", "hook": "..." }
  },
  {
    "interactionTypeId": "explosive-poll",
    "confidence": 0.92,
    "output": { "options": [...], "correct": 1 }
  }
  // ... (only include if confidence >= 0.7)
]

RULES:
- Only generate if confidence >= 0.7
- Skip types that require unavailable resources (e.g., image pairs)
- Validate output matches schema exactly
```

**Tasks:**
- [ ] Implement `ContentAnalyzerService`
- [ ] Build multi-output LLM prompt with all 18 types
- [ ] Parse and validate LLM responses (Zod)
- [ ] Store results in `processed_content_outputs` table

---

#### **Day 4-5: Auto-Generation Pipeline**

```typescript
// Trigger: When content source is added/approved
async function onContentSourceApproved(contentSourceId: string) {
  // 1. Analyze content
  const results = await contentAnalyzer.analyzeContentSource(contentSourceId);
  
  // 2. Filter by confidence threshold
  const viable = results.filter(r => r.confidence >= 0.7);
  
  // 3. Save as "draft" processed outputs
  for (const result of viable) {
    await processedContentService.create({
      contentSourceId,
      interactionTypeId: result.interactionTypeId,
      output: result.output,
      confidence: result.confidence,
      status: 'draft',  // Requires approval
      generatedBy: 'llm-auto'
    });
  }
  
  // 4. Notify lesson builder: "16 interactions ready for review"
}
```

**Tasks:**
- [ ] Implement auto-generation on content approval
- [ ] Store outputs with `status: 'draft'`
- [ ] Add confidence scores to DB
- [ ] Implement deduplication (hash outputs)

---

#### **Day 6-7: Approval UI for Auto-Generated Outputs**

Lesson builders see:

```
📊 Content Source: "Photosynthesis Wikipedia"
✅ 16 interaction assets generated (3.2s)

┌─────────────────────────────────────────┐
│ Mystery Reveal              [Confidence: 85%] │
│ "What if plants couldn't do this?"          │
│ [Preview] [Approve] [Edit] [Reject]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Explosive Poll              [Confidence: 92%] │
│ "What do plants breathe in?"                │
│ [Preview] [Approve] [Edit] [Reject]         │
└─────────────────────────────────────────┘
```

**Tasks:**
- [ ] Add "Generated Interactions" tab to Content Library
- [ ] Show all draft outputs per content source
- [ ] Preview modal with Pixi.js rendering
- [ ] Approve/Reject/Edit actions
- [ ] Bulk approve (approve all high-confidence)

**Output:** Lesson builders can now add content → auto-generate 10-20 interactions → approve → use in lessons.

---

### **Phase 3: Lesson Builder Integration (Week 3)**

#### **Day 1-3: "Add Interaction" Flow in Lesson Builder**

When building a lesson stage, instead of manually creating interactions:

```
TEACH Stage: "TEASE"

[Add Interaction]
  ↓
Shows available processed outputs:
  - Mystery Reveal (from Photosynthesis Wikipedia) [Confidence: 85%]
  - Explosive Poll (from Photosynthesis Wikipedia) [Confidence: 92%]
  - Mystery Reveal (from Solar Energy Article) [Confidence: 78%]

[Select] → Adds to lesson stage
```

**Tasks:**
- [ ] API: `GET /processed-outputs?contentSourceId=X&status=approved`
- [ ] Filter by TEACH stage suitability (e.g., Mystery Reveal → Tease)
- [ ] Drag-and-drop to add to lesson
- [ ] Preview interaction before adding

---

#### **Day 4-5: Manual Interaction Creation (Fallback)**

If no auto-generated output fits, allow manual creation:

```
[Create Custom Interaction]
  ↓
1. Choose interaction type (18 options)
2. Fill in required fields manually
3. Save as processed output (status: approved)
```

**Tasks:**
- [ ] Form builder for each interaction type (use JSON schema → form)
- [ ] Validation before save
- [ ] Store with `generatedBy: 'manual'`

---

#### **Day 6-7: TEACH Stage Intelligence**

LLM suggests which interactions fit each stage:

```
// Lesson Builder AI Assistant
"I see you're building the TEASE stage for Photosynthesis.
Recommended interactions from your content:
  1. Mystery Reveal (85% confidence) - Great hook!
  2. Explosive Poll (92% confidence) - Engages curiosity
  
Would you like to add these?"
```

**Tasks:**
- [ ] Map interaction types to TEACH stages (e.g., Mystery Reveal → Tease)
- [ ] LLM prompt: "Suggest interactions for stage X given available outputs"
- [ ] Chat interface in Lesson Builder

**Output:** Lesson builders can construct TEACH-structured lessons by selecting/previewing auto-generated interactions.

---

### **Phase 4: Super-Admin Prompt Management (Week 4)**

Now that the core pipeline works, add control/visibility:

#### **Day 1-3: Prompt Management UI**

```
Super-Admin Interface:

1. Interaction Type Prompts
   - Edit generation prompt for each of 18 types
   - Test prompt with sample content → see output
   - Version control (rollback if new prompt performs worse)

2. Content Analyzer Prompt
   - Master prompt that orchestrates all 18 types
   - Tune confidence thresholds globally
   - A/B test prompts (split traffic)

3. Lesson Builder Assistant Prompts
   - TEACH stage recommendation prompt
   - Natural language lesson editing
```

**Tasks:**
- [ ] CRUD for prompts (stored in DB with versioning)
- [ ] Template variables: `{{CONTENT}}`, `{{INTERACTION_TYPES}}`, `{{LESSON_SCHEMA}}`
- [ ] Test interface: paste content → run prompt → see results
- [ ] Diff view for prompt changes

---

#### **Day 4-5: Analytics Dashboard**

Track LLM performance:

```
Metrics:
- Average confidence per interaction type
- Approval rate (draft → approved)
- Most/least used interaction types
- Token usage per content source
- Processing time
```

**Tasks:**
- [ ] Log all LLM generations (prompt, response, confidence, approved?)
- [ ] Analytics queries
- [ ] Dashboard with charts

---

#### **Day 6-7: Cost Controls & Guardrails**

```
Settings:
- Max outputs per content source: 20
- Min confidence threshold: 0.7 (global)
- Per-type confidence overrides
- Auto-approve if confidence >= 0.95
- Token budget per tenant
```

**Tasks:**
- [ ] Enforce caps in `ContentAnalyzerService`
- [ ] Token tracking per tenant
- [ ] Warnings when approaching limits
- [ ] Disable auto-generation if over budget

**Output:** Full control over LLM behavior with visibility into performance.

---

### **Phase 5: Advanced LLM Use Cases (Week 5+)**

Now that the foundation is solid, layer in the other use cases:

#### **5a. Super-Lesson-Builder (Week 5)**

```
Prompt: "Build a lesson about photosynthesis for 8th graders"
  ↓
1. Search web for 3-5 content sources (Serper API)
2. Add as content sources
3. Auto-generate interactions (existing pipeline)
4. LLM builds lesson JSON following TEACH methodology
5. Present to builder for approval/editing
```

**Tasks:**
- [ ] Web search integration
- [ ] Automatic content source creation from URLs
- [ ] LLM prompt: "Build TEACH lesson from these interactions"
- [ ] Generate complete lesson JSON
- [ ] Preview + approval UI

---

#### **5b. AI Tutor (Week 6)**

```
Student: "I don't understand why plants need CO₂"
  ↓
LLM:
- Accesses lesson JSON + Weaviate-indexed content
- Generates personalized explanation
- Suggests related interaction to try
```

**Tasks:**
- [ ] Chat interface in lesson viewer
- [ ] LLM prompt with lesson context + Weaviate query
- [ ] Log student questions (feedback for Case #5)

---

#### **5c. Interaction Builder Assistant (Week 7)**

```
Builder: "Create a drag-and-drop game for photosynthesis stages"
  ↓
LLM:
- Searches existing interaction types
- Generates Pixi.js code (or configures existing template)
- Returns interaction type schema
```

**Tasks:**
- [ ] Code generation prompt with Pixi.js examples
- [ ] Sandbox for testing
- [ ] Save as new interaction type

---

#### **5d. Lesson Improvement Engine (Week 8+)**

```
Feedback Analysis:
- 73% of students struggled with "Explain" stage
- "Kinetic Typography" had low engagement
  ↓
LLM:
- Suggests replacing with "Physics Sandbox" (higher engagement)
- Proposes adding "Analogy Bridge" before "Explain"
- Generates diff for lesson JSON
  ↓
Super-Admin reviews + applies changes
```

**Tasks:**
- [ ] Feedback log aggregation
- [ ] LLM prompt: "Analyze feedback + propose improvements"
- [ ] Diff view for lesson changes
- [ ] One-click apply

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONTENT SOURCE ADDED                                     │
│    (URL, PDF, text, image)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LLM CONTENT ANALYZER (One-Shot Multi-Output)             │
│    - Reads content                                          │
│    - References 18 interaction type schemas                 │
│    - Generates 10-20 outputs (confidence scored)            │
│    - Validates against schemas                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESSED OUTPUTS (Draft Status)                         │
│    - Mystery Reveal (85% confidence)                        │
│    - Explosive Poll (92% confidence)                        │
│    - Physics Sandbox (78% confidence)                       │
│    - ... (16 total)                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. LESSON BUILDER APPROVAL                                  │
│    - Preview each interaction                               │
│    - Approve/Edit/Reject                                    │
│    - Approved outputs available for lessons                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. LESSON CONSTRUCTION                                      │
│    - Select approved outputs                                │
│    - Arrange into TEACH stages                              │
│    - LLM assists with stage selection                       │
│    - Generate lesson JSON                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Advantages Over Traditional Approach

| Aspect | Traditional (n8n workflows) | **LLM-First Approach** |
|--------|---------------------------|----------------------|
| **Content Processing** | One workflow per content type | **LLM analyzes once → generates all interactions** |
| **Flexibility** | Hardcoded workflows for each type | **Extensible: add interaction types → LLM adapts immediately** |
| **Lesson Building** | Manual selection and creation | **AI suggests + auto-generates 10-20 options** |
| **Scalability** | Maintenance overhead grows with types | **One prompt per interaction type (easier to tune)** |
| **Intelligence** | Rule-based transformations | **LLM judges content fit per interaction with confidence scores** |
| **Developer Experience** | Workflow debugging, versioning complexity | **Prompt engineering, version control** |
| **Quality Control** | Pass/fail validation | **Confidence scores + human approval** |

---

## Database Schema Updates

### New/Updated Tables

#### `interaction_types`
```sql
CREATE TABLE interaction_types (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,           -- Zod/JSON Schema
  generation_prompt TEXT NOT NULL, -- LLM prompt for this type
  pixi_renderer VARCHAR,           -- Component to render
  min_confidence DECIMAL(3,2) DEFAULT 0.7,
  teach_stage_fit VARCHAR[],       -- e.g., ['tease', 'explain']
  requires_resources VARCHAR[],    -- e.g., ['image_pair', 'video']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `processed_content_outputs` (updated)
```sql
ALTER TABLE processed_content_outputs ADD COLUMN confidence DECIMAL(3,2);
ALTER TABLE processed_content_outputs ADD COLUMN generated_by VARCHAR DEFAULT 'manual'; -- 'llm-auto' or 'manual'
ALTER TABLE processed_content_outputs ADD COLUMN interaction_type_id VARCHAR REFERENCES interaction_types(id);
```

#### `llm_generation_logs`
```sql
CREATE TABLE llm_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_source_id VARCHAR REFERENCES content_sources(id),
  prompt TEXT NOT NULL,
  response JSONB,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  outputs_generated INTEGER,
  outputs_approved INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);
```

#### `system_prompts`
```sql
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key VARCHAR UNIQUE NOT NULL,  -- e.g., 'content-analyzer-master'
  prompt_text TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

---

## Testing Strategy

### Phase 1 Tests
- [ ] Interaction type schema validation (all 18 types)
- [ ] Lesson JSON schema validation with TEACH stages
- [ ] Registry service returns all types correctly

### Phase 2 Tests
- [ ] LLM content analyzer with sample Wikipedia page
- [ ] Expected: 15+ interaction outputs in < 5 seconds
- [ ] All outputs pass Zod validation
- [ ] Confidence scores are reasonable (0.7-0.95 range)
- [ ] Duplicate detection works (same output not saved twice)

### Phase 3 Tests
- [ ] Lesson builder can add interactions from library
- [ ] Preview shows correct Pixi.js rendering
- [ ] Manual interaction creation works for all 18 types
- [ ] TEACH stage filtering (Mystery Reveal appears for Tease stage)

### Phase 4 Tests
- [ ] Prompt versioning and rollback
- [ ] Analytics dashboard shows correct metrics
- [ ] Cost controls enforce token limits
- [ ] Auto-approve works for confidence >= 0.95

### Phase 5 Tests
- [ ] Super-lesson-builder generates complete TEACH lesson
- [ ] AI tutor answers questions with lesson context
- [ ] Interaction builder generates valid Pixi.js code
- [ ] Lesson improvement engine proposes valid diffs

---

## Success Metrics

### Week 1 (Phase 1)
- ✅ 18 interaction types defined with schemas
- ✅ Registry service operational
- ✅ Lesson JSON schema finalized

### Week 2 (Phase 2)
- ✅ LLM generates 15+ interactions per content source
- ✅ < 5 second processing time
- ✅ 90%+ outputs pass validation
- ✅ Confidence scores correlate with human approval rates

### Week 3 (Phase 3)
- ✅ Lesson builders can construct TEACH lessons in < 10 minutes
- ✅ Preview works for all interaction types
- ✅ 80%+ of builders use auto-generated interactions (vs manual)

### Week 4 (Phase 4)
- ✅ Super-admin can A/B test prompts
- ✅ Analytics dashboard shows LLM performance trends
- ✅ Token costs stay within budget

### Weeks 5+ (Phase 5)
- ✅ Super-lesson-builder generates usable lessons 70%+ of time
- ✅ AI tutor engagement: 60%+ of students use chat
- ✅ Lesson improvement engine proposals accepted 40%+ of time

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **LLM generates low-quality outputs** | Confidence thresholds + human approval + prompt tuning |
| **Token costs explode** | Per-tenant budgets, caps on outputs, caching |
| **LLM hallucinates invalid JSON** | Strict Zod validation, reject malformed outputs |
| **Content doesn't fit any interaction type** | Manual creation fallback, expandable type library |
| **Prompt changes break generation** | Version control, A/B testing, rollback capability |
| **Processing too slow** | Parallel generation, caching, optimize prompts |

---

## Future Enhancements (Beyond Week 8)

- **Multi-modal inputs**: Images, videos, audio → generate interactions
- **Student performance optimization**: ML model predicts best interaction types per student
- **Cross-lesson intelligence**: Reuse interactions across similar lessons
- **Community library**: Share approved interactions across tenants (opt-in)
- **Real-time collaboration**: Multiple builders work on same lesson with LLM mediation
- **Voice interface**: Speak lesson requests → LLM generates

---

## Next Immediate Action Items

1. **Define the 18 interaction types** with detailed schemas (see `interaction-types.json` template)
2. **Set up xAI Grok API integration** (if not already done)
3. **Create database migrations** for new tables
4. **Implement Interaction Type Registry Service** (backend)
5. **Test LLM with sample content** (photosynthesis Wikipedia article)

---

*Last Updated: November 2025*
*Document Owner: Morgan*
*Status: Planning → Implementation*

