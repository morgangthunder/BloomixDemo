-- Fix true-false-selection JS code to access window.interactionData directly
-- instead of storing it in a const that might capture an empty object

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  'const data = window.interactionData || {};',
  '// Access window.interactionData directly (don''t store in const to avoid timing issues)
const getData = () => window.interactionData || {};
const data = getData(); // Get initial value, but functions will use getData() for fresh access'
)
WHERE id = 'true-false-selection';

-- Actually, better approach: update all references to use window.interactionData directly
-- But that's complex. Let's try a simpler fix: ensure data is accessed fresh in renderFragments

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  'function renderFragments() {
           console.log("[Interaction] ???? Cleared grid");
           fragmentsGridEl.innerHTML = ""; // Clear existing fragments
           if (!data.fragments || data.fragments.length === 0) {',
  'function renderFragments() {
           console.log("[Interaction] ???? Cleared grid");
           fragmentsGridEl.innerHTML = ""; // Clear existing fragments
           // Access fresh data from window to avoid stale const
           const freshData = window.interactionData || data || {};
           if (!freshData.fragments || freshData.fragments.length === 0) {'
)
WHERE id = 'true-false-selection';

-- Update the forEach to use freshData
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '           console.log("[Interaction] ???? Rendering " + data.fragments.length + " fragments...");
          data.fragments.forEach((fragment, index) => {',
  '           console.log("[Interaction] ???? Rendering " + freshData.fragments.length + " fragments...");
          freshData.fragments.forEach((fragment, index) => {'
)
WHERE id = 'true-false-selection';


