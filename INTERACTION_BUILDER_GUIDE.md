# Interaction Builder Guide

## Overview

The Interaction Builder is a comprehensive tool for creating and managing three types of interactive content: HTML, PixiJS, and iFrame interactions. Super-admins can create new interactions and edit existing ones, including the built-in true-false interaction.

## Features

### Three Interaction Types

1. **🌐 HTML Interactions**
   - Custom HTML/CSS/JavaScript
   - Separate editors for HTML, CSS, and JS
   - Live preview in iframe sandbox
   - Perfect for: Forms, quizzes, text-based interactions

2. **🎮 PixiJS Interactions**
   - TypeScript/JavaScript single-file approach
   - PixiJS game engine integration
   - Live preview (placeholder for now, can be enhanced)
   - Perfect for: Games, animations, drag-and-drop, visual interactions

3. **🖼️ iFrame Interactions**
   - Embed external content
   - Configurable dimensions (width, height)
   - Permission controls (fullscreen, scripts, forms)
   - Live preview
   - Perfect for: YouTube videos, simulations, external tools

### Interaction Library

- **Left Sidebar**: Shows all existing interactions
- **Click to Edit**: Load any interaction to modify
- **Visual Icons**: Easy identification of interaction types
- **Active Highlight**: See which interaction you're currently editing

### Editing Features

- **Basic Info**: ID, name, description, TEACH stage category
- **Type Selection**: Choose HTML, PixiJS, or iFrame (locked after creation)
- **Code Editors**: Full-featured text areas with syntax highlighting potential
- **Live Previews**: See your changes in real-time
- **Save/Update**: Persist all changes to database

## Usage

### Creating a New Interaction

1. Click **"+ New"** in the sidebar
2. Fill in required fields:
   - **ID**: Unique identifier (e.g., `my-drag-drop`)
   - **Name**: Display name (e.g., "Drag and Drop Sorting")
   - **Description**: What the interaction does
   - **Type**: Select HTML, PixiJS, or iFrame
3. Configure type-specific settings
4. Click **"Save Interaction"**

### Editing Existing Interactions

1. Click any interaction in the sidebar
2. Modify any editable fields
3. Update code or configuration
4. Click **"Save Interaction"**

**Note**: The `id` and `interactionTypeCategory` fields cannot be changed after creation.

### HTML Interaction Example

```html
<!-- HTML Tab -->
<div class="quiz-container">
  <h2>Quick Quiz</h2>
  <button onclick="checkAnswer()">Submit</button>
</div>
```

```css
/* CSS Tab */
.quiz-container {
  padding: 20px;
  text-align: center;
  background: #f0f0f0;
  border-radius: 8px;
}

button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

```javascript
// JavaScript Tab
function checkAnswer() {
  alert('Answer submitted!');
  // Add your logic here
}
```

### PixiJS Interaction Example

```javascript
// PixiJS Interaction Structure
class MyInteraction {
  constructor(app, config, data) {
    this.app = app; // PixiJS Application instance
    this.config = config; // Lesson configuration
    this.data = data; // Interaction data
  }
  
  init() {
    // Setup your PixiJS scene
    const sprite = PIXI.Sprite.from('image.png');
    sprite.interactive = true;
    sprite.on('pointerdown', () => {
      console.log('Sprite clicked!');
    });
    this.app.stage.addChild(sprite);
  }
  
  onComplete() {
    // Called when interaction completes
    return {
      score: 100,
      completed: true
    };
  }
  
  destroy() {
    // Cleanup
    this.app.stage.removeChildren();
  }
}

export default MyInteraction;
```

### iFrame Interaction Example

**Settings:**
- URL: `https://www.youtube.com/embed/dQw4w9WgXcQ`
- Width: `100%`
- Height: `600px`
- Allow Fullscreen: ✓
- Allow Scripts: ✓
- Allow Forms: ✗

## Database Schema

### New Fields in `interaction_types` Table

- `interaction_type_category` (varchar): 'html', 'pixijs', or 'iframe'
- `html_code` (text): HTML code for HTML interactions
- `css_code` (text): CSS code for HTML interactions
- `js_code` (text): JavaScript/TypeScript code for HTML/PixiJS
- `iframe_url` (varchar): URL for iFrame interactions
- `iframe_config` (jsonb): Configuration object for iFrame

### Example iFrame Config

