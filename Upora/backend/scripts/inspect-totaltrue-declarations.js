const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'upora_dev',
  user: process.env.DATABASE_USER || 'upora_user',
  password: process.env.DATABASE_PASSWORD || 'upora_password'
});

client.connect()
  .then(() => client.query(`SELECT js_code FROM interaction_types WHERE id = 'true-false-selection'`))
  .then(res => {
    const js = res.rows[0].js_code;
    const lines = js.split('\n');
    
    console.log('=== Checking for totalTrue declarations ===\n');
    
    const declarations = [];
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Check for any declaration pattern
      if (trimmed.match(/^\s*(let|const|var)\s+totalTrue\s*=/)) {
        declarations.push({ 
          line: i + 1, 
          content: trimmed,
          fullLine: line
        });
      }
    });
    
    console.log(`Found ${declarations.length} declaration(s) of totalTrue:\n`);
    declarations.forEach((d, idx) => {
      console.log(`Declaration ${idx + 1} at line ${d.line}:`);
      console.log(`  Content: ${d.content}`);
      console.log(`  Full line: ${d.fullLine}`);
      console.log('');
    });
    
    // Also check for the pattern the regex uses
    const regexMatches = js.match(/\b(let|const|var)\s+totalTrue\s*=/g);
    console.log(`Regex pattern matches: ${regexMatches ? regexMatches.length : 0}`);
    if (regexMatches) {
      regexMatches.forEach((match, idx) => {
        console.log(`  Match ${idx + 1}: ${match}`);
      });
    }
    
    // Check if checkAnswers function exists
    const checkAnswersIndex = js.indexOf('function checkAnswers()');
    if (checkAnswersIndex === -1) {
      console.log('\n⚠️ WARNING: checkAnswers() function not found!');
    } else {
      console.log(`\n✅ checkAnswers() function found at character index ${checkAnswersIndex}`);
      
      // Find the checkAnswers function boundaries
      const nextFunctionStart = js.indexOf('\nfunction ', checkAnswersIndex + 25);
      const checkAnswersEnd = nextFunctionStart === -1 ? js.length : nextFunctionStart;
      const checkAnswersCode = js.substring(checkAnswersIndex, checkAnswersEnd);
      
      console.log(`\nChecking declarations inside checkAnswers function:`);
      const insideCheckAnswers = declarations.filter(d => {
        // Calculate character position of this line
        let charPos = 0;
        for (let i = 0; i < d.line - 1; i++) {
          charPos += lines[i].length + 1; // +1 for newline
        }
        return charPos >= checkAnswersIndex && charPos < checkAnswersEnd;
      });
      
      console.log(`  Found ${insideCheckAnswers.length} declaration(s) inside checkAnswers`);
      insideCheckAnswers.forEach((d, idx) => {
        console.log(`    ${idx + 1}. Line ${d.line}: ${d.content}`);
      });
      
      const outsideCheckAnswers = declarations.filter(d => {
        // Calculate character position of this line
        let charPos = 0;
        for (let i = 0; i < d.line - 1; i++) {
          charPos += lines[i].length + 1; // +1 for newline
        }
        return charPos < checkAnswersIndex || charPos >= checkAnswersEnd;
      });
      
      console.log(`\n  Found ${outsideCheckAnswers.length} declaration(s) outside checkAnswers`);
      outsideCheckAnswers.forEach((d, idx) => {
        console.log(`    ${idx + 1}. Line ${d.line}: ${d.content}`);
      });
    }
    
    client.end();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    client.end();
    process.exit(1);
  });
