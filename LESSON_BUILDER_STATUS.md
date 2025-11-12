# Lesson Builder Status & Plan

## Current State Analysis

### What's Working ✅
1. **Lesson Builder Hub** (`/lesson-builder`)
   - Shows 3 lessons from DB
   - Can navigate to lesson editor
   - New lesson/course buttons present

2. **Lesson Player** (`/lesson-view/:id`)
   - Loads lessons from DB with new JSON structure
   - Script blocks display correctly
   - True/False Selection interaction works
   - Class average tracking works
   - Auto-advance works
   - Timer works

3. **Database**
   - Lessons stored with new JSON format in `data` column
   - Script blocks embedded in substages
   - Interactions embedded in substages

### What's Not Working ❌

1. **Lesson Editor Script Tab**
   - Opens when clicking on lesson in hub
   - Shows lesson title
   - Script tab exists but doesn't display script blocks
   - **Issue**: Likely not reading from new JSON structure (`lesson.data.structure.stages[].subStages[].scriptBlocks`)

2. **Lesson JSON Structure Mismatch**
   - Old editor expects: `lesson.stages[].subStages[].scriptBlocks[]`
   - New structure has: `lesson.data.structure.stages[].subStages[].scriptBlocks[]`

3. **Script Block Editing**
   - No UI to add/edit script blocks
   - No connection to new JSON format

## Current Lesson JSON Structure

```json
{
  "id": "30000000-0000-0000-0000-000000000099",
  "title": "Photosynthesis Basics",
  "data": {
    "structure": {
      "stages": [
        {
          "id": "stage-1",
          "title": "Understanding Photosynthesis",
          "type": "tease",
          "subStages": [
            {
              "id": "substage-1-1",
              "title": "What is Photosynthesis?",
              "scriptBlocks": [
                {
                  "id": "script-1-1-intro",
                  "text": "Welcome...",
                  "estimatedDuration": 15,
                  "idealTimestamp": 0,
                  "playbackRules": { ... }
                }
              ],
              "interaction": {
                "type": "true-false-selection",
                "config": { ... }
              },
              "scriptBlocksAfterInteraction": [ ... ]
            }
          ]
        }
      ]
    },
    "config": {
      "objectives": [],
      "prerequisites": []
    }
  }
}
```

## Plan to Fix Lesson Builder

### Phase 1: Read Current Lesson Data ✅ (Diagnostic)
- [x] Identify lesson editor component (`lesson-editor-v2.component.ts`)
- [x] Understand current data structure expectations
- [ ] Check if editor is reading from `lesson.data.structure` or old `lesson.stages`

### Phase 2: Update Data Access
- [ ] Update lesson editor to read from `lesson.data.structure.stages`
- [ ] Map substages to access `scriptBlocks` array
- [ ] Display script blocks in Script tab

### Phase 3: Enable Script Block Editing
- [ ] Add UI to add new script blocks
- [ ] Add UI to edit existing script blocks (text, duration, playback rules)
- [ ] Add UI to delete script blocks
- [ ] Add UI to reorder script blocks

### Phase 4: Save Back to Database
- [ ] Convert edited data back to JSON format
- [ ] Save to `lesson.data` column
- [ ] Optionally: Trigger JSON file update via backend

### Phase 5: Interaction Editing
- [ ] Display embedded interactions in editor
- [ ] Allow editing interaction config (e.g., fragments, showHints)
- [ ] Allow switching interaction types

## Immediate Next Steps

1. **Debug Script Tab** - Add console logging to see what data it's trying to access
2. **Update Data Accessor** - Point it to `lesson.data.structure.stages` instead of `lesson.stages`
3. **Test Display** - Verify script blocks show in UI
4. **Enable Editing** - Build UI for adding/editing script blocks
5. **Save Functionality** - Connect save button to update `lesson.data`

## Questions for User
- Should lesson-builder save changes back to JSON files or just to database?
- Do you want to edit the JSON directly or through UI forms?
- Should we support both old and new lesson formats or only new?

