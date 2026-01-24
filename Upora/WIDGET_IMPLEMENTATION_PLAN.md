# Widget Implementation Plan

## Overview
Enable widgets (Image Carousel and Timer) to appear in HTML interactions by default when enabled in the Interaction Builder. Widgets should:
- Appear in collapsible sections by default (bottom center for carousel, bottom-right for timer)
- Be configurable via the Widgets tab in Interaction Builder
- Have minimal code injected into Code tab sections (HTML/CSS/JS) using SDK functions
- Be documented in SDK docs for programmatic control
- **Future:** Extend to all interaction categories (PixiJS, iframe, uploaded-media, video-url)
- **Future:** Create extensible system for adding new widgets
- **Future:** Create developer guide for creating custom widgets (if not already exists)

## Architecture Overview

### Current State
- Widget registry exists in backend (`getWidgetRegistry()`)
- Widget configuration UI exists in Interaction Builder (Widgets tab)
- Widget configurations are stored in `interaction.config.widgetConfigs`
- Widget instances are stored in `interaction.widgets.instances`

### Target State
- When widgets are enabled, their code (HTML/CSS/JS) is injected into Code tab sections
- Widget code is visible/editable in code fields
- When interaction runs in lesson view, widgets render in collapsible sections
- SDK docs explain widget behavior and programmatic control

---

## Phase 1: Backend - Widget Code Generation (Minimal Code)

**Note:** This phase generates **minimal** code that leverages SDK/widget functions. The actual widget rendering logic should be in the SDK/widget library, not in the generated code.

### 1.1 Add Widget Code Generation Methods
**File:** `Upora/backend/src/modules/interaction-types/interaction-types.service.ts`

**Methods to add:**
- `generateWidgetHTML(widgetId: string, config: any): string` - Returns minimal HTML placeholder
- `generateWidgetCSS(widgetId: string, config: any): string` - Returns minimal CSS (only if absolutely necessary)
- `generateWidgetJS(widgetId: string, config: any): string` - Returns minimal initialization code

**Implementation details:**
- **Image Carousel:**
  - HTML: Minimal placeholder div (e.g., `<div id="widget-carousel"></div>`)
  - CSS: Minimal or empty (widget SDK handles styling)
  - JS: Minimal initialization (e.g., `aiSDK.initImageCarousel(config)` or widget-specific SDK call)
  
- **Timer:**
  - HTML: Minimal placeholder div (e.g., `<div id="widget-timer"></div>`)
  - CSS: Minimal or empty (widget SDK handles styling)
  - JS: Minimal initialization (e.g., `aiSDK.initTimer(config)` or widget-specific SDK call)

**Code structure:**
- Generated code should be minimal - just enough to initialize the widget
- Actual widget rendering (HTML structure, styling, functionality) should be handled by widget SDK/library functions
- Configuration is passed to SDK functions, which handle widget creation and rendering

---

## Phase 2: Frontend - Widget Code Injection in Interaction Builder

**Key Principle:** Minimal code injection - widgets should leverage SDK functions to minimize code in Code tabs.

### 2.1 Update `toggleWidget()` Method
**File:** `Upora/frontend/src/app/features/interaction-builder/interaction-builder.component.ts`

**Changes:**
- When widget is enabled, inject minimal initialization code that uses SDK/widget functions
- Code should be minimal - just enough to initialize the widget using SDK methods
- When widget is disabled, remove the minimal widget code

**Implementation:**
1. Add method: `injectWidgetCode(widgetId: string, config: any): Promise<void>`
   - Calls backend API: `POST /api/interaction-types/widgets/generate-code` to get minimal initialization code
   - Injects minimal code (e.g., `aiSDK.initWidget('image-carousel', config)`) into JavaScript tab
   - May add minimal HTML placeholder if needed (e.g., `<div id="widget-carousel"></div>`)
   - Adds minimal CSS if needed (most styling handled by widget SDK)
   - Marks interaction as changed

