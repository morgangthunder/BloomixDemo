// Quick fix script to update the update-sdk-test-media-player-code-direct.js file
const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'update-sdk-test-media-player-code-direct.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// Replace the hardcoded endLineIdx with dynamic search
const oldPattern = /const endLineIdx = 598;.*Line 599.*0-indexed\)/s;
const newCode = `// Find the end line dynamically - look for the closing backtick and semicolon
let endLineIdx = -1;
for (let i = startLineIdx + 1; i < migrationLines.length; i++) {
  const trimmed = migrationLines[i].trim();
  if (trimmed === '`;' || trimmed.endsWith('`;')) {
    endLineIdx = i;
    break;
  }
}
if (endLineIdx === -1) {
  console.error('❌ Could not find end of overlayJs template literal');
  console.error('   Searched from line', startLineIdx + 2, 'to', migrationLines.length);
  process.exit(1);
}`;

// Also remove the old check for endLineIdx === 598
content = content.replace(/const endLineIdx = 598;.*Line 599.*0-indexed\)/s, newCode);
content = content.replace(/if \(endLineIdx >= migrationLines\.length \|\| migrationLines\[endLineIdx\]\.trim\(\) !== '`;'\) \{[\s\S]*?Line \$\{endLineIdx \+ 1\} content:.*?\}/s, '');

fs.writeFileSync(scriptPath, content);
console.log('✅ Fixed update script');


