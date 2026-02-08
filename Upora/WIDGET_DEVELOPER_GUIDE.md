# Widget Developer Guide

This guide explains how to create new widgets for HTML, PixiJS, and iframe interactions in the Upora platform.

## Table of Contents

1. [Overview](#overview)
2. [Widget Architecture](#widget-architecture)
3. [Creating a New Widget](#creating-a-new-widget)
4. [Widget Configuration Structure](#widget-configuration-structure)
5. [Adding Widget to Lesson Builder Config Modal](#adding-widget-to-lesson-builder-config-modal)
6. [SDK Implementation](#sdk-implementation)
7. [Testing Your Widget](#testing-your-widget)
8. [Best Practices](#best-practices)

---

## Overview

Widgets are reusable UI components that can be added to interactions by interaction builders. They appear in collapsible sections by default, but can be positioned anywhere in the interaction code if needed.

**Key Concepts:**
- Widgets are **enabled** in the Interaction Builder (per interaction type)
- Widgets are **configured** in the Lesson Builder (per lesson instance)
- Widget implementation lives in the **SDK** (injected automatically into interactions)
- Widget configuration is passed via `window.interactionConfig.widgetConfigs`

---

## Widget Architecture

### Component Structure

```
┌─────────────────────────────────────────┐
│  Interaction Builder                    │
│  └─ Widget Tab                          │
│     └─ Enable/Configure Widgets         │
│        └─ Stores in:                    │
│           - interaction.widgets.instances│
│           - interaction.config.widgetConfigs │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Lesson Builder                         │
│  └─ Interaction Config Modal            │
│     └─ Widget Configuration Section     │
│        └─ Lesson-specific settings      │
│           └─ Stored in:                 │
│              - subStage.interaction.config.widgetConfigs │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Lesson View (Student Experience)       │
│  └─ SDK Injection                       │
│     └─ Widget Initialization            │
│        └─ Creates widget UI             │
│           └─ Default: Collapsible section│
│           └─ Or: Custom position (if configured) │
└─────────────────────────────────────────┘
```

### Data Flow

1. **Interaction Builder**: Enable widget → Saves to `interaction.widgets.instances` and `interaction.config.widgetConfigs`
2. **Lesson Builder**: Configure widget → Updates `subStage.interaction.config.widgetConfigs[instanceId].config`
3. **Lesson View**: SDK loads → Reads `window.interactionConfig.widgetConfigs[instanceId].config` → Initializes widget

---

## Creating a New Widget

### Step 1: Define Widget in Backend Registry

**File**: `Upora/backend/src/modules/interaction-types/interaction-types.service.ts`

Add your widget to the `getWidgetRegistry()` method:

```typescript
getWidgetRegistry(): any[] {
  return [
    // ... existing widgets ...
    {
      id: 'your-widget-id',                    // Unique widget ID (kebab-case)
      name: 'Your Widget Name',                // Display name
      description: 'What your widget does',    // Description
      interactionBuilderDefaultConfig: {       // Default config in Interaction Builder
        // Configuration defaults when widget is enabled
        position: {
          type: 'bottom',                      // 'top', 'bottom', 'left', 'right', 'fixed'
          zIndex: 1000,
          x: 0,                                // Offset from position
          y: 0
        },
        // Your widget-specific defaults
        setting1: 'default-value',
        setting2: true,
        setting3: 100
      },
      lessonBuilderDefaultConfig: {            // Default config in Lesson Builder
        // Lesson-specific defaults
        // These will be shown in the config modal
      }
    }
  ];
}
```

**Configuration Types:**
- `interactionBuilderDefaultConfig`: Settings visible/editable when building interactions (positioning, display options)
- `lessonBuilderDefaultConfig`: Settings visible/editable when building lessons (lesson-specific data like image IDs, durations)

---

### Step 2: Define Widget Configuration Schema for Lesson Builder

**File**: `Upora/frontend/src/app/shared/components/interaction-configure-modal/interaction-configure-modal.component.ts`

Add a configuration section in the widget configuration template:

```typescript
// In the template (around line 199-225)
<!-- Your Widget Configuration -->
<div *ngIf="widget.type === 'your-widget-id'" class="widget-config-fields">
  <div class="form-group">
    <label for="your-widget-setting1">Setting 1</label>
    <input
      type="text"
      id="your-widget-setting1"
      [value]="getWidgetConfig(widget.id || widget.type)?.setting1 || ''"
      (blur)="onWidgetConfigChange(widget.id || widget.type, 'setting1', ($event.target as HTMLInputElement).value)"
      placeholder="Enter setting 1..."
      class="form-input" />
    <p class="hint">Hint text explaining this setting</p>
  </div>
  
  <div class="checkbox-group">
    <label class="checkbox-label">
      <input
        type="checkbox"
        [checked]="getWidgetConfig(widget.id || widget.type)?.setting2 || false"
        (change)="onWidgetConfigChange(widget.id || widget.type, 'setting2', ($event.target as HTMLInputElement).checked)"
        class="form-checkbox" />
      <span>Enable Setting 2</span>
    </label>
  </div>
  
  <div class="form-group">
    <label for="your-widget-setting3">Setting 3 (Number)</label>
    <input
      type="number"
      id="your-widget-setting3"
      [value]="getWidgetConfig(widget.id || widget.type)?.setting3 || 100"
      (blur)="onWidgetConfigChange(widget.id || widget.type, 'setting3', parseInt(($event.target as HTMLInputElement).value) || 100)"
      min="1"
      max="1000"
      class="form-input" />
  </div>
  
  <div class="form-group">
    <label for="your-widget-setting4">Setting 4 (Select)</label>
    <select
      id="your-widget-setting4"
      [value]="getWidgetConfig(widget.id || widget.type)?.setting4 || 'option1'"
      (change)="onWidgetConfigChange(widget.id || widget.type, 'setting4', ($event.target as HTMLSelectElement).value)"
      class="form-input">
      <option value="option1">Option 1</option>
      <option value="option2">Option 2</option>
      <option value="option3">Option 3</option>
    </select>
  </div>
</div>
```

**Form Field Types:**

1. **Text Input**: `type="text"` with `(blur)` event
2. **Number Input**: `type="number"` with validation and `parseInt()`
3. **Checkbox**: `type="checkbox"` with `[checked]` and `(change)` event
4. **Select Dropdown**: `<select>` with `[value]` and `(change)` event
5. **Textarea**: `<textarea>` for multiline text

**Important:**
- Use `getWidgetConfig(widget.id || widget.type)?.settingName || defaultValue` to get current values
- Use `onWidgetConfigChange(widget.id || widget.type, 'settingName', value)` to update values
- Always provide sensible defaults in `|| defaultValue`

---

### Step 3: Implement Widget in SDK

**File**: `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`

Add widget implementation methods to the SDK in `createInteractionHtmlDoc()`:

```typescript
// In createIframeAISDK() return object (around line 6580-7200)
_initYourWidget: function(instanceId, config) {
  console.log('[Widget] Initializing your-widget-id widget:', { instanceId, config });
  
  const instance = this._widgetInstances.get(instanceId);
  if (!instance) {
    console.error('[Widget] ❌ Instance not found for', instanceId);
    return;
  }
  
  // Look for existing widget container in HTML (allows builders to position it)
  let widgetSection = document.getElementById('widget-section-' + instanceId);
  let contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
  let container = document.getElementById('widget-your-widget-' + instanceId);
  
  // If container doesn't exist in HTML, create it dynamically (default: collapsible section)
  if (!container) {
    console.log('[Widget] Container not found in HTML, creating dynamically for', instanceId);
    
    // Create collapsible widget section
    widgetSection = document.createElement('div');
    widgetSection.id = 'widget-section-' + instanceId;
    widgetSection.className = 'widget-carousel-section';
    
    // Create header with toggle button
    const header = document.createElement('div');
    header.className = 'widget-carousel-header';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'widget-carousel-toggle';
    toggleIcon.textContent = '▼';
    
    const headerTitle = document.createElement('span');
    headerTitle.textContent = '🔧 Your Widget Name';
    
    header.appendChild(toggleIcon);
    header.appendChild(headerTitle);
    
    // Create content container (collapsible)
    contentContainer = document.createElement('div');
    contentContainer.id = 'widget-carousel-content-' + instanceId;
    contentContainer.className = 'widget-carousel-content';
    
    // Create widget container
    container = document.createElement('div');
    container.id = 'widget-your-widget-' + instanceId;
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.zIndex = '1';
    
    contentContainer.appendChild(container);
    widgetSection.appendChild(header);
    widgetSection.appendChild(contentContainer);
    
    // Toggle functionality (closed by default)
    let isExpanded = false;
    contentContainer.style.display = 'none';
    toggleIcon.textContent = '▶';
    toggleIcon.style.transform = 'rotate(-90deg)';
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      contentContainer.style.display = isExpanded ? 'block' : 'none';
      toggleIcon.textContent = isExpanded ? '▼' : '▶';
      toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
    
    // Position widget section (default: bottom center if no position specified)
    widgetSection.style.position = 'fixed';
    widgetSection.style.bottom = '20px';
    widgetSection.style.left = '50%';
    widgetSection.style.transform = 'translateX(-50%)';
    widgetSection.style.zIndex = '9999';
    widgetSection.style.maxWidth = '600px';
    widgetSection.style.width = '90%';
    
    // Append to body
    document.body.appendChild(widgetSection);
  } else {
    console.log('[Widget] Using existing widget container from HTML for', instanceId);
    
    // If container exists, find the section and content container
    if (!widgetSection) {
      widgetSection = container.closest('#widget-section-' + instanceId);
    }
    if (!contentContainer) {
      contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
    }
    
    // Set up toggle functionality if header exists
    const header = widgetSection?.querySelector('.widget-carousel-header');
    if (header && contentContainer) {
      const toggleIcon = header.querySelector('.widget-carousel-toggle');
      let isExpanded = false;
      contentContainer.style.display = 'none';
      if (toggleIcon) {
        toggleIcon.textContent = '▶';
        toggleIcon.style.transform = 'rotate(-90deg)';
      }
      
      header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        contentContainer.style.display = isExpanded ? 'block' : 'none';
        if (toggleIcon) {
          toggleIcon.textContent = isExpanded ? '▼' : '▶';
          toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
        }
      });
    }
  }
  
  // Store instance data
  instance.element = container;
  instance.section = widgetSection;
  instance.config = config || {};
  
  // Initialize widget with config
  // ... your widget-specific initialization logic ...
  
  console.log('[Widget] ✅ Your widget initialized successfully');
},
```

**Add widget to `initWidget()` method:**

```typescript
initWidget: function(widgetType, instanceId, config) {
  console.log('[Widget] Initializing widget:', widgetType, instanceId);
  this._widgetInstances.set(instanceId, { type: widgetType, config, element: null });
  
  // Initialize widget based on type
  if (widgetType === 'image-carousel') {
    this._initImageCarousel(instanceId, config);
  } else if (widgetType === 'timer') {
    this._initTimer(instanceId, config);
  } else if (widgetType === 'your-widget-id') {
    this._initYourWidget(instanceId, config);  // Add your widget here
  } else {
    console.warn('[Widget] Unknown widget type:', widgetType);
  }
}
```

---

### Step 4: Generate Widget Code (Backend)

**File**: `Upora/backend/src/modules/interaction-types/interaction-types.service.ts`

Update `generateWidgetHTML()`, `generateWidgetCSS()`, and `generateWidgetJS()`:

```typescript
generateWidgetHTML(widgetId: string, config: any): string {
  const widgetIdSafe = widgetId.replace(/[^a-zA-Z0-9-]/g, '-');
  const instanceId = (config?.instanceId as string) || `${widgetIdSafe}-${Date.now()}`;
  
  switch (widgetId) {
    case 'image-carousel':
      return `<!-- WIDGET:image-carousel:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:image-carousel:END -->`;
    case 'timer':
      return `<!-- WIDGET:timer:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:timer:END -->`;
    case 'your-widget-id':
      return `<!-- WIDGET:your-widget-id:START -->\n<div id="widget-your-widget-${instanceId}"></div>\n<!-- WIDGET:your-widget-id:END -->`;
    default:
      return `<!-- WIDGET:${widgetId}:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:${widgetId}:END -->`;
  }
}

generateWidgetCSS(widgetId: string): string {
  // Minimal CSS - most styling handled by widget SDK
  return `/* WIDGET:${widgetId}:START */\n/* WIDGET:${widgetId}:END */`;
}

generateWidgetJS(widgetId: string, config: any): string {
  const instanceId = (config?.instanceId as string) || `${widgetId.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`;
  const configPath = `window.interactionConfig?.widgetConfigs?.['${instanceId}']?.config || {}`;
  
  // Use unified initWidget approach for all widgets
  const waitForSDK = `
(function() {
  console.log('[Widget] Initializing ${widgetId} widget...');
  const initWidget = () => {
    console.log('[Widget] Checking SDK ready...', {
      hasSDK: !!window.aiSDK,
      hasConfig: !!window.interactionConfig,
      hasWidgetConfigs: !!(window.interactionConfig && window.interactionConfig.widgetConfigs)
    });
    if (window.aiSDK && window.interactionConfig && window.interactionConfig.widgetConfigs) {
      console.log('[Widget] SDK ready, initializing ${widgetId}...');
`;
  
  const initCall = `      if (window.aiSDK && window.aiSDK.initWidget) {
        console.log('[Widget] Calling initWidget for ${widgetId} with config:', ${configPath});
        const widgetConfig = ${configPath};
        if (!widgetConfig.instanceId) {
          widgetConfig.instanceId = '${instanceId}';
        }
        window.aiSDK.initWidget('${widgetId}', '${instanceId}', widgetConfig);
      } else {
        console.warn('[Widget] initWidget method not found on aiSDK');
      }`;
  
  const waitForSDKEnd = `
    } else {
      console.log('[Widget] SDK not ready yet, retrying...');
      setTimeout(initWidget, 100);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Widget] DOM ready, waiting for SDK...');
      setTimeout(initWidget, 200);
    });
  } else {
    console.log('[Widget] DOM already ready, waiting for SDK...');
    setTimeout(initWidget, 200);
  }
})();
`;

  return `// WIDGET:${widgetId}:START
${waitForSDK}${initCall}
${waitForSDKEnd}
// WIDGET:${widgetId}:END`;
}
```

---

## Widget Configuration Structure

### Interaction Builder Configuration (`interactionBuilderDefaultConfig`)

Settings visible when **building interactions**. These are interaction-type defaults:

```typescript
{
  position: {
    type: 'bottom' | 'top' | 'left' | 'right' | 'fixed',
    zIndex: number,
    x: number,      // Horizontal offset
    y: number       // Vertical offset
  },
  // Widget-specific builder settings (e.g., showControls, showIndicators)
}
```

### Lesson Builder Configuration (`lessonBuilderDefaultConfig`)

Settings visible when **building lessons**. These are lesson-specific:

```typescript
{
  // Lesson-specific data (e.g., imageIds, duration, initialTime)
  // These will appear in the interaction config modal
}
```

### Configuration Access in Widget Code

```javascript
// Widget receives merged config from:
// 1. interactionBuilderDefaultConfig (from interaction type)
// 2. lessonBuilderDefaultConfig (from lesson)
// 3. Lesson-specific overrides (from config modal)

const config = window.interactionConfig.widgetConfigs[instanceId].config;

// Access your settings
const setting1 = config.setting1 || 'default';
const setting2 = config.setting2 || false;
const setting3 = config.setting3 || 100;
```

---

## Adding Widget to Lesson Builder Config Modal

### Step 1: Add Widget Icon

**File**: `Upora/frontend/src/app/shared/components/interaction-configure-modal/interaction-configure-modal.component.ts`

```typescript
getWidgetIcon(widgetId: string): string {
  switch (widgetId) {
    case 'image-carousel':
      return '🖼️';
    case 'timer':
      return '⏱️';
    case 'your-widget-id':
      return '🔧';  // Add your widget icon
    default:
      return '⚙️';
  }
}
```

### Step 2: Add Widget Name

```typescript
getWidgetName(widgetId: string): string {
  const widget = this.widgetRegistry.find(w => w.id === widgetId);
  return widget?.name || widgetId;
}
```

This automatically uses the name from `getWidgetRegistry()`.

### Step 3: Add Configuration Form Fields

Add your widget's configuration fields to the template (see Step 2 in "Creating a New Widget" section above).

---

## SDK Implementation

### Widget Initialization Flow

1. **SDK Ready**: Widget code waits for `window.aiSDK` and `window.interactionConfig` to be available
2. **Auto-Initialization**: SDK automatically initializes widgets from `window.interactionConfig.widgetConfigs` when ready
3. **Manual Initialization**: Interaction code can also call `aiSDK.initWidget(widgetType, instanceId, config)` manually

### Default Behavior: Collapsible Section

By default, widgets appear in **collapsible sections** (closed by default) at the end of the interaction document. Widgets are stacked vertically in a dedicated container that expands the document height (rather than overlaying content):

```javascript
// SDK automatically creates this structure:
<div id="widgets-container">
  <div id="widget-section-{instanceId}" class="widget-carousel-section">
    <div class="widget-carousel-header">
      <span class="widget-carousel-toggle">▶</span>
      <span>Widget Name</span>
    </div>
    <div id="widget-carousel-content-{instanceId}" class="widget-carousel-content" style="display: none;">
      <div id="widget-{widgetId}-{instanceId}">
        <!-- Widget content here -->
      </div>
    </div>
  </div>
  <!-- Additional widgets are stacked here -->
</div>
```

**Key Features:**
- Widgets are positioned in a `widgets-container` at the end of the document body
- Each widget section uses `position: relative` (not `fixed`), so it expands the document height
- Multiple widgets are automatically stacked vertically with proper spacing
- The container expands when widgets are expanded, ensuring all content is visible
- Widgets are centered with a max-width of 800px for optimal readability

### Custom Positioning: Avoiding Collapsible Section

To position your widget **anywhere** in the interaction (not in a collapsible section):

#### Option 1: Add HTML Container in Interaction Code

**In Interaction Builder → HTML Code tab:**

```html
<!-- Place widget container where you want it to appear -->
<div id="widget-your-widget-{instanceId}" style="margin: 20px; padding: 10px; border: 1px solid #00d4ff;">
  <!-- Widget will be initialized here -->
</div>
```

When the SDK's `_initYourWidget()` method runs, it will:
1. Check for `document.getElementById('widget-your-widget-' + instanceId)`
2. Find existing container → Use it instead of creating collapsible section
3. Initialize widget in the existing container

#### Option 2: Create Container Dynamically in Interaction Code

**In Interaction Builder → JavaScript Code tab:**

```javascript
// Wait for SDK to be ready
if (window.aiSDK && window.aiSDK.isReady) {
  window.aiSDK.isReady(() => {
    // Create custom container
    const customContainer = document.createElement('div');
    customContainer.id = 'widget-your-widget-custom-123';
    customContainer.style.position = 'absolute';
    customContainer.style.top = '50px';
    customContainer.style.left = '50px';
    customContainer.style.width = '300px';
    customContainer.style.padding = '20px';
    customContainer.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
    customContainer.style.border = '2px solid #00d4ff';
    document.body.appendChild(customContainer);
    
    // Initialize widget with custom container
    const config = window.interactionConfig?.widgetConfigs?.['your-widget-custom-123']?.config || {};
    config.instanceId = 'your-widget-custom-123';
    
    // Call SDK initialization directly
    if (window.aiSDK.initWidget) {
      window.aiSDK.initWidget('your-widget-id', 'your-widget-custom-123', config);
    }
  });
}
```

**Note:** The SDK's `_initYourWidget()` method checks for existing containers first. If it finds one, it uses it. If not, it creates the default collapsible section.

---

## Testing Your Widget

### 1. Enable Widget in Interaction Builder

1. Open Interaction Builder
2. Go to **Code** tab → **Widgets** sub-tab
3. Find your widget and **enable** it
4. Configure interaction builder settings (position, display options)
5. **Save** the interaction

### 2. Configure Widget in Lesson Builder

1. Open Lesson Builder
2. Add interaction to a sub-stage
3. Click **Configure** button
4. Scroll to **Widget Configuration** section
5. Expand your widget's configuration panel
6. Configure lesson-specific settings
7. **Save** configuration

### 3. Test in Lesson View

1. Open lesson in Lesson View (student perspective)
2. Navigate to the sub-stage with your widget
3. Verify widget appears (collapsible section by default)
4. Click header to expand/collapse
5. Verify widget functionality works with configured settings

---

## Best Practices

### 1. Configuration Naming

- Use **descriptive names** for configuration properties
- Use **camelCase** for property names (e.g., `startOnLoad`, `hideControls`)
- Provide **sensible defaults** in `interactionBuilderDefaultConfig` and `lessonBuilderDefaultConfig`

### 2. Error Handling

Always check for required configuration:

```javascript
_initYourWidget: function(instanceId, config) {
  const instance = this._widgetInstances.get(instanceId);
  if (!instance) {
    console.error('[Widget] ❌ Instance not found for', instanceId);
    return;
  }
  
  // Validate required config
  if (!config || !config.requiredSetting) {
    console.error('[Widget] ❌ Required setting missing');
    container.innerHTML = '<div style="color: red; padding: 10px;">❌ Widget configuration error: Required setting missing</div>';
    return;
  }
  
  // ... continue initialization
}
```

### 3. Logging

Use consistent logging format:

```javascript
console.log('[Widget] ✅ Widget initialized successfully');
console.warn('[Widget] ⚠️ Warning message');
console.error('[Widget] ❌ Error message');
```

### 4. Container ID Naming

Use consistent container ID format:
- Collapsible section: `widget-section-{instanceId}`
- Content container: `widget-carousel-content-{instanceId}`
- Widget container: `widget-{widgetId}-{instanceId}`

### 5. Default Positioning

If no custom container exists in HTML:
- **All Widgets**: Positioned in `widgets-container` at the end of the document body
- **Position**: `position: relative` (expands document height, not fixed overlay)
- **Layout**: Vertically stacked with 20px spacing between widgets
- **Width**: Centered with `max-width: 800px`, `width: 100%`
- **Multiple Widgets**: Automatically stacked without overlapping
- **Document Expansion**: Container expands when widgets are expanded, ensuring all content is visible

### 6. Styling

- Use consistent styling with platform theme (`#00d4ff` for primary color)
- Ensure widgets are responsive (use `maxWidth` and percentage widths)
- Test on different screen sizes

### 7. HTML Containers for Widgets

Some widgets (like Image Carousel) support an **HTML container** feature that allows interaction builders to add custom HTML content below the widget. This is useful for adding instructions, explanations, or additional interactive elements related to the widget.

#### Configuration

HTML containers are configured in the **Lesson Builder** via the interaction config modal:

- **Enable HTML Container Below Images**: Enable/disable the HTML container
- **Container Visible By Default**: Whether the container content is visible when the interaction loads
- **Show Toggle Button**: Whether to show a header with expand/collapse functionality

#### Default Behavior

- **Position**: HTML containers appear **below** the widget content (after images, controls, indicators)
- **Styling**: Default styling includes padding, background color, and border matching the platform theme
- **Toggle**: If "Show Toggle Button" is enabled, clicking the header expands/collapses the content area
- **Content**: Default placeholder content is provided if no custom HTML is added

#### Customizing HTML Container Content

Interaction builders can customize the HTML container content by targeting the container in their interaction code:

**In Interaction Builder → JavaScript Code:**

```javascript
// Wait for widget to initialize
if (window.aiSDK && window.aiSDK.isReady) {
  window.aiSDK.isReady(() => {
    // Get widget instance ID
    const widgetConfigs = window.interactionConfig?.widgetConfigs || {};
    const instanceId = Object.keys(widgetConfigs).find(id => 
      widgetConfigs[id].type === 'image-carousel'
    );
    
    if (instanceId) {
      // Find the HTML container
      const htmlContainer = document.querySelector('.carousel-html-container');
      if (htmlContainer) {
        const contentArea = htmlContainer.querySelector('.carousel-html-content');
        if (contentArea) {
          // Replace or append custom HTML
          contentArea.innerHTML = \`
            <div style="padding: 20px;">
              <h3 style="color: #00d4ff;">Custom Instructions</h3>
              <p>Your custom HTML content here...</p>
              <button onclick="doSomething()">Custom Button</button>
            </div>
          \`;
        }
      }
    }
  });
}
```

#### Container Structure

```html
<div class="carousel-html-container">
  <!-- Header (if showToggle is enabled) -->
  <div style="cursor: pointer; padding: 8px; background: rgba(0, 212, 255, 0.1);">
    <span>HTML Content</span>
    <span style="color: #00d4ff;">▼</span> <!-- Toggle icon -->
  </div>
  
  <!-- Content Area -->
  <div class="carousel-html-content">
    <!-- Your custom HTML content here -->
  </div>
</div>
```

#### Positioning and Sizing

**Current Implementation:**
- HTML containers are **always positioned below** the widget content
- Containers use `width: 100%` to match the widget container width
- Containers have `marginTop: 20px` for spacing
- Containers are appended to `instance.element` (the widget's main container)

**Future Enhancement:**
Currently, there is **no SDK-level configuration** for custom positioning or sizing of HTML containers. They always appear below the widget content. To position HTML containers elsewhere:

1. **Use CSS**: Target `.carousel-html-container` in your interaction's CSS code
2. **Use JavaScript**: Manipulate the container's position/size after widget initialization
3. **Custom Implementation**: Create your own HTML container structure in the interaction code

**Example: Custom Positioning via CSS**

```css
/* In Interaction Builder → CSS Code */
.carousel-html-container {
  position: absolute;
  top: 100px;
  right: 20px;
  width: 300px;
  max-width: 50%;
}
```

**Example: Custom Positioning via JavaScript**

```javascript
// After widget initialization
const htmlContainer = document.querySelector('.carousel-html-container');
if (htmlContainer) {
  htmlContainer.style.position = 'fixed';
  htmlContainer.style.top = '50px';
  htmlContainer.style.left = '50px';
  htmlContainer.style.width = '400px';
  htmlContainer.style.maxWidth = 'none';
}
```

---

## Example: Complete Widget Implementation

See the **Image Carousel** and **Timer** widgets in:
- Backend: `Upora/backend/src/modules/interaction-types/interaction-types.service.ts`
- Frontend SDK: `Upora/frontend/src/app/features/lesson-view/lesson-view.component.ts`
- Config Modal: `Upora/frontend/src/app/shared/components/interaction-configure-modal/interaction-configure-modal.component.ts`

---

## Next Steps

1. Create your widget following this guide
2. Test in Interaction Builder
3. Test in Lesson Builder
4. Test in Lesson View
5. Update SDK documentation with widget usage examples
