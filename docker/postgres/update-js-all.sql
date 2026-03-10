UPDATE interaction_types SET js_code = pg_read_file('/tmp/orbital-excavation-full-code.js') WHERE id = 'orbital-excavation';
UPDATE interaction_types SET js_code = pg_read_file('/tmp/process-explorer-full-code.js') WHERE id = 'process-explorer';
UPDATE interaction_types SET js_code = pg_read_file('/tmp/image-with-questions-full-code.js') WHERE id = 'image-with-questions';
UPDATE interaction_types SET js_code = pg_read_file('/tmp/storyteller-scene-full-code.js') WHERE id = 'storyteller-scene';
