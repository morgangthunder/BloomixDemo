# Fix JavaScript Code Extraction for SDK Test Media Player

## Problem
The JavaScript code is being truncated at 373 characters instead of ~5000+ characters. The code ends with an incomplete template literal: `\`req-\${Date.now()}-\${++requestCounter}\`

## Root Cause
The extraction script is finding the wrong closing backtick. It's matching an escaped backtick inside the code (like in `generateRequestId`) instead of the actual closing backtick of the template literal at line 599.

## Solution Options

### Option 1: Use Known Line Numbers (RECOMMENDED)
Since we know the exact line numbers from the migration file:
- Start: Line 111 (index 110) - `const overlayJs = \``
- End: Line 599 (index 598) - `\`;`

This is the most reliable approach.

### Option 2: Improve Pattern Matching
Enhance the search logic to:
1. Find "await queryRunner.query" first (line ~601)
2. Search backwards for a line that:
   - Contains ONLY `\`;` (possibly with whitespace)
   - Does NOT contain: `const`, `generateRequestId`, `req-`, `Date.now`, `requestCounter`
   - Is within 5 lines of "await queryRunner.query"

### Option 3: Use a Different Source
Instead of extracting from the migration file, read the complete code from:
- The SQL file (`update-sdk-test-media-player-code-tab.sql`)
- A separate JavaScript file with the complete code

## Next Steps

1. **Fix the extraction script** using Option 1 (known line numbers)
2. **Add verification** to check code length before storing
3. **Query the database** to verify what was actually stored
4. **Test the interaction** to confirm the code is complete

## Testing Checklist

- [ ] Code length is ~5000+ characters
- [ ] Code contains "All buttons created"
- [ ] Code contains "initTestApp"
- [ ] Code ends with `})();` (closing of IIFE)
- [ ] No syntax errors when testing code
- [ ] Preview renders correctly
- [ ] All SDK test buttons appear and work


