const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'output_review2.md'), 'utf8');

const lines = md.split('\n');
let commentIdx = 0;
lines.forEach((line, idx) => {
  if (line.includes('**Copilot**') || line.includes('**User**')) {
    commentIdx++;
    console.log(`[Comment ${commentIdx}]: ${line.trim()}`);
    let content = "";
    for (let i = idx + 1; i < idx + 5; i++) {
      if (lines[i] && lines[i].trim().startsWith('>')) {
        content += lines[i].trim() + " ";
      }
    }
    console.log(`  Content: ${content.substring(0, 150)}...\n`);
  }
});
