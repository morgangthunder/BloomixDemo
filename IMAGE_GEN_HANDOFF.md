# Image Generation Handoff — Text Fallback + Smart Personalisation Selection

## What to implement

### 1. On 3rd failed text detection: fall back to existing text-free images

**Current behaviour (backend 0.8.46):**
- After generating an image, `detectTextInImage()` checks for text using Gemini vision
- If text is detected on attempts 1 or 2, generation retries
- On attempt 3 (final), text detection is **skipped** and the image is accepted as-is

**Desired behaviour:**
- On attempt 3, still run text detection
- If text is still present, **do not accept the image**
- Instead, fall back to any existing cached image for the same interaction/lesson that has previously passed text detection
- Prefer images styled to one of the user's personalisation themes (TV/movies)
- If no personalisation-matching image exists, use any available cached image for the interaction
- If no cached images exist at all, then accept the 3rd attempt as a last resort

**This only applies to non-test mode.** In test mode (where user manually types a movie/TV show), the current behaviour of accepting the 3rd attempt should remain.

### 2. Let the LLM choose the best TV show/movie for the content theme

**Current behaviour:**
- In non-test mode (`generateFromPersonalisation()`), the interaction looks for cached images or falls back to a random theme from a hardcoded list
- The `getPersonalisationTags()` method returns all user prefs as `tv:breaking-bad`, `hobby:cooking`, etc.
- But the image generation doesn't intelligently pick which show/movie best matches the lesson content

**Desired behaviour:**
- When generating a fresh image in non-test mode, pass ALL of the user's TV/movie preferences to the LLM
- Ask the LLM to choose the one that best fits the content theme/item list
- Example: if lesson is about chemistry and user likes "Breaking Bad" and "The Simpsons", the LLM should pick "Breaking Bad"
- The chosen show/movie should then be used as the `styleName` / `userInput` for image generation

**This only applies to non-test mode.** Test mode should continue using the manually-entered movie/TV show.

---

## Key files

### Backend image generation service
**`Upora/backend/src/services/image-generator.service.ts`**

- `generateImage()` (line ~163): Main generation method with cache lookup, API call, text detection retry loop
- Text detection retry loop (line ~637): Currently `if (imageData && attempt < MAX_RETRIES)` — needs to also run on final attempt with fallback logic
- `detectTextInImage()` (line ~1437): Sends image to Gemini vision, returns `{hasText: true/false}`
- `findImagePairsByInterest()` (line ~1155): Searches cached images by interest tags or dictionary labels
- `buildImagePairResponse()` (line ~1209): Builds desktop+mobile pair response from DB
- Dual-viewport mobile generation (line ~805): After desktop generation, generates mobile variant with `dualViewport: false`

### Content cache service
**`Upora/backend/src/services/content-cache.service.ts`**

- `getPersonalisationTags()` (line ~47): Returns sorted tags like `["tv:breaking-bad", "hobby:cooking", "learn:science"]`
- `computeImageHash()` (line ~77): Deterministic hash for cache dedup
- `findCachedImage()`: Cache lookup by param hash
- `findImageByDictionaryLabel()`: Lookup by simple word label

### Interaction JS (runs inside iframe)
**`Upora/backend/scripts/process-explorer-full-code.js`**

- `isTestMode` (line ~124): Boolean, set from `config.testMode !== false` (defaults true)
- `generateFromPersonalisation()` (line ~418): Non-test-mode flow — looks for cached pairs, falls back to random theme
- `buildImageRequest(styleName)` (line ~588): Constructs the prompt with game-context framing
- `generateWithTheme(theme)` (line ~668): Calls `aiSDK.generateImage()` with the constructed request
- `onImageResponse(response)` (line ~726): Handles generation result, sets desktop/mobile responses
- `useCachedImagePair(pair)` (line ~463): Loads a cached desktop+mobile pair
- `useCachedImage(imageRecord)` (line ~503): Loads a single cached image (no mobile variant)

### Generated image entity (DB schema)
**`Upora/backend/src/entities/generated-image.entity.ts`**

