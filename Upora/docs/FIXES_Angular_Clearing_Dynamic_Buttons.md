# Fix: Angular Clearing Dynamically Added Buttons in Interaction Overlays

## Problem
When interactions inject JavaScript that dynamically creates buttons or other DOM elements (via `appendChild`, `innerHTML`, etc.), Angular's change detection cycle can re-render the `[innerHTML]` binding, clearing all dynamically added elements and their event handlers.

## Symptoms
- JavaScript executes successfully (console logs show "All buttons created")
- Buttons appear briefly then disappear
- Buttons appear but don't work when clicked (no onclick handlers)
- Status text shows "Initializing..." but never updates
- Elements are created but Angular clears them on next change detection cycle

## Root Cause
Angular's `[innerHTML]` binding re-evaluates `getSanitizedSectionHtml()` on every change detection cycle. When the function returns a new sanitized HTML string, Angular replaces the entire innerHTML, clearing any dynamically added elements AND their JavaScript event handlers (like `onclick`).

## Solution

### 1. Cache Sanitized HTML (CRITICAL - Preserves onclick Handlers)
**IMPORTANT:** When preventing re-rendering, we must cache the sanitized HTML result, NOT return `innerHTML`. Returning `innerHTML` loses `onclick` handlers because they're JavaScript properties, not HTML attributes.

Add a cache property:
```typescript
// Cache for sanitized section HTML to prevent re-rendering after initialization
private cachedVideoUrlSectionHtml: any = null;
```

### 2. Mark Section as Initialized Immediately
When injecting scripts, cache the sanitized HTML and mark the innerHTML div as initialized BEFORE Angular's next change detection cycle:

```typescript
// In injectVideoUrlSectionJs() or similar method
script.textContent = jsCode;
sectionContainer.appendChild(script);

// Cache the sanitized HTML BEFORE marking as initialized
const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
if (innerHtmlDiv && !this.cachedVideoUrlSectionHtml) {
  // Get the original HTML/CSS to cache
  const originalHtml = this.videoUrlPlayerData?.sectionHtml || '';
  const originalCss = this.videoUrlPlayerData?.sectionCss || '';
  const fullHtml = originalCss ? `<style>${originalCss}</style>${originalHtml || ''}` : (originalHtml || '');
  this.cachedVideoUrlSectionHtml = this.sanitizer.bypassSecurityTrustHtml(fullHtml);
  console.log('[LessonView] ✅ Cached sanitized section HTML');
}

// Immediately mark section as initialized
if (innerHtmlDiv) {
  (innerHtmlDiv as any).__initialized = true;
  console.log('[LessonView] ✅ Section marked as initialized immediately');
}
```

### 3. Prevent Re-rendering in getSanitizedSectionHtml()
Check if section is initialized and return **cached HTML** (NOT innerHTML) to prevent re-rendering:

```typescript
getSanitizedSectionHtml(html?: string, css?: string): any {
  if (!html && !css) {
    return '';
  }
  const fullHtml = css ? `<style>${css}</style>${html || ''}` : (html || '');
  
  // Check if this section has been initialized (buttons created) - if so, return cached HTML
  const sectionContainer = this.videoUrlSectionContainerRef?.nativeElement;
  if (sectionContainer) {
    const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
    if (innerHtmlDiv && (innerHtmlDiv as any).__initialized) {
      // Section already initialized, return cached HTML to prevent re-rendering
      // CRITICAL: Use cached HTML, NOT innerHTML (which loses onclick handlers)
      if (this.cachedVideoUrlSectionHtml) {
        console.log('[LessonView] 🔒 Preventing re-render of initialized section (using cache)');
        return this.cachedVideoUrlSectionHtml;
      }
    }
  }
  
  // Cache the sanitized HTML on first call
  const sanitized = this.sanitizer.bypassSecurityTrustHtml(fullHtml);
  if (sectionContainer) {
    const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
    if (innerHtmlDiv && !(innerHtmlDiv as any).__initialized) {
      // Only cache if not yet initialized (to avoid caching stale HTML)
      this.cachedVideoUrlSectionHtml = sanitized;
    }
  }
  
  return sanitized;
}
```

