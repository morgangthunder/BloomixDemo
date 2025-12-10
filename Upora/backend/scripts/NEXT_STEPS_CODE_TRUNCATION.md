# Next Steps: JavaScript Code Truncation Issue

## Current Status

✅ **Extraction is working correctly:**
- Debug script confirms: 18,133 characters extracted
- Contains "All buttons created": YES
- Contains "initTestApp": YES
- Contains "})();": YES

❌ **Storage is failing:**
- Database shows: 385 characters (truncated)
- Code ends at: `\`req-\${Date.now()}-\${++requestCounter}\`
- Missing: All buttons, initTestApp, and most of the code

## Root Cause Analysis

The code is being truncated when passed to the SQL query. The truncation happens at the first backtick in the code (`generateRequestId` function), suggesting:

1. **TypeORM parameter handling issue**: The parameterized query might be interpreting the backtick as a string terminator
2. **PostgreSQL parameter limit**: Unlikely, but possible
3. **String escaping issue**: The code contains backticks that need special handling

## Immediate Next Steps

### Option 1: Use Raw SQL with Proper Escaping (RECOMMENDED)
Instead of parameterized queries, use raw SQL with proper escaping:

```javascript
const escapedJs = overlayJs.replace(/'/g, "''"); // Escape single quotes for SQL
await queryRunner.query(`
  UPDATE interaction_types
  SET js_code = '${escapedJs}'
  WHERE id = 'sdk-test-media-player';
`);
```

**Risk**: SQL injection if not properly escaped. But since we control the input, this should be safe.

### Option 2: Use TypeORM Entity Manager
Update the entity directly instead of using raw queries:

```javascript
const interactionType = await entityManager.findOne(InteractionType, { where: { id: 'sdk-test-media-player' } });
interactionType.jsCode = overlayJs;
await entityManager.save(interactionType);
```

**Risk**: Requires entity to be loaded, might have issues with large text fields.

### Option 3: Use PostgreSQL COPY or Large Object
For very large text, PostgreSQL has special handling. But 18KB shouldn't require this.

### Option 4: Split the Update
Update `js_code` separately from other fields to isolate the issue.

## Testing Plan

1. **Try Option 1** (raw SQL with escaping)
2. **Verify storage** using `check-stored-code.js`
3. **Test in frontend** - "Test Code" button should pass
4. **Verify preview** - All buttons should appear

## Files to Modify

- `Upora/backend/scripts/update-sdk-test-media-player-code-direct.js`
  - Change query method to use raw SQL with proper escaping
  - Or use Entity Manager approach

## Verification Commands

```bash
# Check what's stored
docker compose exec -T backend node /app/scripts/check-stored-code.js

# Run update script
docker compose exec -T backend node /app/scripts/update-sdk-test-media-player-code-direct.js

# Test in frontend
# Go to Interaction Builder → SDK Test - Media Player → Test Code
```


