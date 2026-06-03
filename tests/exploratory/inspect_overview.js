import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const overviewEl = document.getElementById("pullrequestreview-4394328318");
if (overviewEl) {
  console.log("Overview Element Tag:", overviewEl.tagName, "class:", overviewEl.className);
  
  // Find comment-body or similar
  const bodyEl = overviewEl.querySelector(".comment-body, td.comment-body, .markdown-body, [class*='comment-body']");
  console.log("Found bodyEl?", !!bodyEl);
  if (bodyEl) {
    console.log("bodyEl tag:", bodyEl.tagName, "class:", bodyEl.className);
    console.log("bodyEl text content:", bodyEl.textContent.trim());
    console.log("bodyEl outer HTMLhead (first 400 chars):", bodyEl.outerHTML.substring(0, 400));
  } else {
    // If no bodyEl, where does the text come from?
    console.log("No bodyEl found! Searching for text in other elements...");
    // Let's print any element that has text containing "Copilot reviewed 45"
    const matches = overviewEl.querySelectorAll("*");
    for (const match of matches) {
      if (match.textContent && match.textContent.includes("Copilot reviewed 45")) {
        console.log(`  Match: tag=${match.tagName}, class=${match.className}, textLength=${match.textContent.length}`);
      }
    }
  }
} else {
  console.log("Overview element not found by ID.");
}
