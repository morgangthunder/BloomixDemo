# Verifying Processed Content Usage

## How to Know Which Format is Being Used

### 1. **Visual Indicator in the UI**
When viewing a lesson with a True/False interaction, you'll see:
- **Green indicator**: "✅ Using processed content (rankedInteractions format)" - This means it's using the NEW format from processed content
- **Yellow indicator**: "⚠️ Using fallback format: [format-name]" - This means it's using a legacy/fallback format

### 2. **Browser Console Logs**
Check the browser console for these messages:

**✅ NEW Format (What you want to see):**
```
[LessonView] ✅ Using NEW rankedInteractions format
[LessonView] ✅ Interaction data loaded successfully
[LessonView] 📊 Data source format: rankedInteractions
[LessonView] ✅ Using NEW format
```

**⚠️ FALLBACK Format (Legacy):**
```
[LessonView] ⚠️ Using FALLBACK: direct outputData structure (old format)
[LessonView] ⚠️ Using FALLBACK: legacy statements format
[LessonView] ⚠️ Using FALLBACK: raw outputData (last resort)
```

### 3. **Debug Info Panel**
Above the True/False interaction, you'll see a debug panel showing:
- **Format**: The format being used (rankedInteractions, direct, legacy-statements, etc.)
- **Content ID**: The processed content ID being used

## How Different Interactions Use Different Processed Content

### ✅ YES - Each Interaction Can Use Different Processed Content

**How it works:**
1. Each **sub-stage** in a lesson can have its own `contentOutputId`
2. Each **interaction** within a sub-stage can also have its own `contentOutputId` stored in `substage.interaction.contentOutputId`
3. When you select processed content in the Interaction Configuration modal, it sets:
   - `substage.contentOutputId` (for the sub-stage)
   - `substage.interaction.contentOutputId` (for the specific interaction)

**To verify:**
1. Open a lesson in the lesson editor
2. Go to a sub-stage with a True/False interaction
3. Click "Configure" on the interaction
4. Click "Select" next to "Processed Content"
5. Choose a processed content item
6. Save the configuration
7. Go to a different sub-stage (or create a new one)
8. Add another True/False interaction
9. Configure it and select a **different** processed content item
10. Both interactions will use their respective processed content items

**Storage Structure:**
```typescript
{
  stages: [
    {
      subStages: [
        {
          id: "substage-1",
          interaction: {
            type: "true-false-selection",
            contentOutputId: "processed-content-id-1" // ← Unique to this interaction
          },
          contentOutputId: "processed-content-id-1" // ← Also stored here
        },
        {
          id: "substage-2",
          interaction: {
            type: "true-false-selection",
            contentOutputId: "processed-content-id-2" // ← Different processed content!
          },
          contentOutputId: "processed-content-id-2"
        }
      ]
    }
  ]
}
```

**Console Logs When Loading:**
When you navigate to each sub-stage, you'll see:
```
[LessonView] 🔍 Loading interaction data for contentOutputId: processed-content-id-1
[LessonView] 📍 Sub-stage: First Interaction | Interaction type: true-false-selection
[LessonView] ✅ Using NEW rankedInteractions format
```

Then when you navigate to the second sub-stage:
```
[LessonView] 🔍 Loading interaction data for contentOutputId: processed-content-id-2
[LessonView] 📍 Sub-stage: Second Interaction | Interaction type: true-false-selection
[LessonView] ✅ Using NEW rankedInteractions format
```

## Testing Checklist

1. ✅ **Verify NEW format is being used:**
   - Look for green indicator in UI
   - Check console for "✅ Using NEW rankedInteractions format"
   - Verify debug panel shows "Format: rankedInteractions"

2. ✅ **Verify different interactions use different content:**
   - Create two sub-stages with True/False interactions
   - Select different processed content for each
   - Navigate between them and verify:
     - Different content IDs in console logs
     - Different fragments/cards displayed
     - Each shows its own processed content name

3. ✅ **Verify processed content is from the lesson:**
   - Check console log: `[LessonView] 📍 Sub-stage: [name]`
   - Verify the `contentOutputId` matches what you selected in the editor
   - Check that fragments match the processed content you viewed in Content Library

