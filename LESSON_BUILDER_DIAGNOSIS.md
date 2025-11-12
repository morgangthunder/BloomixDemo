# Lesson Builder Diagnosis - COMPLETE ANALYSIS

## 🔴 **ROOT CAUSE FOUND**

The `lesson-editor-v2.component.ts` is **INCOMPLETE**:

### Missing Critical Code
1. **No `lesson` property** - Template references `{{lesson.title}}` but property doesn't exist!
2. **No `loadLesson()` method** - `ngOnInit` calls `this.loadLesson(lessonId)` but method doesn't exist!
3. **No LessonService injection** - No way to fetch lesson from database

### What Exists ✅
- `stages: Stage[] = []` array (empty)
- `parseStagesFromJSON()` method (works, tested in lesson player)
- Script tab UI (exists but shows nothing)
- Save/submit buttons (exist but don't save to DB)

### What's Missing ❌
```typescript
// Missing property
lesson: Lesson | null = null;

// Missing method
loadLesson(lessonId: string) {
  this.lessonService.getLesson(lessonId).subscribe(
    lesson => {
      this.lesson = lesson;
      // Parse lesson.data.structure.stages
      if (lesson.data?.structure?.stages) {
        this.stages = this.parseStagesFromJSON(lesson.data.structure.stages);
      }
    }
  );
}
```

## 📊 Current Flow (BROKEN)

```
User clicks lesson in hub
  ↓
Navigates to /lesson-editor/:id
  ↓
ngOnInit() runs
  ↓
Calls this.loadLesson(lessonId) ← **METHOD DOESN'T EXIST**
  ↓
Template shows *ngIf="lesson" ← **LESSON IS UNDEFINED**
  ↓
Page appears blank or broken
```

## ✅ What SHOULD Happen

```
User clicks lesson in hub
  ↓
Navigates to /lesson-editor/:id
  ↓
ngOnInit() runs
  ↓
loadLesson() fetches from DB
  ↓
lesson = { id, title, data: { structure: { stages: [...] } } }
  ↓
parseStagesFromJSON(lesson.data.structure.stages)
  ↓
this.stages = [Stage with subStages with scriptBlocks]
  ↓
Template renders with lesson.title and stages
  ↓
Script tab shows script blocks from selected substage
```

## 🛠️ Fix Plan

### **Phase 1: Add Missing Properties & Methods** (30 min)
1. Add `lesson: Lesson | null = null` property
2. Add `isNewLesson: boolean = false` property
3. Inject `LessonService` in constructor
4. Implement `loadLesson(id: string)` method
5. Connect to backend API `/api/lessons/:id`

### **Phase 2: Parse Lesson Data** (15 min)
1. Extract `lesson.data.structure.stages`
2. Call `this.parseStagesFromJSON(stages)`
3. Populate `this.stages` array
4. Set `this.lesson` for template

### **Phase 3: Display Script Blocks** (15 min)
1. Script tab already has UI for script blocks
2. Fix `getSelectedSubStage()` method (currently doesn't exist)
3. Show script blocks from `substage.scriptBlocks[]`

### **Phase 4: Enable Editing** (30 min)
1. Add form fields for script block text
2. Add fields for duration, playback rules
3. Wire up to `this.markAsChanged()`

### **Phase 5: Save to Database** (30 min)
1. Convert `this.stages` back to JSON using existing `convertStagesToJSON()`
2. Update `lesson.data.structure.stages`
3. POST to `/api/lessons/:id` to save
4. Show success message

### **Phase 6: Test** (15 min)
1. Load lesson → verify script blocks show
2. Edit script block → save
3. Reload editor → verify changes persist
4. Open lesson player → verify changes work

## 📝 Estimated Total Time
**~2.5 hours** to full functionality

## 🎯 Next Immediate Steps
1. Add `lesson` property
2. Add `LessonService` injection
3. Implement `loadLesson()` method
4. Test that lesson loads and title shows
5. Then proceed to script block display

---

**Ready to start implementing?**

