const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../src/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.ts');
const migrationLines = fs.readFileSync(migrationPath, 'utf8').split('\n');

console.log(`Total lines in migration file: ${migrationLines.length}`);

const startLineIdx = 110; // Line 111 (0-indexed)
const endLineIdx = 598;   // Line 599 (0-indexed)

console.log(`\nExtracting lines ${startLineIdx + 1} to ${endLineIdx + 1}`);

// Extract lines
const codeLines = migrationLines.slice(startLineIdx, endLineIdx + 1);
console.log(`Extracted ${codeLines.length} lines`);

// Show first and last lines
console.log(`\nFirst line (raw):`);
console.log(codeLines[0]);
console.log(`\nLast line (raw):`);
console.log(codeLines[codeLines.length - 1]);

// Remove prefixes/suffixes
if (codeLines[0]) {
  codeLines[0] = codeLines[0].replace(/^\s*const overlayJs = `\s*/, '');
}
if (codeLines[codeLines.length - 1]) {
  codeLines[codeLines.length - 1] = codeLines[codeLines.length - 1].replace(/\s*`;\s*$/, '');
}

// Join and unescape
let overlayJs = codeLines.join('\n');
const beforeUnescape = overlayJs.length;
overlayJs = overlayJs.replace(/\\`/g, '`');
overlayJs = overlayJs.replace(/\\\$\{/g, '${');

console.log(`\nCode length before unescaping: ${beforeUnescape}`);
console.log(`Code length after unescaping: ${overlayJs.length}`);
console.log(`\nFirst 200 chars:`);
console.log(overlayJs.substring(0, 200));
console.log(`\nLast 200 chars:`);
console.log(overlayJs.substring(Math.max(0, overlayJs.length - 200)));
console.log(`\nContains "All buttons created": ${overlayJs.includes('All buttons created')}`);
console.log(`Contains "initTestApp": ${overlayJs.includes('initTestApp')}`);
console.log(`Contains "})();": ${overlayJs.includes('})();')}`);


