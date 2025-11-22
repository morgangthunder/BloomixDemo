-- Fix the hintAttr syntax error: change ': '';' to ': "";'
UPDATE interaction_types
SET js_code = REPLACE(js_code, 
    E'const hintAttr = showHints && fragment.explanation ? fragment.explanation : '';',
    E'const hintAttr = showHints && fragment.explanation ? fragment.explanation : "";'
)
WHERE id = 'true-false-selection';


