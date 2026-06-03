const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Let's search the DOM for text containing "Suggested changesets"
const walker = document.createTreeWalker(document.body, 4 /* NodeFilter.SHOW_TEXT */);
let node;
let foundCount = 0;
while (node = walker.nextNode()) {
  if (node.nodeValue.toLowerCase().includes("suggested changesets")) {
    foundCount++;
    console.log(`\nFound Text Match [${foundCount}]: "${node.nodeValue.trim()}"`);
    let p = node.parentNode;
    console.log(`Parent: <${p.tagName.toLowerCase()} class="${p.className}" id="${p.id}">`);
    // Print ancestors up to 5 levels
    let anc = p;
    for (let i = 0; i < 5; i++) {
      if (anc.parentElement) {
        anc = anc.parentElement;
        console.log(`Ancestor [${i+1}]: <${anc.tagName.toLowerCase()} class="${anc.className}" id="${anc.id}">`);
      }
    }
    // Print parent's innerHTML
    console.log("Parent HTML:\n", p.innerHTML.substring(0, 1000));
  }
}
