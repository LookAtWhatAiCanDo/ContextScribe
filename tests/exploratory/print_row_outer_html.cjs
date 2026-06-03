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
    console.log("--- Outer HTML of rows ---");
    const rows = table.querySelectorAll("tr");
    rows.forEach((row, idx) => {
      console.log(`Row [${idx}] outerHTML:\n`, row.outerHTML);
    });
    break;
  }
}