2. Add method: `removeWidgetCode(widgetId: string): Promise<void>`
   - Removes minimal widget code from HTML/CSS/JS sections
   - Uses markers/comments to identify widget code blocks

3. Modify `toggleWidget()`:
   - If enabling: call `injectWidgetCode()` to add minimal initialization code
   - If disabling: call `removeWidgetCode()` to remove initialization code

### 2.2 Add Backend API Endpoint
**File:** `Upora/backend/src/modules/interaction-types/interaction-types.controller.ts`

**Endpoint:**
```
POST /api/interaction-types/widgets/generate-code
Body: { widgetId: string, config: any }
Response: { html: string, css: string, js: string }
```

**Implementation:**
- Returns **minimal** code:
  - **HTML:** Minimal placeholder div (e.g., `<div id="widget-carousel"></div>`)
  - **CSS:** Minimal styling only if absolutely necessary (most styling handled by widget SDK)
  - **JS:** Minimal initialization call (e.g., `aiSDK.initWidget('image-carousel', config)` or widget-specific SDK methods)
- Code should leverage SDK functions, not contain full widget implementation

### 2.3 Widget Code Markers
**Approach:**
- Use HTML comments to mark widget code blocks: `<!-- WIDGET:image-carousel:START -->` ... `<!-- WIDGET:image-carousel:END -->`
- This allows identification and removal of widget code when disabled
- Code between markers is minimal - just initialization calls to SDK/widget functions

---

## Phase 3: Frontend - Widget Rendering in Lesson View

**Note:** `createInteractionBlobUrl()` creates the blob URL for the **entire interaction** (not just widgets). It assembles the complete HTML document from `interactionBuild` (HTML/CSS/JS), which may include widget initialization code from Phase 2.

### 3.1 Implement `createInteractionBlobUrl()` Method
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Current state:** Method is called but not defined

**Implementation:**
- Method signature: `createInteractionBlobUrl(interactionBuild: any, sampleData?: any): SafeResourceUrl`
- Creates blob URL from HTML document containing the **entire interaction**:
  - HTML code from `interactionBuild.htmlCode` (includes widget placeholders if widgets enabled)
  - CSS code from `interactionBuild.cssCode` (in `<style>` tag)
  - JavaScript code from `interactionBuild.jsCode` (includes widget initialization calls if widgets enabled)
  - Sample data injection: `window.interactionData` and `window.interactionConfig`
  - Widget configurations are included in `window.interactionConfig.widgetConfigs`
- Uses `URL.createObjectURL()` with `Blob` containing HTML document
- Returns `SafeResourceUrl` for use in iframe `[src]`
- Widget rendering happens at runtime via SDK/widget functions called from the injected minimal code

**Code structure:**
```typescript
private createInteractionBlobUrl(interactionBuild: any, sampleData?: any): SafeResourceUrl {
  const htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${interactionBuild.cssCode || ''}</style>
    </head>
    <body>
      ${interactionBuild.htmlCode || ''}
      <script>
        // Inject data
        window.interactionData = ${JSON.stringify(sampleData || {})};
        window.interactionConfig = ${JSON.stringify(interactionBuild.config || {})};
        
        // Inject JavaScript code (includes minimal widget initialization if widgets enabled)
        ${interactionBuild.jsCode || ''}
      </script>
    </body>
    </html>
  `;
  
  const blob = new Blob([htmlDoc], { type: 'text/html' });
  return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
}
```

### 3.2 Update `loadPixiJSHTMLIframeInteraction()` Method
**File:** `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

**Changes:**
- Call `createInteractionBlobUrl()` with `interactionBuild` and `sampleData`
- Assign result to `this.interactionBlobUrl`
- Ensure widget configurations are included in `interactionConfig`

---

## Phase 4: Widget SDK Implementation

