# End-to-End Test Guide

**Version:** v0.3.5 (Frontend) / v0.0.7 (Backend)  
**Test Date:** November 11, 2025  
**Interaction Type:** True/False Selection (TEASE-Trigger)

---

## Prerequisites

✅ Backend running on `http://localhost:3000`  
✅ Frontend running on `http://localhost:8100`  
✅ Database seeded with `true-false-selection` interaction type  
✅ Default LLM provider configured (Grok 3 Mini)  
✅ Grok API key set in environment

---

## Test Flow

### **Step 1: Add Text Content Source**
**URL:** `http://localhost:8100/content-library`

1. Click **"+ Add Content Source"** button (top right)
2. Select **"Add Text Content"**
3. Paste the following sample text:

```
Photosynthesis is the process by which plants convert light energy into chemical energy. 
During photosynthesis, plants use chlorophyll to absorb sunlight. The chemical equation 
for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. This means that 
plants take in carbon dioxide and water, and with the help of sunlight, they produce 
glucose and oxygen. Plants do not eat soil; they make their own food through photosynthesis. 
Without sunlight, photosynthesis cannot occur. The green color of plants comes from chlorophyll, 
which is essential for capturing light energy.
```

4. **Title:** `Photosynthesis Basics`
5. **Topics:** `Science, Biology, Photosynthesis`
6. Click **"Add Content"**

**Expected Result:**  
✅ Content source created with `status: 'pending'`  
✅ Appears in Content Library under "Content Sources" tab  
✅ Status badge shows "Pending"

---

### **Step 2: Analyze Content with LLM**
**URL:** `http://localhost:8100/content-library`

1. Find your "Photosynthesis Basics" content source
2. Click **"View"** to open the details modal
3. Click **"Process"** button (or close and click "Process" from the card)
4. In the **Content Processor Modal:**
   - **Processor Type:** Select "LLM Content Analyzer"
   - **Interaction Type:** Pre-selected as "True/False Selection"
   - Click **"Process Content"**

