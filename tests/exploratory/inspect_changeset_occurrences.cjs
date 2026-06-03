const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Find all indices of "changeset" case-insensitively
let pos = 0;
let matchIndex = 0;
while (true) {
  const index = html.toLowerCase().indexOf("changeset", pos);
  if (index === -1) break;
  matchIndex++;
  console.log(`\n--- Match ${matchIndex} at position ${index} ---`);
  console.log(html.substring(Math.max(0, index - 200), Math.min(html.length, index + 300)));
  pos = index + 1;
}
