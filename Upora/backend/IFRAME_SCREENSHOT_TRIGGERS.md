# Iframe Screenshot Trigger Options

## Available Events We Can Detect

### 1. **iframeLoad** ✅
- **What**: Triggered when the iframe's `src` loads for the first time
- **Detection**: `iframe.onload` event
- **Use Case**: Capture initial state of the iframed website

### 2. **iframeUrlChange** ✅
- **What**: Triggered when the iframe's `src` attribute changes
- **Detection**: Monitor `iframe.src` attribute changes
- **Use Case**: Capture state when navigating within the iframed site

### 3. **postMessage** ✅
- **What**: Triggered when the iframed site sends a `postMessage` event
- **Detection**: `window.addEventListener('message')` listening for messages from iframe origin
- **Use Case**: Capture state when the iframed site communicates specific events (e.g., "pageLoaded", "componentRendered", "error")
- **Note**: Requires cooperation from the iframed site to send postMessage events

### 4. **scriptBlockComplete** ✅
- **What**: Triggered when a teacher script block completes while the iframe is active
- **Detection**: Script block completion event from lesson-view component
- **Use Case**: Capture state after teacher explains something related to the iframe content
- **How it works**: Script blocks are teacher narration that plays during lessons. When a script block finishes and an iframe interaction is active, we can capture a screenshot to see what the student is looking at after the explanation.

### 5. **periodic** ⏱️
- **What**: Timer-based screenshots at regular intervals
- **Detection**: `setInterval` while iframe is active
- **Use Case**: Continuous monitoring of iframe state changes
- **Configuration**: Requires interval in seconds (e.g., 30 seconds)

## Limitations (CORS Restrictions)

❌ **Cannot detect:**
- JavaScript errors inside cross-origin iframes
- DOM changes inside cross-origin iframes
- User interactions (clicks, form submissions) inside cross-origin iframes
- Access to iframe's document/window for cross-origin content

✅ **Can detect:**
- Iframe load events
- Iframe URL changes
- PostMessage events (if iframed site cooperates)
- Script block completion
- Periodic screenshots

## Script Blocks

**What are script blocks?**
- Teacher narration scripts that play during lessons
- Stored in lesson substages as `scriptBlocks` array
- Each script block has text and optional voice configuration

**How can we use them?**
- When a script block completes while an iframe is active, we can trigger a screenshot
- This captures the state after the teacher explains something
- Helps the AI understand the context of what was just explained

**Example flow:**
1. Student views iframe with a quiz website
2. Teacher script plays: "Now try to answer the first question"
3. Script completes → Screenshot triggered
4. AI analyzes screenshot + document + lesson context
5. AI provides brief guidance on what to do next

