# Testing Draft Tracking System

## Overview

Automated tests ensure that all lesson data fields are properly tracked in the draft system. If you add a new field and don't update the draft tracking code, these tests will fail.

## Running the Tests

### Frontend Tests

```bash
cd Upora/frontend
npm test -- --include='**/lesson-editor-v2.component.draft-tracking.spec.ts'
```

Or run all frontend tests:
```bash
cd Upora/frontend
npm test
```

### Backend Tests

```bash
cd Upora/backend
npm test -- lesson-drafts.service.draft-tracking.spec.ts
```

Or run all backend tests:
```bash
cd Upora/backend
npm test
```

## What the Tests Check

### Frontend Tests (`lesson-editor-v2.component.draft-tracking.spec.ts`)

1. **Top-level fields**: Verifies all expected fields (title, description, category, etc.) are included in `draftData`
2. **Stage fields**: Verifies all stage fields are included
3. **Substage fields**: Verifies all substage fields are included
4. **Interaction fields**: Verifies all interaction fields are included
5. **Objectives fields**: Verifies all objectives fields are included

### Backend Tests (`lesson-drafts.service.draft-tracking.spec.ts`)

1. **Change detection**: Verifies that changes to all expected fields are detected in `generateDiff()`
2. **Stage changes**: Verifies stage field changes are detected
3. **Substage changes**: Verifies substage field changes are detected
4. **Interaction changes**: Verifies interaction config changes are detected
5. **Comprehensive changes**: Verifies multiple field changes across categories are detected

## Updating the Schema

When adding new fields, update the schema in `Upora/shared/types/lesson-schema.ts`:

```typescript
// Add to the appropriate interface
export interface LessonMetadata {
  // ... existing fields ...
  yourNewField: string; // ← Add here
}

// Update the getter function
export function getExpectedDraftDataFields(): string[] {
  return [
    // ... existing fields ...
    'yourNewField' // ← Add here
  ];
}
```

## What Happens When Tests Fail

If a test fails, it means:

1. **Frontend test failure**: A field is missing from `executeSaveDraft()` in `lesson-editor-v2.component.ts`
   - **Fix**: Add the field to the `draftData` object in `executeSaveDraft()`

2. **Backend test failure**: A field change is not being detected in `generateDiff()` in `lesson-drafts.service.ts`
   - **Fix**: Add comparison logic for the field in `generateDiff()`

## Example: Adding a New Field

### Step 1: Update Schema
```typescript
// In lesson-schema.ts
export interface LessonMetadata {
  // ... existing fields ...
  newFeature: string;
}

export function getExpectedDraftDataFields(): string[] {
  return [
    // ... existing fields ...
    'newFeature'
  ];
}
```

### Step 2: Add to Frontend Draft Saving
```typescript
// In lesson-editor-v2.component.ts, executeSaveDraft()
const draftData = {
  // ... existing fields ...
  newFeature: this.lesson.newFeature, // ← Add here
  structure: { /* ... */ }
};
```

### Step 3: Add to Backend Diff Generation
```typescript
// In lesson-drafts.service.ts, generateDiff()
if (liveLesson.newFeature !== draftData.newFeature) {
  changes.push({
    category: 'metadata',
    type: 'field_changed',
    field: 'newFeature',
    from: liveLesson.newFeature,
    to: draftData.newFeature,
    description: `New feature changed from "${liveLesson.newFeature}" to "${draftData.newFeature}"`
  });
  changeCategories.add('metadata');
}
```

### Step 4: Run Tests
```bash
# Frontend
cd Upora/frontend && npm test -- --include='**/draft-tracking.spec.ts'

# Backend
cd Upora/backend && npm test -- draft-tracking.spec.ts
```

### Step 5: Verify
- All tests should pass
- Make a change to the new field
- Save draft and verify it appears in "View Changes"
- Submit and approve to verify it's tracked end-to-end

## Continuous Integration

These tests should be run in CI/CD pipelines to catch missing fields before code is merged:

```yaml
# Example GitHub Actions
- name: Test Draft Tracking
  run: |
    cd frontend && npm test -- --include='**/draft-tracking.spec.ts'
    cd ../backend && npm test -- draft-tracking.spec.ts
```

## Troubleshooting

### Test fails but field is in code
- Check that the field name matches exactly (case-sensitive)
- Verify the field is in the correct location (top-level vs nested)
- Check that the test is using the correct data structure

### Test passes but changes aren't tracked
- Verify `markAsChanged()` is called when the field is modified
- Check that the field is loaded in `loadLessonDataIntoEditor()`
- Verify the backend comparison logic handles null/undefined correctly

### Field is optional but test requires it
- Update the schema to mark the field as optional: `field?: string`
- Update the test to handle optional fields appropriately






