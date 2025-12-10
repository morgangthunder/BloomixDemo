# Draft and Changes Tracking System - Developer Guide

## Overview

The lesson editor uses a comprehensive draft and changes-tracking system that automatically detects and tracks all modifications to lessons. This guide explains how to ensure new features, interactions, and configuration options are properly included in this system.

## How It Works

### Frontend (Lesson Editor)

1. **Draft Saving** (`executeSaveDraft()` in `lesson-editor-v2.component.ts`)
   - Builds a complete `draftData` object from the current lesson state
   - Includes: title, description, category, difficulty, tags, objectives, and the full `structure` (stages, substages, interactions, script blocks)
   - Sends to backend with `changeSummary` and `changesCount`

2. **Change Detection** (`generateChangeSummary()` and `countChanges()`)
   - Currently uses simple field comparison
   - **Note**: The backend's `generateDiff()` is the source of truth for actual changes

### Backend (Draft Service)

1. **Diff Generation** (`generateDiff()` in `lesson-drafts.service.ts`)
   - Compares live lesson data with draft data
   - Categorizes changes into:
     - `lesson_metadata` (title, description, category, difficulty, tags)
     - `objectives` (learning objectives, lesson outcomes)
     - `structure` (stages, substages)
     - `interaction_config` (interaction type, config, contentOutputId)
     - `content_submission` (processed content links)
     - `script_blocks` (teacher talk blocks, timing)
   - Returns detailed change list with `changesCount`

## Adding New Features - Checklist

When adding new features to the lesson editor, follow this checklist to ensure they're tracked:

### ✅ Step 1: Include in Draft Data

**Location**: `executeSaveDraft()` in `lesson-editor-v2.component.ts` (around line 3784)

**What to do**:
- Add your new field to the `draftData` object
- Follow the existing structure pattern
- For nested objects (like interaction config), use deep cloning: `JSON.parse(JSON.stringify(data))`

**Example - Adding a new lesson-level field**:
```typescript
const draftData = {
  title: this.lesson.title,
  description: this.lesson.description,
  // ... existing fields ...
  yourNewField: this.lesson.yourNewField, // ← Add here
  structure: { /* ... */ }
};
```

**Example - Adding a new substage field**:
```typescript
return {
  id: substage.id,
  title: substage.title,
  // ... existing fields ...
  yourNewSubstageField: substage.yourNewSubstageField, // ← Add here
  interaction: interactionData
};
```

**Example - Adding a new interaction config field**:
```typescript
const interactionData = substage.interaction
  ? {
      id: substage.interaction.id,
      type: substage.interaction.type,
      // ... existing fields ...
      config: substage.interaction.config
        ? JSON.parse(JSON.stringify(substage.interaction.config)) // Deep clone
        : {},
      yourNewConfigField: substage.interaction.yourNewConfigField // ← Add here
    }
  : null;
```

### ✅ Step 2: Include in Backend Diff Generation

**Location**: `generateDiff()` in `lesson-drafts.service.ts` (around line 89)

**What to do**:
- Add comparison logic for your new field
- Use the existing pattern: compare live vs draft, add to `changes` array if different
- Categorize appropriately (use existing categories or add new one if needed)

**Example - Adding comparison for a new lesson field**:
```typescript
// In generateDiff(), find the lesson_metadata section
if (draftData.title !== liveLesson.title) {
  changes.push({
    category: 'lesson_metadata',
    type: 'field_changed',
    field: 'title',
    from: liveLesson.title,
    to: draftData.title,
    description: `Title changed from "${liveLesson.title}" to "${draftData.title}"`
  });
}

// Add your new field comparison:
if (draftData.yourNewField !== liveLesson.yourNewField) {
  changes.push({
    category: 'lesson_metadata', // or appropriate category
    type: 'field_changed',
    field: 'yourNewField',
    from: liveLesson.yourNewField,
    to: draftData.yourNewField,
    description: `Your new field changed from "${liveLesson.yourNewField}" to "${draftData.yourNewField}"`
  });
}
```

**Example - Adding comparison for interaction config**:
```typescript
// In generateDiff(), find the interaction_config section
// The existing code already does deep comparison of interaction.config
// But if you add a top-level interaction field, add it here:

if (draftInteraction?.yourNewField !== liveInteraction?.yourNewField) {
  changes.push({
    category: 'interaction_config',
    type: 'field_changed',
    field: 'yourNewField',
    from: liveInteraction?.yourNewField,
    to: draftInteraction?.yourNewField,
    description: `Interaction ${fieldName} changed`
  });
}
```