**Expected Result:**  
✅ Processing starts (you'll see a loading indicator)  
✅ Backend calls Grok API with `true-false-selection` prompt  
✅ LLM generates 6-8 true/false statements about photosynthesis  
✅ Processed content saved with `status: 'pending'`, `interactionTypeId: 'true-false-selection'`  
✅ Token usage logged to `llm_generation_logs` table

**Console Logs to Check:**
```
[ContentAnalyzer] Analyzing content source: <id>
[ContentAnalyzer] Using provider: <name> (<model>)
[ContentAnalyzer] 📊 <provider> tokens used: <count>
[ContentAnalyzer] ✅ Generated 1 interaction output(s)
```

---

### **Step 3: Approve Processed Content**
**URL:** `http://localhost:8100/content-library`

1. Switch to **"Processed Content"** tab
2. Find your processed "Photosynthesis Basics" output
3. Click **"View"** to inspect the generated interaction data
4. **Verify the JSON structure:**
   ```json
   {
     "fragments": [
       {"text": "Plants perform photosynthesis", "isTrueInContext": true, "explanation": "..."},
       {"text": "Plants eat soil", "isTrueInContext": false, "explanation": "..."}
     ],
     "targetStatement": "Which statements about photosynthesis are TRUE?",
     "maxFragments": 8
   }
   ```
5. **Manually approve** (for now, use backend API or database update):
   ```sql
   UPDATE processed_content_outputs 
   SET status = 'approved' 
   WHERE id = '<output-id>';
   ```
   
   **Or via API:**
   ```bash
   curl -X PATCH http://localhost:3000/api/lesson-editor/processed-content/<id>/approve
   ```

**Expected Result:**  
✅ Processed content status changes to `'approved'`  
✅ Now available for use in lessons

---

### **Step 4: Create Lesson with Interaction**
**URL:** `http://localhost:8100/lesson-builder`

1. Click **"+ Create New Lesson"**
2. **Title:** `Photosynthesis 101`
3. **Description:** `Learn how plants make their own food`
4. **Tags:** `Science, Biology`
5. Click **"Create Lesson"**
6. Open the newly created lesson in the **Lesson Editor**

**In Lesson Editor:**
1. Click **"Add Stage"**
   - **Stage Type:** `TEASE` (Trigger)
   - **Title:** `What Do You Know About Photosynthesis?`
2. Click **"Add Sub-Stage"**
   - **Sub-Stage Type:** `Trigger`
   - **Title:** `Test Your Prior Knowledge`
   - **Interaction Type:** `True/False Selection`
   - **Duration:** `3` minutes
3. In the **"Add & Process Content"** panel:
   - Click **"Search Library"**
   - Find your approved "Photosynthesis Basics" processed content
   - Click to link it to this sub-stage
4. **Save Lesson**

**Expected Result:**  
✅ Lesson created with 1 stage, 1 sub-stage  
✅ Sub-stage linked to processed content via `contentOutputId`  
✅ Lesson data saved as JSONB in `lessons` table

---

### **Step 5: Play Lesson & Complete Interaction**
**URL:** Navigate to the lesson in the Lesson Browser

1. From **Lesson Builder** → click **"Preview"** or navigate to `/lesson-view/<lesson-id>`
2. In the **Lesson Player:**
   - Sidebar shows: `TEASE` stage → `Test Your Prior Knowledge` sub-stage
   - Click the sub-stage to activate it
3. **True/False Selection Interaction Loads:**
   - You see the target statement: "Which statements about photosynthesis are TRUE?"
   - 6-8 statement tiles appear
   - Some are true (green border when selected), some are false (red when selected)
4. **Interact:**
   - Tap/click statements you believe are TRUE
   - Tap again to deselect
   - Click **"Check My Answer"**
5. **View Score:**
   - Score is calculated: `(Correct TRUE selections / Total TRUE statements) × 100`
   - Score display shows: "You scored X%"
   - Color-coded: Green (100%), Yellow (70-99%), Red (<70%)
   - Sub-stage marked as **completed** (✓)

**Expected Result:**  
✅ Interaction loads correctly with LLM-generated data  
✅ Student can select statements  
✅ Score is calculated and displayed  
✅ Sub-stage completion tracked

**Console Logs to Check:**
```
[LessonView] Loading interaction data for contentOutputId: <id>
[LessonView] Loaded interaction data: {...}
[LessonView] Interaction ready: true-false-selection
[TrueFalseSelection] Fragment <index> selected
[TrueFalseSelection] Score: <score>% - <correct>/<total> correct
[LessonView] Interaction completed with score: <score>
```

---

### **Step 6: View Cost Dashboard**
**URL:** `http://localhost:8100/super-admin/llm-usage`

1. Navigate to **Super-Admin** → **LLM Token Usage**
2. **Check Dashboard Metrics:**
   - **Total Tokens Used:** Should reflect your test (estimate: ~500-1000 tokens)
   - **Estimated Cost:** Based on your provider's rate (e.g., Grok 3 Mini: ~$0.005/1M tokens)
   - **Provider:** Should show your configured LLM (e.g., "Grok 3 Mini")
3. **Check Account Usage Table:**
   - Find your test account (Sarah Johnson or your default user)
   - **Token Used:** Shows tokens from the content analysis
   - **Cost This Period:** Shows estimated cost for the current month
   - **LLM Used:** Shows which provider was used
   - **Avg Latency:** Shows average response time in ms
4. **Check Usage by Category:**
   - `content-analysis`: Tokens used for the LLM analysis step

**Expected Result:**  
✅ Token usage is logged and displayed  
✅ Cost is calculated correctly  
✅ Account-level usage is tracked  
✅ Provider and latency are shown

**Sample Dashboard Output:**
```
Total Tokens Used: 847
Estimated Cost: $0.004
Provider: Grok 3 Mini (xAI)

Account Usage:
| Account           | Token Used | Cost  | LLM Used       | Avg Latency |
|-------------------|------------|-------|----------------|-------------|
| Sarah Johnson     | 847        | $0.00 | Grok 3 Mini    | 1,234 ms    |
```

---

## Success Criteria

✅ **Content Source Created:** Text content saved with `status: 'pending'`  
✅ **LLM Analysis Successful:** Grok API generated True/False statements  
✅ **Token Usage Logged:** `llm_generation_logs` table has entry  
✅ **Content Approved:** Processed content status = `'approved'`  
✅ **Lesson Created:** Lesson with linked interaction saved  
✅ **Interaction Playable:** True/False Selection renders and functions  
✅ **Scoring Works:** Score calculated and displayed correctly  
✅ **Dashboard Updated:** Token usage and cost visible in Super-Admin

---

## Troubleshooting

### Issue: "No interaction data available yet"
- **Check:** Is `contentOutputId` set on the sub-stage?
- **Check:** Is the processed content `status: 'approved'`?
- **Check:** Backend endpoint `/lesson-editor/processed-content/<id>` returns data

### Issue: "Cannot analyze content - no LLM provider"
- **Run:** `POST http://localhost:3000/api/super-admin/llm-providers/seed`
- **Verify:** LLM provider table has at least one entry with `isDefault: true`

### Issue: "Grok API error"
- **Check:** `GROK_API_KEY` is set in `.env` file
- **Check:** API key is valid and has credits
- **Test:** `curl -H "Authorization: Bearer $GROK_API_KEY" https://api.x.ai/v1/chat/completions`

### Issue: "Token usage not showing in dashboard"
- **Check:** `llm_generation_logs` table exists
- **Check:** `provider_id` column is populated
- **Refresh:** Dashboard page (data might be cached)

---

## Next Steps After E2E Test

1. **Implement Approval UI:**
   - Add approve/reject buttons to Content Library
   - Create admin approval queue page

2. **Add More Interaction Types:**
   - Implement Fragment Builder (drag-and-drop)
   - Add other TEASE/EXPLORE/ABSORB interactions

3. **Enhance Scoring:**
   - Save scores to `student_topic_scores` table
   - Track mistakes in `student_mistakes` table
   - Show progress over time

4. **PDF Upload:**
   - Implement full PDF processing as per `PDF_UPLOAD_REQUIREMENTS.md`

5. **Production Deployment:**
   - Deploy to AWS (ECS, RDS, S3)
   - Set up CI/CD pipeline
   - Configure monitoring and alerts

---

## Test Completion Checklist

- [ ] Content source added successfully
- [ ] LLM analysis generated interaction data
- [ ] Processed content approved
- [ ] Lesson created and linked to interaction
- [ ] Lesson player loaded and rendered interaction
- [ ] Student completed interaction and saw score
- [ ] Token usage and cost displayed in dashboard
- [ ] All console logs show expected output
- [ ] No errors in browser or backend logs

**Date Completed:** _________________  
**Tester Name:** _________________  
**Notes:** _________________

