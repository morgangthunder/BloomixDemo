# Draft Tracking Checklist - Quick Reference

Use this checklist when adding new features to the lesson editor to ensure they're properly tracked in the draft system.

## ✅ Quick Checklist

- [ ] **Step 1**: Added new field to `draftData` in `executeSaveDraft()` (frontend)
- [ ] **Step 2**: Added comparison logic in `generateDiff()` (backend)
- [ ] **Step 3**: Added loading logic in `loadLessonDataIntoEditor()` (frontend)
- [ ] **Step 4**: Added `markAsChanged()` call when field is modified (frontend)
- [ ] **Step 5**: Tested full flow: save → view changes → submit → approve → verify

## 📍 File Locations

### Frontend
- **Draft Saving**: `Upora/frontend/src/app/features/lesson-editor/lesson-editor-v2.component.ts`
  - `executeSaveDraft()` - Line ~3784
  - `loadLessonDataIntoEditor()` - Line ~4184
  - `markAsChanged()` - Call this when any field changes

### Backend
- **Diff Generation**: `Upora/backend/src/lesson-drafts/lesson-drafts.service.ts`
  - `generateDiff()` - Line ~89

## 🎯 Common Scenarios

### Adding a New Interaction Config Field
✅ **Already handled automatically!** 
- If you add it to `substage.interaction.config`, it's automatically tracked
- The system does deep comparison of `interaction.config`
- Just make sure to call `markAsChanged()` when modifying it

### Adding a New Lesson-Level Field
1. Add to `draftData` object in `executeSaveDraft()`
2. Add comparison in `generateDiff()` under `metadata` category
3. Load in `loadLessonDataIntoEditor()`
4. Call `markAsChanged()` when modified

### Adding a New Substage Field
1. Add to substage object in `executeSaveDraft()` (inside `subStages.map()`)
2. Add comparison in `generateDiff()` under `structure` category
3. Load in `parseStagesFromJSON()` or `loadLessonDataIntoEditor()`
4. Call `markAsChanged()` when modified

## 🧪 Testing Steps

1. **Make a change** to your new field
2. **Save draft** - Check browser console for draft payload
3. **View changes** - Click "View Changes" button, verify your change appears
4. **Submit** - Submit for approval
5. **Check approval queue** - Verify change is listed
6. **Approve** - Approve the change
7. **Verify** - Refresh page, verify change is applied to live lesson

## ⚠️ Common Mistakes

- ❌ Forgetting to add field to `draftData` → Field won't be saved
- ❌ Forgetting to add comparison in `generateDiff()` → Change won't be detected
- ❌ Forgetting to call `markAsChanged()` → Save button won't activate
- ❌ Not using deep clone for nested objects → Reference issues
- ❌ Not handling null/undefined in comparisons → False positives

## 📚 Full Documentation

See `DRAFT_TRACKING_GUIDE.md` for detailed explanations and examples.