### ✅ Step 3: Update Data Loading

**Location**: `loadLessonDataIntoEditor()` in `lesson-editor-v2.component.ts` (around line 4184)

**What to do**:
- Ensure your new field is loaded from the lesson data
- Handle both live lesson and draft data sources
- Set default values if missing

**Example**:
```typescript
// In loadLessonDataIntoEditor(), after loading lesson data:
this.lesson.yourNewField = lessonData.yourNewField || defaultValue;
```

### ✅ Step 4: Mark Changes When Modified

**Location**: Anywhere you modify the new field

**What to do**:
- Call `this.markAsChanged()` after modifying the field
- This ensures the "Save Draft" button activates

**Example**:
```typescript
onYourNewFieldChange(newValue: any) {
  this.lesson.yourNewField = newValue;
  this.markAsChanged(); // ← Don't forget this!
}
```

## Common Patterns

### Pattern 1: New Interaction Type with Custom Config

1. **Add config field to interaction config modal**
2. **Save in `executeSaveDraft()`** - Already handled by `interaction.config` deep clone
3. **Compare in `generateDiff()`** - Already handled by deep comparison of `interaction.config`
4. **Load in `loadLessonDataIntoEditor()`** - Already handled by interaction loading

**Note**: If your new interaction type has special config fields, they'll be automatically tracked as long as they're in `substage.interaction.config`.

### Pattern 2: New Lesson-Level Feature

1. Add to `draftData` in `executeSaveDraft()`
2. Add comparison in `generateDiff()` under `lesson_metadata` category
3. Load in `loadLessonDataIntoEditor()`
4. Call `markAsChanged()` when modified

### Pattern 3: New Substage Feature

1. Add to substage object in `executeSaveDraft()` (inside `subStages.map()`)
2. Add comparison in `generateDiff()` under `structure` category
3. Load in `parseStagesFromJSON()` or `loadLessonDataIntoEditor()`
4. Call `markAsChanged()` when modified

## Testing Your Changes

After adding a new feature:

1. **Create a draft** - Make a change to your new field and save
2. **Check draft data** - Verify your field appears in the draft payload (check browser console)
3. **View changes** - Click "View Changes" button and verify your change appears
4. **Submit for approval** - Submit and check approval queue shows your change
5. **Approve and verify** - Approve the change and verify it's applied to the live lesson

## Debugging

### Check if field is in draft data:
```typescript
// In executeSaveDraft(), add console.log:
console.log('[LessonEditor] Draft data includes yourNewField:', draftData.yourNewField);
```

### Check if change is detected:
```typescript
// In generateDiff(), add console.log:
console.log('[LessonDraftsService] Comparing yourNewField:', {
  live: liveLesson.yourNewField,
  draft: draftData.yourNewField,
  different: liveLesson.yourNewField !== draftData.yourNewField
});
```

### Check if change appears in diff:
```typescript
// In generateDiff(), after building changes array:
console.log('[LessonDraftsService] Changes found:', changes.length);
console.log('[LessonDraftsService] Changes for yourNewField:', 
  changes.filter(c => c.field === 'yourNewField'));
```

## Important Notes

1. **Deep Cloning**: Always use `JSON.parse(JSON.stringify())` for nested objects to avoid reference issues
2. **Null Handling**: Always check for null/undefined when comparing fields
3. **Type Consistency**: Ensure data types match between live and draft (string vs number, etc.)
4. **Backend is Source of Truth**: The backend's `generateDiff()` is what actually determines if there are changes. The frontend's `countChanges()` is just an estimate.

## Future Improvements

Consider these enhancements to make the system more automatic:

1. **Automatic Field Detection**: Use reflection/iteration to automatically compare all fields instead of manual comparison
2. **Schema-Based Tracking**: Define a schema that automatically tracks all fields
3. **Change Detection Hooks**: Create a system where components can register their fields for automatic tracking

## Questions?

If you're unsure whether your new feature is properly tracked:
1. Check the browser console for draft payload
2. Check the backend logs for diff generation
3. Test the full flow: save → view changes → submit → approve → verify








