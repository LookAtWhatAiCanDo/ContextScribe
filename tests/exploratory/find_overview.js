import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Walk through the document to find the element containing "Pull request overview"
// Let's find any element containing the text "Pull request overview"
let found = null;
const allElements = document.getElementsByTagName("*");
for (const el of allElements) {
  if (el.textContent && el.textContent.includes("Pull request overview") && el.children.length === 0) {
    found = el;
    break;
  }
}

if (!found) {
  // Try with children.length > 0 but matching exactly
  for (const el of allElements) {
    if (el.textContent && el.textContent.includes("Pull request overview")) {
      // Find the deepest one
      if (!found || el.textContent.length < found.textContent.length) {
        found = el;
      }
    }
  }
}

if (found) {
  console.log("Found overview node! Tag:", found.tagName, "class:", found.className);
  
  // Let's print the ancestors up to pullrequestreview- or timeline item
  let current = found;
  while (current) {
    console.log(`Ancestor: tag=${current.tagName}, id=${current.id || ''}, class=${current.className || ''}`);
    if (current.id && current.id.startsWith("pullrequestreview-")) {
      break;
    }
    current = current.parentElement;
  }
} else {
  console.log("Could not find overview text node.");
}
