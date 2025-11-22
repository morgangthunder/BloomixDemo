-- Fix syntax error in true-false-selection JS code
-- The issue is: const hintAttr = showHints && fragment.explanation ? fragment.explanation : ';
-- Should be: const hintAttr = showHints && fragment.explanation ? fragment.explanation : "";

UPDATE interaction_types
SET js_code = REPLACE(js_code, 
    'const hintAttr = showHints && fragment.explanation ? fragment.explanation : '';',
    'const hintAttr = showHints && fragment.explanation ? fragment.explanation : "";'
)
WHERE id = 'true-false-selection';


