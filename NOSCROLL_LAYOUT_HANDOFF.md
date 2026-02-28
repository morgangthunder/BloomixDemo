# No-Scroll Interaction Layout — Handoff Context

## Current Version: Frontend 0.8.18, Backend 0.8.18

## Problem Summary

The **Image Explorer** interaction (id: `process-explorer`) uses **noScroll mode** (`iframeConfig.noScroll: true`), meaning all content must fit within the lesson-view panel without scrolling. The goal is: **content either fits entirely, or the "Interaction does not fit this window size" error overlay appears**. No partial/clipped content should ever be visible.

### What's Broken (as of v0.8.18)

1. **Iframe height not constrained to container** — The iframe reports `window.innerHeight = 600` inside itself, but the actual lesson-view content area is only ~338px on mobile. CSS flex chains with Angular's ViewEncapsulation.Emulated don't reliably propagate height constraints to the iframe. The v0.8.18 fix sets **explicit pixel dimensions** on the iframe from the ResizeObserver (`noScrollWidth`/`noScrollHeight`), but this needs testing.

2. **Overflow detection message routing** — The iframe's `checkContentOverflow()` sends `ai-sdk-content-overflow` via `window.parent.postMessage()`. The `InteractionAIBridgeService` catches all `ai-sdk-*` messages. In v0.8.18, the AIBridge now dispatches a `CustomEvent('ai-sdk-content-overflow')` on `document`, which the lesson-view listens for. The frontend container was restarted to pick up this change. **This chain needs verification.**

3. **Intro content still too tall on small mobile viewports** — Even with shortened text and responsive CSS, the intro screen (icon + title + description + hint + button) may overflow on very small screens.

4. **Mobile vs Desktop images** — Dual-viewport image generation (16:9 desktop, 9:16 mobile) is implemented but mobile images may not display correctly in all viewport configurations.

---

## Architecture: How NoScroll Mode Works

### Interaction Config
Stored in `interaction_types.iframe_config` (JSONB):
```json
{"noScroll": true, "minWidth": 320, "minHeight": 280}
```

### Lesson-View Component
File: `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Key properties:**
- `noScrollTooSmall: boolean` — true when content doesn't fit
- `noScrollChecked: boolean` — true after first overflow check received
- `noScrollWidth: number` — container width from ResizeObserver (pixels)
- `noScrollHeight: number` — container height from ResizeObserver (pixels)

**Method: `isNoScrollInteraction()`** — checks `interactionBuild?.iframeConfig?.noScroll`

**ResizeObserver** (line ~8215): Observes `#contentArea`, stores `noScrollWidth`/`noScrollHeight`, sends dimensions to iframe via `sendContainerDimensions()`.

**Iframe sizing** (line ~274): For noScroll, iframe gets explicit pixel dimensions:
```
width: {noScrollWidth}px; height: {noScrollHeight}px; border: none; display: block;
```
Plus `visibility: hidden` until `noScrollChecked && !noScrollTooSmall`.

**Overflow handler** (line ~1431): Listens for `document` CustomEvent `ai-sdk-content-overflow`. Compares content natural height (`detail.scrollHeight`) against `this.noScrollHeight` (container). Sets `noScrollTooSmall = true` if overflow detected.

**"Does not fit" overlay** (line ~250-260): Shows when `isNoScrollInteraction() && noScrollTooSmall`.

### Message Flow for Overflow Detection
```
Iframe JS (checkContentOverflow)
  → window.parent.postMessage({ type: 'ai-sdk-content-overflow', ... })
  → InteractionAIBridgeService (window message listener, line 585)
  → document.dispatchEvent(new CustomEvent('ai-sdk-content-overflow', { detail }))
  → LessonViewComponent (document event listener, line 1431)
  → Compares detail.scrollHeight against this.noScrollHeight
  → Sets noScrollTooSmall = true/false
```

### Interaction JS (checkContentOverflow)
File: `Upora/backend/scripts/process-explorer-full-code.js` (line ~148)

Temporarily unlocks `#app` height constraints to measure natural content height:
```javascript
function checkContentOverflow() {
  var doCheck = function () {
    var app = document.getElementById('app');
    app.style.height = "auto";
    app.style.overflow = "visible";
    var naturalH = app.scrollHeight;
    app.style.height = "";
    app.style.overflow = "";
    var overflows = naturalH > window.innerHeight + 2;
    window.parent.postMessage({
      type: "ai-sdk-content-overflow",
      overflow: overflows,
      scrollHeight: naturalH,
      viewportHeight: window.innerHeight
    }, "*");
  };
  requestAnimationFrame(function () {
    doCheck();
    setTimeout(doCheck, 200);
  });
}
```

Called after `init()` shows the intro section.

---

## Key Files

| File | Purpose |
|------|---------|
| `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts` | Main lesson viewer, noScroll layout, iframe sizing, overflow handling |
| `Upora/frontend/src/app/core/services/interaction-ai-bridge.service.ts` | Routes `ai-sdk-*` postMessages, dispatches `ai-sdk-content-overflow` CustomEvent (line 585) |
| `Upora/backend/scripts/process-explorer-full-code.js` | Image Explorer interaction JS (runs inside iframe) |
| `Upora/backend/scripts/update-process-explorer-db.js` | Generates SQL patch from JS/HTML/CSS → `docker/postgres/patch-pe-full-update.sql` |
| `Upora/backend/src/services/image-generator.service.ts` | Gemini API image generation, dual-viewport, aspect ratio mapping |

