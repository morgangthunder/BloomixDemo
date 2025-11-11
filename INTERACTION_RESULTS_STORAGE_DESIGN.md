# Universal Interaction Results Storage System

## Problem Statement
Need a flexible system to:
1. Store individual student results for every interaction
2. Calculate and display class/public averages
3. Compare student performance to peers
4. Limit storage (use rolling averages after threshold)
5. Support ANY interaction type with custom metrics

---

## Database Schema

### Table: `interaction_results`
```sql
CREATE TABLE interaction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Context
  student_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  stage_id VARCHAR(100) NOT NULL,
  substage_id VARCHAR(100) NOT NULL,
  interaction_type_id VARCHAR(100) NOT NULL, -- e.g., 'true-false-selection'
  processed_content_id UUID REFERENCES processed_content_outputs(id),
  
  -- Core Metrics (Universal)
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100), -- 0-100%
  time_taken_seconds INTEGER, -- How long to complete
  attempts INTEGER DEFAULT 1, -- Number of tries
  completed_at TIMESTAMP DEFAULT NOW(),
  
  -- Interaction-Specific Data (Flexible JSON)
  result_data JSONB NOT NULL, -- Custom metrics per interaction type
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_interaction_results_student ON interaction_results(student_id, lesson_id);
CREATE INDEX idx_interaction_results_aggregate ON interaction_results(interaction_type_id, processed_content_id, tenant_id);
CREATE INDEX idx_interaction_results_completed ON interaction_results(completed_at);
```

### Table: `interaction_averages` (Rolling Averages)
```sql
CREATE TABLE interaction_averages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What this average is for
  interaction_type_id VARCHAR(100) NOT NULL,
  processed_content_id UUID REFERENCES processed_content_outputs(id),
  tenant_id UUID NOT NULL, -- NULL for public/cross-tenant averages
  
  -- Aggregated Metrics
  total_attempts INTEGER NOT NULL DEFAULT 0,
  avg_score DECIMAL(5, 2) NOT NULL, -- 0.00 - 100.00
  avg_time_seconds INTEGER,
  
  -- Rolling Average Data
  sample_size INTEGER NOT NULL, -- How many results contributed to this average
  last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Custom Metrics (Interaction-Specific)
  aggregate_data JSONB, -- e.g., { "mostMissedFragments": [...], "avgCorrectSelections": 2.5 }
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one average per interaction instance per tenant
  UNIQUE(interaction_type_id, processed_content_id, tenant_id)
);
```

---

## Interaction-Specific Result Data

### Configuration (Per Interaction Type)

When creating an interaction type, define:
```typescript
interface InteractionResultConfig {
  interactionTypeId: string;
  
  // What to store for each student attempt
  captureFields: {
    field: string;           // e.g., 'selectedFragments'
    type: 'array' | 'number' | 'string' | 'object';
    aggregatable: boolean;   // Can we average/sum this?
    displayName: string;     // For UI
  }[];
  
  // How to aggregate for class average
  aggregationRules: {
    field: string;
    method: 'average' | 'sum' | 'mode' | 'custom';
    customFunction?: string; // SQL function or backend logic
  }[];
  
  // Storage limits
  maxIndividualResults: number; // e.g., 1000 per interaction
  rolloverThreshold: number;    // e.g., after 500, start rolling average
}
```

### Example: True/False Selection

```json
{
  "interactionTypeId": "true-false-selection",
  "captureFields": [
    {
      "field": "selectedFragments",
      "type": "array",
      "aggregatable": false,
      "displayName": "Selected Statements"
    },
    {
      "field": "correctCount",
      "type": "number",
      "aggregatable": true,
      "displayName": "Correct Selections"
    },
    {
      "field": "incorrectCount",
      "type": "number",
      "aggregatable": true,
      "displayName": "Incorrect Selections"
    },
    {
      "field": "missedCount",
      "type": "number",
      "aggregatable": true,
      "displayName": "Missed TRUE Statements"
    }
  ],
  "aggregationRules": [
    {
      "field": "correctCount",
      "method": "average"
    },
    {
      "field": "mostMissedFragments",
      "method": "custom",
      "customFunction": "getMostFrequentlyMissedFragments"
    }
  ],
  "maxIndividualResults": 1000,
  "rolloverThreshold": 500
}
```

### Stored Result Data Example:
```json
{
  "score": 67,
  "timeTakenSeconds": 45,
  "resultData": {
    "selectedFragments": ["Plants use sunlight", "Photosynthesis produces CO2", "Water is needed"],
    "correctCount": 2,
    "incorrectCount": 1,
    "missedCount": 1,
    "fragmentResults": [
      { "index": 0, "selected": true, "isTrue": true, "result": "correct" },
      { "index": 1, "selected": true, "isTrue": false, "result": "incorrect" },
      { "index": 2, "selected": false, "isTrue": true, "result": "missed" }
    ]
  }
}
```

---

## Storage & Rolling Average Logic

### Phase 1: Individual Storage (0 - 500 results)
- Store every individual result
- Calculate average on-the-fly from all results
- Display: "Your score: 67% | Class average: 72% (based on 234 students)"

### Phase 2: Rolling Average (500+ results)
- Keep last 500 individual results
- Delete oldest result when adding new one
- Update `interaction_averages` table:
```sql
-- Recalculate average
UPDATE interaction_averages
SET 
  avg_score = (
    SELECT AVG(score) 
    FROM interaction_results 
    WHERE processed_content_id = $1
  ),
  sample_size = sample_size + 1,
  last_updated = NOW()
WHERE processed_content_id = $1;
```