**Note:** Widget rendering logic (HTML structure, CSS, functionality) should be implemented in the widget SDK/library, not in generated code. The SDK should provide functions like `aiSDK.initImageCarousel(config)` and `aiSDK.initTimer(config)` that handle all widget rendering.

### 4.1 Image Carousel Widget SDK

**SDK Function:** `aiSDK.initImageCarousel(config)` or similar widget SDK method

**Functionality:**
- Creates carousel HTML structure dynamically (collapsible section, image container, arrow buttons, optional HTML container)
- Applies CSS styling (positioning, collapsible behavior, carousel layout)
- Loads images via `aiSDK.getLessonImages()`
- Filters by `config.imageIds` if specified
- Handles navigation (previous/next)
- Implements autoplay if enabled
- Manages container toggle functionality

**Minimal Generated Code:**
```javascript
// WIDGET:image-carousel:START
aiSDK.initImageCarousel(window.interactionConfig.widgetConfigs['image-carousel-123'].config);
// WIDGET:image-carousel:END
```

### 4.2 Timer Widget SDK

**SDK Function:** `aiSDK.initTimer(config)` or similar widget SDK method

**Functionality:**
- Creates timer HTML structure dynamically (collapsible section, timer display, optional controls)
- Applies CSS styling (positioning, timer display)
- Implements timer logic (countdown/countup)
- Handles formatting (mm:ss, mm:ss:SSS)
- Manages completion handling (emit event, show message, none)
- Auto-starts if `startOnLoad` is true
- Hides controls if `hideControls` is true

**Minimal Generated Code:**
```javascript
// WIDGET:timer:START
aiSDK.initTimer(window.interactionConfig.widgetConfigs['timer-456'].config);
// WIDGET:timer:END
```

---

## Phase 5: SDK Documentation Updates

### 5.1 Add Widget Section to SDK Docs
**File:** `Upora/frontend/src/app/core/services/IFRAME_INTERACTION_AI_SDK.md`

**Content to add:**
1. **Widgets Overview**
   - Explanation of widget system
   - How widgets appear in interactions
   - Collapsible sections by default

2. **Widget Configuration**
   - How to configure widgets in Interaction Builder
   - Widget configuration structure
   - Accessing widget config in code: `window.interactionConfig.widgetConfigs[instanceId]`

3. **Widget Control via Code**
   - How to show/hide widgets programmatically
   - How to customize widget positioning
   - How to interact with widget APIs (e.g., carousel navigation, timer control)

4. **Image Carousel Widget**
   - How to load images: `aiSDK.getLessonImages()`
   - How to filter images by ID
   - How to control carousel (next/previous, autoplay)
   - How to use HTML container below images

5. **Timer Widget**
   - How to control timer programmatically
   - How to listen for timer completion events
   - How to customize timer display

---

## Phase 6: Testing and Refinement

### 6.1 Testing Checklist
- [ ] Enable image carousel widget in Interaction Builder
  - [ ] Widget code appears in HTML/CSS/JS tabs
  - [ ] Code is editable
  - [ ] Disabling widget removes code
  
- [ ] Enable timer widget in Interaction Builder
  - [ ] Widget code appears in HTML/CSS/JS tabs
  - [ ] Code is editable
  - [ ] Disabling widget removes code

- [ ] Preview interaction with widgets enabled
  - [ ] Widgets appear in preview
  - [ ] Widgets are collapsible
  - [ ] Widgets function correctly

- [ ] Test interaction in lesson view
  - [ ] Widgets appear correctly
  - [ ] Widgets are positioned correctly
  - [ ] Widgets function correctly
  - [ ] Widget configurations work

- [ ] Test widget code customization
  - [ ] Modifying widget code in Code tabs works
  - [ ] Customizations persist
  - [ ] Widget still functions after customization

---

## Future Extensibility

### Extending to Other Interaction Categories

**Current Scope:** Phase 1-6 focuses on HTML interactions only.

