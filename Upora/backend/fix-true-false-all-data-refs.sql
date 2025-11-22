-- Fix all remaining references to data.fragments in renderFragments and other functions
-- to use freshData instead

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '          data.fragments.forEach((fragment, index) => {
               if (fragment.isTrueInContext) totalTrue++;',
  '          freshData.fragments.forEach((fragment, index) => {
               if (fragment.isTrueInContext) totalTrue++;'
)
WHERE id = 'true-false-selection';

-- Also update the fragments count check in initializeWhenReady
UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '       console.log("[Interaction] ???? Fragments count:", data.fragments ? data.fragments.length : 0);',
  '       // Access fresh data from window to avoid stale const
       const freshData = window.interactionData || data || {};
       console.log("[Interaction] ???? Fragments count:", freshData.fragments ? freshData.fragments.length : 0);'
)
WHERE id = 'true-false-selection';