---

## Image Generation: Dual Viewport

### How it works
File: `Upora/backend/src/services/image-generator.service.ts`

When `dualViewport: true` in the image generation request:
1. **Desktop image**: Generated with aspect ratio mapped from requested dimensions (typically 16:9)
2. **Mobile image**: Generated with 9:16 aspect ratio, prompt adapted ("wide landscape" → "tall portrait", "left-to-right" → "top-to-bottom")
3. Both images stored in `generated_images` table, linked via `pairedImageId`

### Aspect Ratio Mapping
Maps requested `width`/`height` to closest Gemini-supported ratio:
```
21:9, 16:9, 3:2, 5:4, 4:3, 1:1, 4:5, 3:4, 2:3, 9:16
```
Uses `generationConfig.imageConfig.aspectRatio` parameter.

### Image Selection in Interaction
File: `process-explorer-full-code.js`

The interaction receives `parentIsMobile` flag from container-dimensions message:
```javascript
var useMobile = parentIsMobile && mobileResponse;
var active = useMobile ? mobileResponse : desktopResponse;
```
Uses 9:16 image when `parentIsMobile` is true, 16:9 otherwise.

---

## CSS for Interaction (inside iframe)
File: `update-process-explorer-db.js` (cssCode variable)

Key rules:
- `body { overflow: hidden; height: 100vh; }` — constrains body
- `#app { display: flex; flex-direction: column; height: 100vh; }` — flex layout
- `#intro-section { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; overflow: hidden; }` — clips content if too tall
- Responsive breakpoints at `max-height: 400px` and `max-height: 300px` for small viewports

---

## How to Update the Interaction Code

1. Edit `Upora/backend/scripts/process-explorer-full-code.js` (JS logic) and/or `Upora/backend/scripts/update-process-explorer-db.js` (HTML/CSS/config)
2. Run: `node Upora/backend/scripts/update-process-explorer-db.js`
3. Copy to container: `docker cp docker/postgres/patch-pe-full-update.sql upora-postgres:/tmp/patch-pe-full-update.sql`
4. Apply: `docker exec upora-postgres psql -U upora_user -d upora_dev -f /tmp/patch-pe-full-update.sql`
5. No backend restart needed for DB-only changes (reads live from DB)

---

## What Needs Fixing / Verifying

### Priority 1: Iframe sizing
The v0.8.18 approach sets explicit pixel dimensions (`width: 330px; height: 338px`) on the iframe from `noScrollWidth`/`noScrollHeight` (ResizeObserver). This SHOULD fix the `viewportH=600` problem. **Needs testing after hard refresh.**

If the iframe is correctly sized (e.g., 338px height), then:
- Content that fits 338px → shows normally
- Content taller than 338px → overflow check fires → "does not fit" overlay shows

### Priority 2: Overflow detection chain
Verify the full chain works:
1. Iframe sends `ai-sdk-content-overflow` via postMessage
2. AIBridge (line 585) catches it and dispatches CustomEvent
3. LessonView (line 1431) receives CustomEvent
4. Parent compares `detail.scrollHeight` (natural content height) against `this.noScrollHeight` (container)

Console should show:
- `[AIBridge] Content overflow report: ...` (NOT "Unknown message type")
- `[LessonView] Overflow check: contentH=... containerH=... overflows=...`

If you still see `[AIBridge] Unknown message type: ai-sdk-content-overflow`, the frontend needs a full restart: `docker restart upora-frontend` followed by hard refresh (Ctrl+Shift+R).

### Priority 3: Intro content sizing
If overflow detection works, the intro screen on very small mobile viewports will show "does not fit". To fix this:
- Make the intro content even more compact OR
- Allow the intro to scroll (change `#intro-section overflow: hidden` to `overflow-y: auto`) as an exception to the noScroll rule for non-interactive content

### Priority 4: Mobile image display
Verify that when `parentIsMobile: true` is sent, the 9:16 mobile image is selected. Check the image-viewer sizing adapts to portrait orientation.

---

## Debugging Tips

1. **Check iframe actual height**: In browser DevTools, inspect the iframe element and check its computed height. Should match `noScrollHeight`.
2. **Check container dimensions**: Console will log `[LessonView] NoScroll container resize: WxH`
3. **Check overflow detection**: Console should log `[AIBridge] Content overflow report:` and `[LessonView] Overflow check:`
4. **Force frontend rebuild**: `docker restart upora-frontend` then hard refresh
5. **Reapply DB patch**: See "How to Update the Interaction Code" above

---

## Version History (Recent)
- **0.8.13**: Compact intro CSS, fix onboarding redirect from profile
- **0.8.14**: Responsive intro + overflow detection (initial attempt)
- **0.8.15**: Fix overflow detection: unlock height constraints before measuring
- **0.8.16**: Fix iframe sizing + message routing (AIBridge dispatch)
- **0.8.17**: (skipped)
- **0.8.18**: Explicit pixel iframe sizing from ResizeObserver + parent-side overflow comparison