**Future Work:** Extend widget system to all interaction categories:
- **PixiJS interactions:** Widgets rendered in iframe (similar to HTML)
- **iframe interactions:** Widgets rendered in overlay/section (similar to HTML)
- **uploaded-media interactions:** Widgets rendered in overlay or section below media player
- **video-url interactions:** Widgets rendered in overlay or section below video player

**Note:** `loadPixiJSHTMLIframeInteraction()` is used for HTML, PixiJS, and iframe interactions. `uploaded-media` and `video-url` interactions use different components (`app-media-player` and `app-video-url-player`), so widget rendering for those categories will need different implementation approaches.

### Extensible Widget System

The widget system should be designed to easily add new widgets:
- Widget registry in backend (`getWidgetRegistry()`) should be extensible
- Widget code generation methods should support new widget types
- Widget SDK should support plugin-style widget additions
- Documentation should guide developers on creating custom widgets

### Developer Guide for Custom Widgets

If documentation doesn't already exist, create a developer guide covering:
- How to add new widgets to the widget registry
- Widget code generation structure and patterns
- Widget SDK integration requirements
- Widget configuration schema standards
- Testing and validation requirements

## Implementation Order

1. **Phase 1:** Backend widget code generation (Image Carousel first, then Timer) - **HTML interactions only**
2. **Phase 2:** Frontend code injection in Interaction Builder - **HTML interactions only**
3. **Phase 3:** Frontend widget rendering in lesson view - **HTML interactions only**
4. **Phase 4:** Widget SDK implementation (Image Carousel and Timer)
5. **Phase 5:** SDK documentation
6. **Phase 6:** Testing and refinement - **HTML interactions only**
7. **Future:** Extend to PixiJS, iframe, uploaded-media, video-url interaction categories
8. **Future:** Create developer guide for custom widgets (if not exists)

---

## Notes and Considerations

1. **Widget Code Markers:** Using HTML comments for markers allows builders to customize widget code while still being able to remove/re-add widgets cleanly.

2. **Configuration Access:** Widgets access configuration via `window.interactionConfig.widgetConfigs[instanceId].config`.

3. **Image Loading:** Image carousel uses `aiSDK.getLessonImages()` to load images. Filtering by `imageIds` array is handled in JavaScript.

4. **Collapsible Sections:** Widgets appear in collapsible sections by default. Builders can customize this behavior in the injected code.

5. **Positioning:** Widgets use CSS positioning based on config. Default: carousel (bottom center), timer (bottom-right).

6. **SDK Integration:** Widgets use `aiSDK` for image loading (carousel) and events (timer completion).

7. **Code Injection:** Code is appended to existing code, not replaced. Builders can add their own code alongside widget code.

8. **Preview:** Preview in Interaction Builder should show widgets when enabled.

---

## Additional Implementation Notes

1. **Widget SDK Location:** Widget rendering logic (HTML structure, CSS, functionality) needs to be implemented in the widget SDK/library (likely in `interaction-ai-bridge.service.ts` or a new widget SDK service). This is separate from the minimal code generation in Phase 1.

2. **Code Injection Location:** Widget code should be injected at the end of Code tab sections to avoid conflicts with user code.

3. **SDK Initialization:** Widget code assumes SDK is already available (SDK initialization happens separately, as seen in `createIframeAISDK()`).

4. **Code Formatting:** Generated code should be formatted for readability so builders can understand and customize if needed.

5. **Configuration Updates:** When widget configuration changes, the minimal initialization code may need to be regenerated to update the config reference. Alternatively, the widget SDK could read config directly from `window.interactionConfig.widgetConfigs` at runtime.

6. **Widget SDK Methods:** The widget SDK needs methods like:
   - `aiSDK.initImageCarousel(config)` - Initializes and renders image carousel widget
   - `aiSDK.initTimer(config)` - Initializes and renders timer widget
   - These methods handle all HTML creation, CSS application, and functionality
