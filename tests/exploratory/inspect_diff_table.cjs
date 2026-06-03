const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Find a review-comment containing a .diff-table or blob-wrapper
const comments = document.querySelectorAll(".review-comment, .timeline-comment, .comment, .js-comment");
for (let c of comments) {
  const table = c.querySelector(".diff-table, table.UnifiedDiffLines-module__unifiedDiffLines__U966b");
  if (table) {
    console.log("Found comment with diff table. Comment ID:", c.id);
    console.log("Comment body excerpt:", c.querySelector(".comment-body")?.textContent.trim().substring(0, 100));
    console.log("Diff table outerHTML (first 1500 chars):\n", table.outerHTML.substring(0, 1500));
    break;
  }
}
