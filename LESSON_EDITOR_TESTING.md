# Lesson Editor Testing Guide

## 🎉 Implementation Complete!

**Frontend Version:** `v0.2.0`  
**Lesson Editor Version:** `v3.0.0`

---

## ✅ What Was Implemented

### Phase 1: Load Lesson Data ✅
- Added `initializeNewLesson()` method
- Added `loadLesson(id: string)` method
- Loads lesson from database via `LessonService`
- Parses `lesson.data.structure.stages` into editor format

### Phase 2: Display Script Blocks ✅
- Added `getSelectedSubStage()` method
- Added `getSelectedStage()` method
- Added `formatTime()` helper
- Added `getBlockIcon()` helper
- Script tab now displays script blocks from selected substage

### Phase 3: Enable Editing ✅
- Added `addScriptBlock()` method
- Added `deleteScriptBlock()` method
- Added `(ngModelChange)="markAsChanged()"` to all inputs
- Changes are tracked and prompt unsaved changes warning

### Phase 4: Save to Database ✅
- `saveDraft()` already implemented (converts stages → JSON → updates `lesson.data`)
- PATCH request to `/api/lessons/:id`
- Updates `lesson.data.structure.stages` in database

---

## 🧪 End-to-End Testing Instructions

### **Step 1: Hard Refresh**
```
Press: Ctrl + Shift + R
```
- Clear cache to load new version
- Check console for: `🔥🔥🔥 FRONTEND VERSION 0.2.0 LOADED 🔥🔥🔥`

---

### **Step 2: Navigate to Lesson Builder**
```
URL: http://localhost:8100/lesson-builder
```
- Should see 3 lessons from database
- Click on one (e.g., "Photosynthesis Basics")

---

### **Step 3: Verify Lesson Loads**
Console should show:
```
🔥🔥🔥 LESSON EDITOR VERSION 3.0.0 - FULLY FUNCTIONAL 🔥🔥🔥
[LessonEditor] 📖 Loading lesson: 30000000-0000-0000-0000-000000000099
[LessonEditor] ✅ Lesson loaded: {...}
[LessonEditor] 📊 Parsing stages from lesson.data.structure.stages
[LessonEditor] ✅ Parsed stages: [...]
```

**Check:**
- ✅ Lesson title shows at top ("Photosynthesis Basics")
- ✅ Sidebar shows stages/substages (expand to see)
- ✅ No errors in console

---

### **Step 4: Open Script Tab & Select Substage**
1. Click **"Script"** tab (📜)
2. In sidebar, expand **"Understanding Photosynthesis"** stage
3. Click on **"What is Photosynthesis?"** substage

**Check:**
- ✅ Script tab shows: "What is Photosynthesis? (X min)"
- ✅ Timeline ruler appears
- ✅ **Script blocks display!** (should see existing blocks from lesson JSON)
- ✅ Each block shows:
  - Icon (👨‍🏫, 🎯, or ⏸)
  - Type dropdown
  - Start/End time inputs
  - Textarea for content

---

### **Step 5: Edit a Script Block**
1. Find the intro script block (should say "Welcome to this lesson on Photosynthesis...")
2. Edit the text (e.g., add "Hello!")
3. Change the end time (e.g., 45 seconds instead of 30)

**Check:**
- ✅ Changes reflect immediately in UI
- ✅ "Save Draft" button enables
- ✅ Button text changes to "Save Draft" (no longer "Saved")

---

### **Step 6: Add a New Script Block**
1. Click **"+ Add Block"** button
2. New empty block appears
3. Change type to "👨‍🏫 Teacher Talk"
4. Enter some text: "This is a new script block!"
5. Set start time: 45, end time: 60

**Check:**
- ✅ New block appears in list
- ✅ Save button enabled

---

### **Step 7: Save Changes**
1. Click **"💾 Save Draft"** button

Console should show:
```
[LessonEditor] 💾 Saving draft...
[LessonEditor] 📤 Sending PATCH to: http://localhost:3000/api/lessons/...
[LessonEditor] ✅ Save successful: {...}
```

**Check:**
- ✅ Toast notification: "Lesson saved successfully"
- ✅ Button text changes to "Saved"
- ✅ Last saved timestamp appears
- ✅ No errors in console

---

### **Step 8: Verify in Database (Optional)**
Open DB tool and check `lessons` table:
```sql
SELECT id, title, data->>'structure' FROM lessons 
WHERE id = '30000000-0000-0000-0000-000000000099';
```

**Check:**
- ✅ `data.structure.stages[0].subStages[0].scriptBlocks` contains your changes
- ✅ New script block is present

---

### **Step 9: Reload Editor & Verify Persistence**
1. Navigate back to Lesson Builder (`/lesson-builder`)
2. Click on the same lesson again
3. Go to Script tab
4. Select the same substage

**Check:**
- ✅ Your edited text is still there
- ✅ Your new script block is still there
- ✅ All changes persisted!

---

### **Step 10: Test in Lesson Player**
1. Navigate to: `http://localhost:8100/lesson-view/30000000-0000-0000-0000-000000000099`
2. Wait for lesson to start
3. Listen to teacher script

**Check:**
- ✅ Edited script plays with new text
- ✅ New script block plays at its timestamp
- ✅ Everything works in player!

---

## 🐛 Potential Issues & Solutions

### Issue: Lesson title is blank or "undefined"
**Fix:** Check console for lesson load errors. Ensure `lesson.title` exists in DB.

### Issue: No stages show in sidebar
**Fix:** Check `lesson.data.structure.stages` exists. Run:
```typescript
console.log(this.lesson.data);
```

### Issue: Script blocks don't show
**Fix:** Check selected substage has `scriptBlocks` array:
```typescript
console.log(this.getSelectedSubStage()?.scriptBlocks);
```

### Issue: Save fails with 404
**Fix:** Check backend is running on `http://localhost:3000`

### Issue: Changes don't persist
**Fix:** Check PATCH request in Network tab. Verify payload includes `data.structure.stages`.

---

## 📊 Success Criteria

✅ **ALL** of these must work:
1. Lesson loads from database
2. Lesson title displays
3. Stages/substages show in sidebar
4. Script tab displays script blocks
5. Can edit script block text
6. Can edit script block times
7. Can add new script blocks
8. Can delete script blocks
9. Save button works
10. Changes persist after reload
11. Changes work in lesson player

---

## 🎯 Next Steps (If All Tests Pass)

1. ✅ Mark TODO #7 as completed
2. Update `LESSON_BUILDER_STATUS.md` with success notes
3. Consider additional features:
   - Edit interaction configurations
   - Add/remove stages and substages
   - Drag-and-drop reordering
   - AI assistant for script generation

---

**Ready to test!** 🚀