```json
{
  "width": "800px",
  "height": "600px",
  "allowFullscreen": true,
  "allowScripts": true,
  "allowForms": false
}
```

## API Endpoints

### GET `/api/interaction-types`
- Returns all active interaction types
- Used to populate the sidebar library

### GET `/api/interaction-types/:id`
- Returns a specific interaction type
- Used to load interaction details

### POST `/api/interaction-types`
- Creates a new interaction type
- Requires super-admin access (TODO: Add role check)
- Body: `CreateInteractionTypeDto`

### PUT `/api/interaction-types/:id`
- Updates an existing interaction type
- Requires super-admin access (TODO: Add role check)
- Body: `UpdateInteractionTypeDto`

## Architecture Decisions

### Single-File PixiJS Approach

**Why:**
- Simpler to manage and version control
- Easier sandboxing and validation
- Most interactions fit comfortably in one file
- Can use ES6 modules within the file

**When to Expand:**
- If you need shared utilities across multiple interactions
- If building complex game engines
- If separate asset management is required

**Future Enhancement:**
- Add a library system for shared PixiJS utilities
- Support importing common components
- Multi-file upload for complex projects

### HTML Sandbox

HTML interactions run in an iframe with the `sandbox` attribute:
- Prevents malicious code execution
- Isolates from main app
- Can enable specific permissions as needed

### Live Previews

- **HTML**: Full live preview using `srcdoc` attribute
- **PixiJS**: Placeholder (can be enhanced with PixiJS runtime)
- **iFrame**: Direct embed with configured permissions

## Security Considerations

1. **Input Validation**: All fields validated via DTOs
2. **Super-Admin Only**: Only super-admins can create/edit
3. **Sandbox**: HTML interactions run in sandboxed iframe
4. **URL Validation**: iFrame URLs should be validated (TODO)
5. **Code Review**: Consider manual review for PixiJS code

## Testing

### Manual Testing Steps

1. **Create HTML Interaction**
   - Fill in all fields
   - Add HTML/CSS/JS code
   - Preview works correctly
   - Save and reload - data persists

2. **Create PixiJS Interaction**
   - Add PixiJS class code
   - Save and reload - code persists

3. **Create iFrame Interaction**
   - Add valid URL
   - Configure dimensions/permissions
   - Preview shows iframe correctly
   - Save and reload - config persists

4. **Edit True-False Interaction**
   - Load existing `true-false-selection`
   - Verify all fields load correctly
   - Make changes
   - Save and reload - changes persist
   - Test in lesson editor - still works

## Future Enhancements

1. **Code Editor Improvements**
   - Syntax highlighting (Monaco Editor)
   - Autocomplete
   - Error detection
   - Prettier formatting

2. **PixiJS Preview**
   - Actual PixiJS runtime in preview pane
   - Real-time updates as you code
   - Console output display

3. **Template Library**
   - Pre-built interaction templates
   - Drag-drop, click targets, animations
   - One-click insert

4. **Asset Manager**
   - Upload images, sounds, sprites
   - Reference in PixiJS code
   - Preview assets

5. **Version Control**
   - Save multiple versions
   - Rollback capability
   - Compare versions

6. **Collaboration**
   - Multiple admins can edit
   - Real-time collaboration
   - Comments and reviews

7. **Testing Tools**
   - Preview with sample data
   - Test different screen sizes
   - Performance profiling

## Known Limitations

1. **PixiJS Preview**: Currently shows placeholder, needs runtime implementation
2. **Code Editor**: Basic textarea, no syntax highlighting yet
3. **Permission System**: TODO - Add actual super-admin role checks
4. **URL Validation**: iFrame URLs not validated for safety
5. **Asset Management**: No built-in asset uploader yet

## Versions

- **Frontend**: v0.6.0
- **Backend**: v0.3.8
- **Database**: New columns added to `interaction_types` table

## Related Files

- Frontend: `Upora/frontend/src/app/features/interaction-builder/interaction-builder.component.ts`
- Backend Controller: `Upora/backend/src/modules/interaction-types/interaction-types.controller.ts`
- Backend Service: `Upora/backend/src/modules/interaction-types/interaction-types.service.ts`
- Entity: `Upora/backend/src/entities/interaction-type.entity.ts`
- DTOs: `Upora/backend/src/modules/interaction-types/dto/interaction-type.dto.ts`

