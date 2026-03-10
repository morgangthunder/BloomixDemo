UPDATE interaction_types SET js_code = pg_read_file('/tmp/orbital-excavation-full-code.js') WHERE id = 'orbital-excavation';
UPDATE interaction_types SET js_code = pg_read_file('/tmp/pixijs-boilerplate-full-code.js') WHERE id = 'pixijs-boilerplate';
