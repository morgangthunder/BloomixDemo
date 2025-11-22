-- Fix renderFragments to use freshData instead of data
-- This ensures it always accesses the latest window.interactionData

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  'function renderFragments() {
        console.log("[Interaction] 🧹 Cleared grid");
        fragmentsGridEl.innerHTML = ""; // Clear existing fragments
        if (!data.fragments || data.fragments.length === 0) {',
  'function renderFragments() {
        console.log("[Interaction] 🧹 Cleared grid");
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
  '        console.log("[Interaction] 🎨 Rendering " + data.fragments.length + " fragments...");
        data.fragments.forEach((fragment, index) => {',
  '        console.log("[Interaction] 🎨 Rendering " + freshData.fragments.length + " fragments...");
        freshData.fragments.forEach((fragment, index) => {'
)
WHERE id = 'true-false-selection';


