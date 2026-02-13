# Interaction Scoring Audit & Best Practices

**Last Updated:** 2026-02-10  
**Version:** Frontend 0.3.88, Backend 0.3.58

## Overview

This document provides a comprehensive audit checklist for ensuring all interaction types correctly save scores, attempts, and other progress data that appears in Engagement Details views. It also establishes best practices for future interaction development.

## Critical Requirements

### 1. Score Saving Requirements

**All interactions that deliver a score MUST:**

1. ✅ **Calculate score as a number** (0-100, or percentage 0-1 converted to 0-100)
2. ✅ **Validate score before saving** (ensure it's a valid number, not NaN, not Infinity)
3. ✅ **Round score to 2 decimal places** (e.g., `Math.round(score * 100) / 100`)
4. ✅ **Call `saveUserProgress` with score** when interaction completes or score changes
5. ✅ **Include `completed: true`** when interaction is finished
6. ✅ **Handle score of 0** correctly (0 is a valid score, don't omit it)

**Example Implementation:**
```javascript
function calculateAndSaveScore() {
  // Calculate score (e.g., correctCount / totalQuestions * 100)
  const rawScore = (correctCount / totalQuestions) * 100;
  
  // Validate and round
  const finalScore = (typeof rawScore === 'number' && !isNaN(rawScore) && isFinite(rawScore))
    ? Math.round(rawScore * 100) / 100
    : 0;
  
  // Ensure SDK is initialized
  if (!window.aiSDK && typeof window.createIframeAISDK === "function") {
    window.aiSDK = window.createIframeAISDK();
  }
  
  // Save progress with score
  if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
    window.aiSDK.saveUserProgress({
      score: finalScore,
      completed: true,
      // Optional: timeTakenSeconds, interactionEvents, customData
    }, function(progress, error) {
      if (error) {
        console.error("[Interaction] Failed to save progress:", error);
      } else {
        console.log("[Interaction] Progress saved. Score:", progress?.score);
      }
    });
  } else {
    console.error("[Interaction] SDK not available for saving progress");
  }
}
```

### 2. SDK Initialization Requirements

**All interactions MUST:**

1. ✅ **Initialize SDK early** in the interaction lifecycle
2. ✅ **Check if SDK has `saveUserProgress`** method before using it
3. ✅ **Create new SDK instance** if existing `window.aiSDK` doesn't have required methods
4. ✅ **Handle SDK unavailability gracefully** (log warning, don't crash)

**Example SDK Initialization:**
```javascript
function initializeInteraction() {
  // Initialize SDK early if not available or missing saveUserProgress
  if ((!window.aiSDK || typeof window.aiSDK.saveUserProgress !== "function") 
      && typeof window.createIframeAISDK === "function") {
    console.log("[Interaction] Initializing SDK");
    window.aiSDK = window.createIframeAISDK();
    
    // Verify SDK has required methods
    if (!window.aiSDK || typeof window.aiSDK.saveUserProgress !== "function") {
      console.error("[Interaction] SDK missing saveUserProgress method");
    }
  }
  
  // Rest of initialization...
}
```

### 3. Data Flow Validation

**Score must flow correctly through:**

1. ✅ **Interaction JavaScript** → Calculates score, validates it
2. ✅ **Iframe SDK** (`createIframeAISDK`) → Sanitizes score, sends via postMessage
3. ✅ **Bridge Service** (`InteractionAIBridgeService`) → Validates score, forwards to SDK
4. ✅ **SDK Service** (`InteractionAISDK`) → Builds payload, includes score in HTTP request
5. ✅ **Backend Controller** (`InteractionDataController`) → Receives score in DTO
6. ✅ **Backend Service** (`InteractionDataService`) → Saves score to database
7. ✅ **Database** (`user_interaction_progress`) → Stores score (not NULL)
8. ✅ **Engagement Details** (`LessonsService.getEngagers`) → Calculates average from scores

## Interaction Type Audit Checklist

### Current Interaction Types

#### ✅ true-false-selection
- **Category:** HTML
- **Score Calculation:** ✅ Yes (correctCount / totalTrue * 100)
- **Score Validation:** ✅ Yes (validates, rounds to 2 decimals)
- **SDK Initialization:** ✅ Yes (early initialization + before save)
- **saveUserProgress Call:** ✅ Yes (called in `checkAnswers`)
- **Completed Flag:** ✅ Yes (`completed: true`)
- **Status:** ✅ **VERIFIED WORKING** (as of 2026-02-10)

#### ⚠️ sdk-test-html
- **Category:** HTML
- **Score Calculation:** ⚠️ **MANUAL ONLY** (random score via button, not automatic)
- **Score Validation:** ✅ Yes (uses `Math.floor(Math.random() * 100)`)
- **SDK Initialization:** ✅ Yes (`aiSDK = createIframeAISDK()`)
- **saveUserProgress Call:** ✅ Yes (via "Save User Progress" button, line 400-418)
- **Completed Flag:** ⚠️ **MANUAL ONLY** (via "Mark Completed" button, not automatic)
- **Status:** ⚠️ **TEST INTERACTION** - Score saving works but is manual (button-based). This is acceptable for a test interaction, but not suitable for production scored interactions.

#### ❌ sdk-test-iframe
- **Category:** iframe
- **Score Calculation:** ❌ **NOT IMPLEMENTED**
- **Score Validation:** ❌ **NOT IMPLEMENTED**
- **SDK Initialization:** ⚠️ **PARTIAL** (has SDK but missing `saveUserProgress` method)
- **saveUserProgress Call:** ❌ **NOT FOUND** (no `saveUserProgress` in code)
- **Completed Flag:** ❌ **NOT IMPLEMENTED**
- **Status:** ❌ **MISSING SCORE SAVING** - This interaction does not implement score saving. Needs implementation.

#### ⚠️ sdk-test-pixijs
- **Category:** PixiJS
- **Score Calculation:** ⚠️ **MANUAL ONLY** (random score via button, not automatic)
- **Score Validation:** ✅ Yes (uses `Math.floor(Math.random() * 100)`)
- **SDK Initialization:** ✅ Yes (`aiSDK = createIframeAISDK()`)
- **saveUserProgress Call:** ✅ Yes (via "Save User Progress" button)
- **Completed Flag:** ⚠️ **MANUAL ONLY** (via "Mark Completed" button, not automatic)
- **Status:** ⚠️ **TEST INTERACTION** - Score saving works but is manual (button-based). This is acceptable for a test interaction, but not suitable for production scored interactions. Note: builder@upora.dev has score 86, indicating manual testing worked.

#### ⚠️ sdk-test-media-player
- **Category:** uploaded-media
- **Score Calculation:** ⚠️ **MANUAL ONLY** (random score via button, not automatic)
- **Score Validation:** ✅ Yes (uses `Math.floor(Math.random() * 100)`)
- **SDK Initialization:** ✅ Yes (`aiSDK = createVideoUrlAISDK()`)
- **saveUserProgress Call:** ✅ Yes (via "Save User Progress" button, line 554-573)
- **Completed Flag:** ⚠️ **MANUAL ONLY** (via "Mark Completed" button, not automatic)
- **Status:** ⚠️ **TEST INTERACTION** - Score saving works but is manual (button-based). This is acceptable for a test interaction, but not suitable for production scored interactions.

#### ⚠️ sdk-test-video-url
- **Category:** video-url
- **Score Calculation:** ⚠️ **MANUAL ONLY** (random score via button, not automatic)
- **Score Validation:** ✅ Yes (uses `Math.floor(Math.random() * 100)`)
- **SDK Initialization:** ✅ Yes (`aiSDK = createVideoUrlAISDK()`)
- **saveUserProgress Call:** ✅ Yes (via "Save User Progress" button, line 563-582)
- **Completed Flag:** ⚠️ **MANUAL ONLY** (via "Mark Completed" button, not automatic)
- **Status:** ⚠️ **TEST INTERACTION** - Score saving works but is manual (button-based). This is acceptable for a test interaction, but not suitable for production scored interactions.

## Audit Process

### Step 1: Code Review

For each interaction type, check:

1. **JavaScript Code Review:**
   - [ ] Does the code calculate a score?
   - [ ] Is the score validated (not NaN, not Infinity)?
   - [ ] Is the score rounded to 2 decimal places?
   - [ ] Is `window.aiSDK` initialized?
   - [ ] Is `saveUserProgress` called with the score?
   - [ ] Is `completed: true` set when appropriate?
   - [ ] Are there error handlers for SDK failures?

2. **SDK Method Availability:**
   - [ ] Does `createIframeAISDK()` return an object with `saveUserProgress`?
   - [ ] Is the SDK injected correctly into the iframe?
   - [ ] Does the bridge service forward `saveUserProgress` messages?

### Step 2: Functional Testing

For each interaction type:

1. **Complete the interaction** as a test user
2. **Check browser console** for:
   - `[Interaction]` logs showing score calculation
   - `[IframeSDK] saveUserProgress called with:` showing score
   - `[Bridge] 📨 ai-sdk-save-user-progress received:` showing score
   - `[InteractionAISDK] 💾 saveUserProgress called:` showing score in payloadJSON
3. **Check backend logs** for:
   - `[InteractionData] 💾 saveUserProgress called:` with `score: X`
   - `[InteractionDataService] 📊 Updating score:` (not "Score not provided or null")
   - `[InteractionDataService] ✅ Progress saved:` with `score: X`
4. **Check database:**
   ```sql
   SELECT user_id, interaction_type_id, score, completed, attempts 
   FROM user_interaction_progress 
   WHERE interaction_type_id = 'INTERACTION_ID' 
   AND user_id = 'TEST_USER_ID';
   ```
   - [ ] Score is NOT NULL
   - [ ] Score is a number (0-100)
   - [ ] Completed is true/false (not NULL)
   - [ ] Attempts is incremented correctly
5. **Check Engagement Details:**
   - [ ] Navigate to Lesson Editor → View Engagers → View Details
   - [ ] Verify interaction appears in list
   - [ ] Verify score is displayed (not "No score")
   - [ ] Verify average score is calculated correctly

### Step 3: Edge Case Testing

Test these scenarios for each interaction:

1. **Score of 0:**
   - [ ] Interaction with 0% score saves correctly
   - [ ] Score of 0 appears in Engagement Details
   - [ ] Score of 0 is included in average calculation

2. **Score of 100:**
   - [ ] Perfect score saves correctly
   - [ ] Score of 100 appears correctly

3. **Multiple Attempts:**
   - [ ] First attempt saves score correctly
   - [ ] Second attempt updates score correctly
   - [ ] Attempts counter increments
   - [ ] Latest score is used for average

4. **Invalid Scores:**
   - [ ] NaN score is handled (should not save or default to 0)
   - [ ] Infinity score is handled (should not save or default to 0)
   - [ ] Negative score is handled (should clamp to 0 or reject)
   - [ ] Score > 100 is handled (should clamp to 100 or reject)

5. **SDK Unavailability:**
   - [ ] Interaction works if SDK is not initialized
   - [ ] Error is logged but doesn't crash interaction
   - [ ] User can still complete interaction

## Common Issues & Solutions

### Issue 1: Score is NULL in Database

**Symptoms:**
- Engagement Details shows "Avg: No score"
- Database query shows `score: null`

**Root Causes:**
1. Score not calculated in interaction code
2. Score not passed to `saveUserProgress`
3. Score is `undefined` or `null` when passed
4. Score validation removes it from payload
5. SDK not initialized or missing `saveUserProgress` method

**Solutions:**
- ✅ Ensure score is calculated as a number
- ✅ Validate score before passing: `if (typeof score === 'number' && !isNaN(score) && isFinite(score))`
- ✅ Round score: `Math.round(score * 100) / 100`
- ✅ Initialize SDK early: `window.aiSDK = window.createIframeAISDK()`
- ✅ Verify SDK has method: `typeof window.aiSDK.saveUserProgress === "function"`

### Issue 2: Score Not Included in HTTP Payload

**Symptoms:**
- Backend logs show `score: undefined`
- Payload JSON doesn't include `score` field

**Root Causes:**
1. Score is `undefined` when building payload
2. Angular HTTP client omits `undefined` values from JSON

**Solutions:**
- ✅ Explicitly build payload object, only include score if valid
- ✅ Use `payload.score = validScore` instead of spreading `{...data, score: undefined}`

### Issue 3: SDK Missing saveUserProgress Method

**Symptoms:**
- Console: `window.aiSDK.saveUserProgress not available`
- SDK object exists but doesn't have the method

**Root Causes:**
1. Wrong SDK instance (widget SDK instead of full SDK)
2. SDK not initialized correctly
3. SDK injected into iframe doesn't include the method

**Solutions:**
- ✅ Check if SDK has method: `typeof window.aiSDK.saveUserProgress !== "function"`
- ✅ Create new SDK instance: `window.aiSDK = window.createIframeAISDK()`
- ✅ Verify injected SDK includes `saveUserProgress` (check lesson-view component)

### Issue 4: Average Score Calculation Wrong

**Symptoms:**
- Engagement Details shows incorrect average
- Average doesn't match individual scores

**Root Causes:**
1. NULL scores included in average calculation
2. Score calculation query incorrect
3. Scores not retrieved correctly

**Solutions:**
- ✅ Backend query filters: `WHERE score IS NOT NULL`
- ✅ Average calculation only uses non-NULL scores
- ✅ Verify scores are actually saved (not NULL) before calculating average

## Best Practices for Interaction Builders

### 1. Always Initialize SDK Early

```javascript
// At the start of your interaction initialization
function initializeInteraction() {
  // Initialize SDK first
  if ((!window.aiSDK || typeof window.aiSDK.saveUserProgress !== "function") 
      && typeof window.createIframeAISDK === "function") {
    window.aiSDK = window.createIframeAISDK();
  }
  
  // Verify SDK is ready
  if (!window.aiSDK || typeof window.aiSDK.saveUserProgress !== "function") {
    console.error("[Interaction] SDK not available - scores will not be saved");
  }
  
  // Rest of initialization...
}
```

### 2. Calculate Score Correctly

```javascript
function calculateScore() {
  // Example: Quiz with multiple questions
  let correctCount = 0;
  let totalQuestions = questions.length;
  
  questions.forEach(q => {
    if (q.userAnswer === q.correctAnswer) {
      correctCount++;
    }
  });
  
  // Calculate percentage (0-100)
  const rawScore = (correctCount / totalQuestions) * 100;
  
  // Validate and round
  const finalScore = (typeof rawScore === 'number' && !isNaN(rawScore) && isFinite(rawScore))
    ? Math.round(rawScore * 100) / 100  // Round to 2 decimals
    : 0;  // Default to 0 if invalid
  
  return finalScore;
}
```

### 3. Save Score When Interaction Completes

```javascript
function onInteractionComplete() {
  const score = calculateScore();
  const timeTaken = getTimeTakenSeconds();
  
  // Ensure SDK is available
  if (!window.aiSDK && typeof window.createIframeAISDK === "function") {
    window.aiSDK = window.createIframeAISDK();
  }
  
  // Save progress
  if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
    window.aiSDK.saveUserProgress({
      score: score,
      completed: true,
      timeTakenSeconds: timeTaken,
      // Optional: customData, interactionEvents
    }, function(progress, error) {
      if (error) {
        console.error("[Interaction] Failed to save progress:", error);
      } else {
        console.log("[Interaction] ✅ Progress saved. Score:", progress?.score);
      }
    });
  } else {
    console.error("[Interaction] ❌ Cannot save progress - SDK not available");
  }
}
```

### 4. Handle Score Updates During Interaction

```javascript
// For interactions where score changes during play (e.g., real-time scoring)
function updateScore(newScore) {
  // Validate score
  const validScore = (typeof newScore === 'number' && !isNaN(newScore) && isFinite(newScore))
    ? Math.round(newScore * 100) / 100
    : undefined;
  
  // Only save if valid
  if (validScore !== undefined && window.aiSDK?.saveUserProgress) {
    window.aiSDK.saveUserProgress({
      score: validScore,
      completed: false,  // Not complete yet
    });
  }
}
```

### 5. Track Attempts Correctly

```javascript
// If your interaction allows multiple attempts
function startNewAttempt() {
  // SDK automatically increments attempts when saveUserProgress is called
  // But you can also explicitly increment:
  if (window.aiSDK?.incrementAttempts) {
    window.aiSDK.incrementAttempts(function(progress, error) {
      console.log("Attempts:", progress?.attempts);
    });
  }
}
```

## Testing Checklist for New Interactions

When creating a new interaction, verify:

- [ ] **Score Calculation:**
  - [ ] Score is calculated correctly (0-100 scale)
  - [ ] Score handles edge cases (0 correct, all correct, division by zero)
  - [ ] Score is rounded to 2 decimal places

- [ ] **SDK Integration:**
  - [ ] SDK is initialized early in interaction lifecycle
  - [ ] SDK has `saveUserProgress` method available
  - [ ] `saveUserProgress` is called when score is calculated
  - [ ] Error handling for SDK failures

- [ ] **Data Persistence:**
  - [ ] Score is saved to database (not NULL)
  - [ ] Completed flag is set correctly
  - [ ] Attempts counter increments
  - [ ] Time taken is tracked (if applicable)

- [ ] **Engagement Details:**
  - [ ] Interaction appears in Engagement Details list
  - [ ] Score is displayed correctly
  - [ ] Average score includes this interaction's score
  - [ ] Order matches lesson script order

- [ ] **Edge Cases:**
  - [ ] Score of 0 saves correctly
  - [ ] Score of 100 saves correctly
  - [ ] Invalid scores (NaN, Infinity) are handled
  - [ ] Multiple attempts update score correctly

## Validation Script

Run this SQL query to audit all interactions for a user:

```sql
-- Check all interactions for a specific user
SELECT 
  uip.interaction_type_id,
  it.name as interaction_name,
  COUNT(*) as total_attempts,
  COUNT(uip.score) as attempts_with_score,
  COUNT(*) - COUNT(uip.score) as attempts_without_score,
  AVG(uip.score) as avg_score,
  MIN(uip.score) as min_score,
  MAX(uip.score) as max_score,
  SUM(CASE WHEN uip.completed THEN 1 ELSE 0 END) as completed_count
FROM user_interaction_progress uip
JOIN interaction_types it ON uip.interaction_type_id = it.id
WHERE uip.user_id = 'USER_ID_HERE'
GROUP BY uip.interaction_type_id, it.name
ORDER BY uip.interaction_type_id;
```

**Expected Results:**
- `attempts_without_score` should be 0 (or only for interactions that don't deliver scores)
- `avg_score` should be a number (not NULL) for scored interactions
- `completed_count` should match expected completions

## Future-Proofing Recommendations

### 1. SDK Validation on Load

Add automatic validation when SDK is created:

```javascript
// In createIframeAISDK function
const sdk = {
  // ... other methods ...
  saveUserProgress: (data, callback) => {
    // Validate score before sending
    if (data.score !== undefined && data.score !== null) {
      const numScore = Number(data.score);
      if (isNaN(numScore) || !isFinite(numScore)) {
        console.warn('[SDK] Invalid score provided:', data.score);
        delete data.score;  // Remove invalid score
      } else {
        // Round to 2 decimals
        data.score = Math.round(numScore * 100) / 100;
      }
    }
    // ... rest of implementation
  }
};

// Verify SDK has all required methods
const requiredMethods = ['saveUserProgress', 'getUserProgress', 'markCompleted'];
requiredMethods.forEach(method => {
  if (typeof sdk[method] !== 'function') {
    console.error(`[SDK] Missing required method: ${method}`);
  }
});

return sdk;
```

### 2. Interaction Builder Validation

Add validation in Interaction Builder:

- [ ] **Code Scanner:** Check if JavaScript code includes `saveUserProgress` call
- [ ] **Score Calculation Check:** Verify score is calculated and validated
- [ ] **SDK Initialization Check:** Verify SDK is initialized
- [ ] **Warning Messages:** Show warnings if score-saving code is missing

### 3. Automated Tests

Create automated tests that:

- [ ] **Unit Tests:** Test score calculation logic
- [ ] **Integration Tests:** Test score saving flow end-to-end
- [ ] **E2E Tests:** Test complete interaction → Engagement Details flow
- [ ] **Validation Tests:** Test edge cases (0, 100, NaN, Infinity)

### 4. Documentation Updates

Ensure all documentation includes:

- [ ] **Score Saving Requirements:** Clear instructions on when and how to save scores
- [ ] **SDK Initialization:** Step-by-step guide for initializing SDK
- [ ] **Examples:** Complete examples showing score calculation and saving
- [ ] **Troubleshooting:** Common issues and solutions

## Action Items

### Immediate (This Session)

- [x] ✅ Fix true-false-selection score saving
- [x] ✅ Add `saveUserProgress` to injected SDK in lesson-view
- [x] ✅ Create audit checklist document
- [ ] 🔄 Audit all existing interaction types
- [ ] 🔄 Update SDK documentation
- [ ] 🔄 Update Interaction Builder Guide
- [ ] 🔄 Create validation tests

### Short Term (Next Sprint)

- [ ] Add code validation in Interaction Builder
- [ ] Create automated audit script
- [ ] Add score saving examples to all interaction templates
- [ ] Create E2E tests for score persistence

### Long Term (Future)

- [ ] Add score saving wizard in Interaction Builder
- [ ] Create interaction template library with score saving
- [ ] Add real-time score validation feedback
- [ ] Create score saving best practices video/tutorial

## References

- **SDK Documentation:** `Upora/frontend/src/app/core/services/IFRAME_INTERACTION_AI_SDK.md`
- **Interaction Builder Guide:** `INTERACTION_BUILDER_GUIDE.md`
- **Backend Service:** `Upora/backend/src/services/interaction-data.service.ts`
- **Frontend SDK:** `Upora/frontend/src/app/core/services/interaction-ai-sdk.service.ts`
- **Bridge Service:** `Upora/frontend/src/app/core/services/interaction-ai-bridge.service.ts`
