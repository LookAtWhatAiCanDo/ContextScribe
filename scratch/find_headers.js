import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const allElements = document.getElementsByTagName("*");
let found = null;
for (const el of allElements) {
  if (el.textContent && el.textContent.includes("View reviewed changes")) {
    // Check if any child also has this text. If so, skip this element so we get the deepest one.
    let childHasText = false;
    for (const child of Array.from(el.children)) {
      if (child.textContent && child.textContent.includes("View reviewed changes")) {
        childHasText = true;
        break;
      }
    }
    if (!childHasText) {
      found = el;
      break;
    }
  }
}

if (found) {
  console.log("Found 'View reviewed changes' node! Tag:", found.tagName, "class:", found.className);
  let current = found;
  while (current) {
    console.log(`  Ancestor: tag=${current.tagName}, id=${current.id || ''}, class=${current.className || ''}`);
    current = current.parentElement;
  }
} else {
  console.log("Could not find element containing 'View reviewed changes'");
}