Key columns:
- `id` (uuid PK)
- `lessonId`, `accountId`, `interactionId`, `substageId` (uuid FKs)
- `imageUrl` (text — MinIO/S3 path)
- `paramHash` (varchar 64 — SHA-256 for cache dedup)
- `personalisationTags` (text[] — e.g. `["tv:breaking-bad"]`)
- `dictionaryLabels` (text[] — e.g. `["photosynthesis"]`)
- `componentMap` (jsonb — labelled regions for the quiz game)
- `pairedImageId` (uuid — links desktop ↔ mobile variant)
- `userInput` (varchar — the TV show/movie used, e.g. "Breaking Bad")
- `width`, `height` (int — actual pixel dimensions)

### SQL patch generator
**`Upora/backend/scripts/update-process-explorer-db.js`**

- Reads `process-explorer-full-code.js` and generates SQL to update the `interaction_types` table
- Run: `node Upora/backend/scripts/update-process-explorer-db.js`
- Apply: `Get-Content docker/postgres/patch-pe-full-update.sql | docker exec -i upora-postgres psql -U upora_user -d upora_dev`

### Version files (bump on every change)
- `Upora/backend/package.json` — `"version"` field (currently `"0.8.46"`)
- `Upora/backend/src/main.ts` — `BACKEND_VERSION` fallback string (line ~12)
- `Upora/frontend/package.json` — `"version"` field (currently `"0.8.52"`)
- `Upora/frontend/src/main.ts` — `FRONTEND_VERSION` const (line ~427)

---

## Current prompt strategy

The prompts use **game-context reasoning** (not just prohibitions) to explain WHY:
- **No text**: "This is for a visual matching game — any text gives away answers and breaks the game"
- **No margins**: "The game runs on screens with very limited space — margins waste precious screen area"

A `systemInstruction` is set on every Gemini API call reinforcing both rules.

The interaction JS formats content concepts as plain comma-separated names (no numbering) and calls them "scenes" / "painted regions" rather than "steps" to avoid triggering caption generation.

---

## Implementation approach for task 1 (text fallback)

Modify the text detection block at line ~637 of `image-generator.service.ts`:

```
Current: if (imageData && attempt < MAX_RETRIES) { ... detect ... if text → continue }
Needed:  if (imageData) { ... detect ... if text && attempt < MAX_RETRIES → continue
                                          if text && attempt === MAX_RETRIES → fallback to cached }
```

The fallback should:
1. Query `generated_images` for the same `lessonId` + `interactionId` (or `dictionaryLabels`)
2. Prefer images whose `personalisationTags` overlap with the current user's tags
3. Accept any image that exists as a last resort
4. If absolutely nothing cached, accept the text-containing image

Need a way to know if we're in test mode at the service level. Options:
- Add a `testMode?: boolean` field to `ImageGenerationRequest`
- The interaction JS already sets `isTestMode` — pass it through to the API call

## Implementation approach for task 2 (smart personalisation selection)

This is a two-part change:

**Part A — Backend**: Add an endpoint or modify the generation flow to accept a list of user preferences + the content item list, and use an LLM call to select the best match. Could be:
- A new method `selectBestTheme(preferences: string[], contentItems: string[]): Promise<string>` that calls Gemini with a text-only prompt
- Returns the chosen theme name to use as `styleName`

**Part B — Interaction JS** (`process-explorer-full-code.js`): In `generateFromPersonalisation()`:
- Fetch user's personalisation data (TV/movies list) via `aiSDK`
- Pass the full list + the `steps` array to the backend
- Use the LLM-selected best theme for generation

---

## Docker commands

```powershell
# Restart backend after code changes
docker restart upora-backend

# Restart frontend after code changes  
docker restart upora-frontend

# Apply SQL patch to DB
Get-Content docker/postgres/patch-pe-full-update.sql | docker exec -i upora-postgres psql -U upora_user -d upora_dev

# Generate SQL patch from JS code
node Upora/backend/scripts/update-process-explorer-db.js
```

## Important rules
- Always bump frontend AND backend versions and output to console
- Use `docker restart` (not `docker compose restart`)
- PowerShell doesn't support `&&` — use `;` to chain commands
- PowerShell doesn't support `<` redirection — use `Get-Content ... | docker exec -i ...`
- After changing `process-explorer-full-code.js`, must regenerate SQL patch and apply to DB
- The frontend runs in a Docker container with Vite dev server — restarts pick up file changes
