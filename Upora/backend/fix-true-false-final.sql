-- Final fix: Ensure the JavaScript code always uses window.interactionData directly
-- The issue is that the code might be running before window.interactionData is fully set
-- or the initialization function is not being called correctly

-- First, let's ensure initializeWhenReady is called correctly and uses fresh data
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '// Get interaction data and config from parent
// Access window.interactionData directly (don''t store in const to avoid timing issues)
const getData = () => window.interactionData || {};
const data = getData(); // Get initial value, but functions will use getData() for fresh access
const config = window.interactionConfig || {};',
  '// Get interaction data and config from parent
// Always access window.interactionData directly - don''t cache it
const config = window.interactionConfig || {};'
)
WHERE id = 'true-false-selection';

-- Update initializeWhenReady to access data directly from window
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  'function initializeWhenReady() {
    console.log("[Interaction] 🚀 Script starting...");
    console.log("[Interaction] 🧩 Fragments count:", data.fragments ? data.fragments.length : 0);',
  'function initializeWhenReady() {
    console.log("[Interaction] 🚀 Script starting...");
    // Always get fresh data from window
    const data = window.interactionData || {};
    console.log("[Interaction] 🎯 Data from window:", data);
    console.log("[Interaction] 🧩 Fragments count:", data.fragments ? data.fragments.length : 0);'
)
WHERE id = 'true-false-selection';

-- Update renderFragments to always use data from window (remove freshData, just use data param)
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  'function renderFragments() {
        console.log("[Interaction] 🧹 Cleared grid");
        fragmentsGridEl.innerHTML = ""; // Clear existing fragments
        // Access fresh data from window to avoid stale const
        const freshData = window.interactionData || data || {};
        if (!freshData.fragments || freshData.fragments.length === 0) {',
  'function renderFragments() {
        console.log("[Interaction] 🧹 Cleared grid");
        fragmentsGridEl.innerHTML = ""; // Clear existing fragments
        // Always get fresh data from window
        const data = window.interactionData || {};
        console.log("[Interaction] 📊 Data in renderFragments:", data);
        console.log("[Interaction] 📊 Fragments:", data.fragments);
        if (!data.fragments || data.fragments.length === 0) {
            console.log("[Interaction] ⚠️ No fragments to render!");
            console.log("[Interaction] ⚠️ window.interactionData:", window.interactionData);'
)
WHERE id = 'true-false-selection';

-- Update the forEach to use data instead of freshData
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '        console.log("[Interaction] 🎨 Rendering " + freshData.fragments.length + " fragments...");
        freshData.fragments.forEach((fragment, index) => {',
  '        console.log("[Interaction] 🎨 Rendering " + data.fragments.length + " fragments...");
        data.fragments.forEach((fragment, index) => {'
)
WHERE id = 'true-false-selection';

-- Update checkAnswers to use data from window
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '        // Access fresh data from window
        const freshData = window.interactionData || data || {};
        freshData.fragments.forEach((fragment, index) => {',
  '        // Always get fresh data from window
        const data = window.interactionData || {};
        data.fragments.forEach((fragment, index) => {'
)
WHERE id = 'true-false-selection';

-- Update playAgain to use data from window
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '        // Access fresh data from window
        const freshData = window.interactionData || data || {};
        freshData.fragments.forEach(fragment => {',
  '        // Always get fresh data from window
        const data = window.interactionData || {};
        data.fragments.forEach(fragment => {'
)
WHERE id = 'true-false-selection';

-- Also update the config access to use window directly
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '// Use config values with fallbacks
const targetStatement = config.targetStatement || data.targetStatement || "Loading...";
const showHints = config.showHints !== undefined ? config.showHints : false;
const maxSelections = config.maxSelections || null;',
  '// Use config values with fallbacks (config is already from window.interactionConfig)
// Get data from window for targetStatement fallback
const getTargetStatement = () => {
    const cfg = window.interactionConfig || {};
    const dat = window.interactionData || {};
    return cfg.targetStatement || dat.targetStatement || "Loading...";
};
const getShowHints = () => {
    const cfg = window.interactionConfig || {};
    return cfg.showHints !== undefined ? cfg.showHints : false;
};
const getMaxSelections = () => {
    const cfg = window.interactionConfig || {};
    return cfg.maxSelections || null;
};'
)
WHERE id = 'true-false-selection';

-- Update initializeWhenReady to use the getter functions
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '    // Set target statement
    targetStatementEl.textContent = targetStatement;',
  '    // Set target statement (always get fresh from window)
    const targetStatement = getTargetStatement();
    targetStatementEl.textContent = targetStatement;'
)
WHERE id = 'true-false-selection';

-- Update renderFragments to use getter functions for config
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '            // Add hint as title attribute if showHints is enabled
            const hintAttr = showHints && fragment.explanation ? fragment.explanation : '';
            if (hintAttr) {
                fragmentTile.title = hintAttr;
            }',
  '            // Add hint as title attribute if showHints is enabled (always get fresh from window)
            const showHints = getShowHints();
            const hintAttr = showHints && fragment.explanation ? fragment.explanation : '';
            if (hintAttr) {
                fragmentTile.title = hintAttr;
            }'
)
WHERE id = 'true-false-selection';

-- Update the maxSelections check in renderFragments
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '                    if (maxSelections && selectedFragments.size >= maxSelections) {
                        // Optionally, provide feedback that max selections have been reached
                        console.log(`[Interaction] Max selections (${maxSelections}) reached.`);
                        return;
                    }',
  '                    const maxSelections = getMaxSelections();
                    if (maxSelections && selectedFragments.size >= maxSelections) {
                        // Optionally, provide feedback that max selections have been reached
                        console.log(`[Interaction] Max selections (${maxSelections}) reached.`);
                        return;
                    }'
)
WHERE id = 'true-false-selection';


