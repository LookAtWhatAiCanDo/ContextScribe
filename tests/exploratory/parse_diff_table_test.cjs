const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Find a comment that has a diff table
const comments = document.querySelectorAll(".review-comment, .timeline-comment, .comment, .js-comment");
for (let c of comments) {
  const table = c.querySelector(".diff-table, table.UnifiedDiffLines-module__unifiedDiffLines__U966b");
  if (table) {
    console.log("--- Analyzing comment:", c.id, "---");
    const rows = table.querySelectorAll("tr");
    console.log("Number of rows:", rows.length);
    rows.forEach((row, idx) => {
      // Find cells: .blob-num, .blob-code
      const cells = row.querySelectorAll("td");
      console.log(`Row [${idx}]:`);
      cells.forEach((cell, cellIdx) => {
        console.log(`  Cell [${cellIdx}]: class="${cell.className}" text="${JSON.stringify(cell.textContent.trim())}"`);
      });
    });
    break;
  }
}
