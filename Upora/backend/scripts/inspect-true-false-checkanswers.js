/**
 * Inspect the checkAnswers section of true-false-selection JS in the DB.
 * Run: node scripts/inspect-true-false-checkanswers.js
 */
const { Client } = require('pg');

async function inspect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bloomix'
  });

  try {
    await client.connect();
    const res = await client.query(
      "SELECT id, js_code FROM interaction_types WHERE id = 'true-false-selection'"
    );
    if (res.rows.length === 0) {
      console.log('Interaction type true-false-selection not found');
      return;
    }
    const js = res.rows[0].js_code || '';
    const idx = js.indexOf('function checkAnswers');
    if (idx === -1) {
      console.log('checkAnswers not found');
      console.log('Snippet:', js.substring(0, 500));
      return;
    }
    const end = js.indexOf('\n    function ', idx + 10) || js.indexOf('\nfunction ', idx + 10);
    const checkAnswers = end > idx
      ? js.substring(idx, end)
      : js.substring(idx, idx + 1200);
    console.log('=== checkAnswers section ===\n');
    console.log(checkAnswers);
    console.log('\n=== totalTrue pattern match ===');
    const totalTrueMatch = js.match(/if\s*\([^)]*fragment\.isTrueInContext[^)]*\)[^{]*totalTrue\+\+/);
    console.log(totalTrueMatch ? 'FOUND: ' + totalTrueMatch[0] : 'NOT FOUND');
    console.log('\n=== score calc pattern ===');
    const scoreMatch = js.match(/score\s*=\s*[^;]+;/);
    console.log(scoreMatch ? scoreMatch[0] : 'NOT FOUND');
    console.log('\n=== saveUserProgress check ===');
    const hasSaveUserProgress = js.includes('saveUserProgress') || js.includes('aiSDK.saveUserProgress');
    console.log('saveUserProgress present:', hasSaveUserProgress);
    const saveMatch = js.match(/saveUserProgress\s*\(\s*\{[^}]*score[^}]*\}/);
    console.log('saveUserProgress with score:', saveMatch ? 'FOUND' : 'NOT FOUND');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspect();
