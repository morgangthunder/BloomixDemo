# Instructions to Update SDK Test PixiJS Interaction

## Option 1: Use the Interaction Builder (Recommended)

1. Go to the Interaction Builder
2. Find "SDK Test - PixiJS" interaction
3. You should now see three code editors:
   - **HTML Code**
   - **CSS Code**  
   - **JavaScript Code**

4. In the **HTML Code** field, paste:
```html
<div id="pixi-container"></div>
<input type="text" id="image-prompt-input" placeholder="Enter image generation prompt..." style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" />
```

5. In the **CSS Code** field, paste:
```css
#pixi-container { width: 100%; height: 100%; }
#image-prompt-input { font-family: inherit; }
```

6. Save the interaction

7. Refresh the lesson view - the input field should now appear!

## Option 2: Call the Update Endpoint

If the backend is running, you can call:
```
POST http://localhost:3000/api/interaction-types/update-sdk-test-pixijs
```

This will automatically update the HTML/CSS code in the database.

## Debugging

Check the browser console when loading the lesson view. You should see logs like:
- `[LessonView] 📝 HTML code length: XXX`
- `[LessonView] 📝 HTML code includes input: true/false`
- `[LessonView] 🔍 HTML code includes input field: true/false`

If HTML code length is 0, the code wasn't loaded from the database.

