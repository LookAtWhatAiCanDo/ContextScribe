const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'output.md'), 'utf8');

// Let's find all lines containing "**Copilot**" or "**User**" or comment headers
const lines = md.split('\n');
let commentIdx = 0;
lines.forEach((line, idx) => {
  if (line.includes('**Copilot**') || line.includes('**User**')) {
    commentIdx++;
    console.log(`[Comment ${commentIdx}]: ${line.trim()}`);
    // Find next few lines of content
    let content = "";
    for (let i = idx + 1; i < idx + 5; i++) {
      if (lines[i] && lines[i].trim().startsWith('>')) {
        content += lines[i].trim() + " ";
      }
    }
    console.log(`  Content: ${content.substring(0, 150)}...\n`);
  }
});
