-- Complete fix: Update ALL remaining references to data.fragments to use freshData
-- This ensures the interaction always accesses the latest window.interactionData

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '       console.log("[Interaction] 🧩 Fragments count:", data.fragments ? data.fragments.length : 0);',
  '       // Access fresh data from window to avoid stale const
       const freshData = window.interactionData || data || {};
       console.log("[Interaction] 🧩 Fragments count:", freshData.fragments ? freshData.fragments.length : 0);'
)
WHERE id = 'true-false-selection';

-- Update checkAnswers to use freshData
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '        data.fragments.forEach((fragment, index) => {
            if (fragment.isTrueInContext) totalTrue++;',
  '        // Access fresh data from window
        const freshData = window.interactionData || data || {};
        freshData.fragments.forEach((fragment, index) => {
            if (fragment.isTrueInContext) totalTrue++;'
)
WHERE id = 'true-false-selection';

-- Update playAgain to use freshData
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '        data.fragments.forEach(fragment => {
            delete fragment.feedbackClass; // Clear feedback for replay',
  '        // Access fresh data from window
        const freshData = window.interactionData || data || {};
        freshData.fragments.forEach(fragment => {
            delete fragment.feedbackClass; // Clear feedback for replay'
)
WHERE id = 'true-false-selection';


