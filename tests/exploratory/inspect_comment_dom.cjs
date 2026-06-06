const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { document } = dom.window;

// Find elements containing "Access-Control-Allow-Origin is currently set"
const walker = document.createTreeWalker(document.body, 4 /* NodeFilter.SHOW_TEXT */);
let node;
while (node = walker.nextNode()) {
  if (node.nodeValue.includes("Access-Control-Allow-Origin is currently set")) {
    console.log("Found text node!");
    let parent = node.parentNode;
    console.log("Parent element tag:", parent.tagName, "class:", parent.className);
    
    // Find the comment container (e.g., closest .review-comment, .timeline-comment or timeline-comment-group)
    const commentEl = parent.closest(".review-comment, .timeline-comment, .comment, .js-comment");
    if (commentEl) {
      console.log("Found comment element! Tag:", commentEl.tagName, "class:", commentEl.className, "id:", commentEl.id);
      console.log("Comment element HTML outer head (first 200 chars):", commentEl.outerHTML.substring(0, 200));
      
      // Let's find any suggestion / diff element inside commentEl
      const suggestions = commentEl.querySelectorAll("[class*='suggestion' i], [class*='changeset' i], .blob-wrapper");
      console.log(`Found ${suggestions.length} suggestion-like elements inside the comment element.`);
      suggestions.forEach((s, i) => {
        console.log(`Suggestion [${i}]: class="${s.className}" HTML:`, s.outerHTML.substring(0, 300));
      });
      
      // Let's print the entire inner HTML of the comment element to see how suggestions are represented
      console.log("\nFull innerHTML of comment element:\n", commentEl.innerHTML);
    } else {
      console.log("Could not find comment container for text node.");
    }
    break;
  }
}
