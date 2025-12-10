// Test script to extract JavaScript code from SQL file
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'update-sdk-test-media-player-code-tab.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('SQL file length:', sqlContent.length);

const jsStart = sqlContent.indexOf("js_code = '");
console.log('js_code start position:', jsStart);

if (jsStart === -1) {
  console.error('❌ Could not find js_code');
  process.exit(1);
}

const jsContentStart = jsStart + "js_code = '".length;
console.log('JavaScript content starts at:', jsContentStart);

// Find the end pattern
const remainingContent = sqlContent.substring(jsContentStart);
console.log('Remaining content length:', remainingContent.length);

// Look for the pattern: }', followed by newline(s) and description =
const jsEndPattern = /}',\s*\n\s*description\s*=/;
const jsEndMatch = remainingContent.match(jsEndPattern);

if (!jsEndMatch) {
  console.error('❌ Could not find end pattern');
  console.error('Looking for: },\' followed by description =');
  console.error('Last 500 chars of remaining:', remainingContent.substring(Math.max(0, remainingContent.length - 500)));
  process.exit(1);
}

console.log('End pattern found at position:', jsEndMatch.index);
console.log('Match:', jsEndMatch[0].substring(0, 50));

const overlayJs = remainingContent.substring(0, jsEndMatch.index);
console.log('\n✅ Extracted JavaScript code length:', overlayJs.length);
console.log('First 200 chars:');
console.log(overlayJs.substring(0, 200));
console.log('\nLast 200 chars:');
console.log(overlayJs.substring(overlayJs.length - 200));

// Check for the generateRequestId line
const generateRequestIdIndex = overlayJs.indexOf('generateRequestId');
if (generateRequestIdIndex !== -1) {
  const line = overlayJs.substring(generateRequestIdIndex, generateRequestIdIndex + 100);
  console.log('\nFound generateRequestId line:');
  console.log(line);
} else {
  console.log('\n❌ generateRequestId not found in extracted code');
}