### 4. Clear Cache When Loading New Data
Clear the cache when loading new interaction data to allow re-initialization:

```typescript
// In loadVideoUrlPlayerData() or similar method
this.isLoadingInteraction = false;

// Clear cached HTML when loading new video URL data (to allow re-initialization)
this.cachedVideoUrlSectionHtml = null;

// Also clear when setting videoUrlPlayerData to null
this.videoUrlPlayerData = null;
this.cachedVideoUrlSectionHtml = null;
```

### 5. Use MutationObserver (Optional but Recommended)
Use MutationObserver to detect when buttons are added and ensure section stays initialized:

```typescript
// After injecting scripts
const buttonsContainer = document.getElementById('sdk-test-buttons');
if (buttonsContainer) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        console.log('[LessonView] ✅ Buttons detected being added:', mutation.addedNodes.length);
        // Ensure the section stays initialized
        if (innerHtmlDiv) {
          (innerHtmlDiv as any).__initialized = true;
        }
      }
    });
  });
  
  observer.observe(buttonsContainer, { childList: true, subtree: true });
  
  // Disconnect after a delay
  setTimeout(() => {
    if (buttonsContainer.children.length > 0) {
      console.log('[LessonView] ✅ Buttons found after injection:', buttonsContainer.children.length);
      // Verify buttons have onclick handlers
      const firstButton = buttonsContainer.querySelector('.test-button');
      if (firstButton && firstButton.onclick) {
        console.log('[LessonView] ✅ Buttons have onclick handlers attached');
      } else {
        console.warn('[LessonView] ⚠️ Buttons missing onclick handlers - may have been cleared');
      }
    }
    observer.disconnect();
  }, 2000);
}
```

## When to Apply This Fix
Apply this fix whenever:
- An interaction type injects JavaScript that dynamically creates DOM elements
- The interaction uses `[innerHTML]` binding for section content
- Elements are created via `appendChild`, `innerHTML`, or similar DOM manipulation
- Elements appear briefly then disappear
- **Buttons appear but don't work when clicked (missing onclick handlers)**

## Affected Interaction Types
- `video-url` interactions with section content
- `uploaded-media` interactions with section content
- Any interaction type that injects JavaScript creating dynamic buttons/overlays

## Files Modified
- `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`
  - `injectVideoUrlSectionJs()` method
  - `getSanitizedSectionHtml()` method
  - `loadVideoUrlPlayerData()` method (clear cache)

## Version
- Frontend: 0.1.104
- Date: 2025-12-19
- Updated: 2025-12-19 (Added custom event listener for video-url SDK messages)

## Additional Notes

### Why Caching is Critical
When preventing re-rendering, **DO NOT** return `innerHtmlDiv.innerHTML`. This loses `onclick` handlers because:
- `onclick` handlers are JavaScript properties, not HTML attributes
- `innerHTML` only returns HTML markup, not JavaScript properties
- Returning `innerHTML` creates new DOM elements without the original event handlers

Instead, cache the sanitized HTML result (`bypassSecurityTrustHtml`) and return that cached value. This preserves the original HTML structure while preventing Angular from re-evaluating and re-rendering.

### Testing Checklist
After applying this fix, verify:
1. ✅ Buttons appear and persist (don't disappear)
2. ✅ Buttons have `onclick` handlers (`button.onclick !== null`)
3. ✅ Buttons work when clicked (status text updates, actions execute)
4. ✅ Status text shows "SDK Ready!" or similar (not stuck on "Initializing...")
5. ✅ Console shows "Preventing re-render of initialized section (using cache)" when navigating

### Common Mistakes
- ❌ Returning `innerHtmlDiv.innerHTML` - loses onclick handlers
- ✅ Returning cached `cachedVideoUrlSectionHtml` - preserves handlers
- ❌ Forgetting to clear cache when loading new data - causes stale HTML
- ✅ Clearing cache in `loadVideoUrlPlayerData()` and when setting `videoUrlPlayerData = null`
