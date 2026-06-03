const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Find text node containing "changeset" case-insensitively
const walker = document.createTreeWalker(document.body, 4 /* NodeFilter.SHOW_TEXT */);
let node;
let matchCount = 0;
while (node = walker.nextNode()) {
  const text = node.nodeValue;
  if (text.toLowerCase().includes("changeset")) {
    matchCount++;
    console.log(`\n--- Match ${matchCount} ---`);
    console.log("Text value:", JSON.stringify(text.trim()));
    const p = node.parentNode;
    console.log("Parent element:", p.tagName, "class:", p.className);
    
    // Find closest comment container
    const commentEl = p.closest(".review-comment, .timeline-comment, .comment, .js-comment");
    if (commentEl) {
      console.log("Found comment container. Tag:", commentEl.tagName, "class:", commentEl.className, "id:", commentEl.id);
      
      // Let's find what is around the text in the comment container
      // For instance, let's find the code diff table or container
      const codeBlocks = commentEl.querySelectorAll(".blob-wrapper, table, pre");
      console.log(`Found ${codeBlocks.length} code-like blocks/tables inside comment container.`);
      codeBlocks.forEach((cb, idx) => {
        console.log(`Code block [${idx}]: tagName=${cb.tagName} class="${cb.className}" outerHTML head:`, cb.outerHTML.substring(0, 400));
      });
    }
  }
}