### Phase 3: Large Scale (5000+ results)
- Stop storing individual results
- Update average using incremental formula:
```typescript
newAverage = ((oldAverage * oldCount) + newScore) / (oldCount + 1)
```

---

## Frontend Display

### Result Popup (After Interaction)
```
┌──────────────────────────────────────┐
│  🎉 Interaction Complete!            │
│                                      │
│  Your Score:     67%                 │
│  Class Average:  72%                 │
│  Better than:    45% of students     │
│                                      │
│  ✅ Correct: 2/3                     │
│  ❌ Incorrect: 1 (selected false)    │
│  ⭕ Missed: 1 (didn't select true)   │
│                                      │
│  Most Missed by Class:               │
│  • "Water is needed..." (58% missed) │
│                                      │
│  [Play Again]  [Next Sub-stage]      │
└──────────────────────────────────────┘
```

---

## Backend API Endpoints

### POST `/api/interaction-results`
**Body:**
```json
{
  "lessonId": "uuid",
  "stageId": "stage-1",
  "substageId": "substage-1-1",
  "interactionTypeId": "true-false-selection",
  "processedContentId": "uuid",
  "score": 67,
  "timeTakenSeconds": 45,
  "attempts": 1,
  "resultData": { /* custom metrics */ }
}
```

**Response:**
```json
{
  "saved": true,
  "yourScore": 67,
  "classAverage": 72,
  "percentile": 45,
  "insights": {
    "mostMissed": ["Fragment text..."],
    "avgTimeTaken": 52
  }
}
```

### GET `/api/interaction-results/averages/:processedContentId`
**Response:**
```json
{
  "avgScore": 72.5,
  "totalAttempts": 234,
  "avgTime": 52,
  "customMetrics": {
    "mostMissedFragments": [
      { "text": "Water is needed...", "missRate": 0.58 }
    ],
    "avgCorrectSelections": 2.3
  }
}
```

---

## Implementation Phases

### Phase 1: Basic Storage (MVP) ✅
- [x] Create `interaction_results` table
- [ ] Create `interaction_averages` table
- [ ] POST endpoint to save results
- [ ] GET endpoint to fetch averages
- [ ] Frontend: Save result after interaction
- [ ] Frontend: Display class average in score popup

### Phase 2: Custom Metrics
- [ ] Add result_config to interaction_types table
- [ ] Parse and validate result_data per interaction
- [ ] Calculate custom aggregations (most missed, etc.)

### Phase 3: Rolling Averages
- [ ] Implement storage limit logic
- [ ] Incremental average calculation
- [ ] Background job to clean old results

### Phase 4: Analytics
- [ ] Percentile calculation
- [ ] Difficulty scoring (if avg < 60%, mark as hard)
- [ ] Student progress tracking
- [ ] Lesson builder insights dashboard

---

## Example: True/False Selection Flow

### Student Completes Interaction:
```typescript
// Frontend
onInteractionCompleted(result: { score: 67, selectedFragments: [...] }) {
  // Save to backend
  this.http.post('/api/interaction-results', {
    lessonId: this.lesson.id,
    stageId: this.activeStageId,
    substageId: this.activeSubstageId,
    interactionTypeId: 'true-false-selection',
    processedContentId: '40000000...',
    score: result.score,
    timeTakenSeconds: this.timeTaken,
    resultData: {
      selectedFragments: result.selectedFragments,
      correctCount: 2,
      incorrectCount: 1,
      missedCount: 1
    }
  }).subscribe(response => {
    this.showScorePopup({
      yourScore: 67,
      classAverage: response.classAverage, // 72%
      percentile: response.percentile      // 45th
    });
  });
}
```

### Backend Saves & Calculates:
```typescript
async saveResult(dto: CreateResultDto) {
  // 1. Save individual result
  const result = await this.resultsRepo.save(dto);
  
  // 2. Update or create average
  const avg = await this.getOrCreateAverage(dto.processedContentId);
  
  // 3. Recalculate (simple average for now)
  const allResults = await this.resultsRepo.find({
    where: { processedContentId: dto.processedContentId }
  });
  
  avg.avgScore = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
  avg.totalAttempts = allResults.length;
  await this.avgRepo.save(avg);
  
  // 4. Calculate percentile
  const percentile = this.calculatePercentile(dto.score, allResults);
  
  return {
    saved: true,
    yourScore: dto.score,
    classAverage: avg.avgScore,
    percentile
  };
}
```

---

## Migration Path

### Immediate (This Session):
1. Create `interaction_results` table schema
2. Create `interaction_averages` table schema
3. Add save endpoint
4. Update True/False Selection to save results
5. Show class average in score display

### Soon:
- Result popup modal component
- Custom metrics per interaction
- Percentile calculation

### Later:
- Rolling averages
- Analytics dashboard
- Difficulty auto-adjustment

---

## Next Steps

**RIGHT NOW:**
1. ✅ Fix scoring calculation → **DONE**
2. Create database tables
3. Add save result endpoint
4. Update True/False Selection to save
5. Show class average

**THEN:**
6. Create score popup modal
7. Optimize card sizes
8. Fix teacher widget z-index

**Should I proceed with creating the tables and endpoints?**

