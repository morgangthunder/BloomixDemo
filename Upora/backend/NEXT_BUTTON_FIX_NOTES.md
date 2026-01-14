# Next Button Fix - What Went Wrong

## The Problem
The Next button in the True/False HTML interaction was not moving to the next sub-stage when clicked.

## Root Cause
The `complete()` function (called by the Next button) was not calling `aiSDK.completeInteraction()` to trigger lesson progression.

## What We Tried (AND BROKE IT)
1. **Attempted Fix**: Used regex replacement to remove `emitEvent` calls that were triggering unwanted AI Teacher responses
2. **The Mistake**: The regex pattern was too aggressive and broke the JavaScript code structure
3. **Result**: The interaction code became corrupted with unmatched braces and syntax errors

## What Went Wrong
- Used regex replacement on JavaScript code: `emitEvent\s*\(\s*\{[\s\S]*?type:\s*['"](?:interaction-started|interaction-completed|user-selection)['"][\s\S]*?\}\s*\)\s*;?`
- This pattern matched multi-line code blocks but didn't preserve the code structure properly
- Resulted in unmatched braces (126 open, 129 close) and syntax errors

## Lessons Learned
- **NEVER use aggressive regex replacements on JavaScript code in the database** - it's too easy to break the code structure
- **The `updateTrueFalseSelectionCompleteInteraction()` method is safe** - it only updates the `complete()` function and ensures SDK initialization
- **For removing emitEvent calls**: Should be done more carefully, or accept that they exist and fix at the handler level

## Correct Approach (DO THIS)
1. **Fix Next button ONLY**: Call `/api/interaction-types/update-true-false-complete` endpoint
   - This safely updates the `complete()` function to call `aiSDK.completeInteraction()`
   - This ensures the SDK is properly initialized
   - This does NOT break the code structure

2. **For emitEvent calls**: 
   - Option A: Leave them as-is (they don't actually cause problems if handled correctly)
   - Option B: Fix at the handler level to ignore unwanted events
   - Option C: If really needed, use AST parsing or very careful, context-aware regex (NOT recommended)

## Restoration Steps
1. Call `/api/interaction-types/update-true-false-complete` endpoint to restore SDK and fix `complete()` function
2. Fix broken code by removing invalid syntax: `aiSDK.// Removed: emitEvent call` → remove entire line
3. Script created: `fix-broken-code.js` removes broken lines with invalid syntax
4. **RESTORATION REQUIRED**: Code still has 3 unmatched braces (126 open, 129 close)
5. **Solution**: Restore JavaScript code from database backup taken before regex replacement

## Fix Applied
- Removed broken lines: `aiSDK.// Removed: emitEvent call (triggers unwanted AI responses)`
- This was invalid JavaScript syntax left by the regex replacement
- The broken lines were completely removed (not replaced)
- However, code structure is still broken (unmatched braces)

## Restoration Required
The code structure is too damaged to fix automatically. Need to restore the `js_code` column for the `true-false-selection` interaction from a database backup taken before the regex replacement broke the code.
