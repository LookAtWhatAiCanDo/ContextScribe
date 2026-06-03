import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const collapsible = document.querySelector("review-thread-collapsible");
if (collapsible) {
  // Print all anchor tags inside it
  const anchors = collapsible.querySelectorAll("a");
  console.log(`Found ${anchors.length} anchors inside collapsible:`);
  anchors.forEach((a, i) => {
    console.log(`Anchor [${i}]: text="${a.textContent.trim()}" href="${a.getAttribute("href") || ''}" data-path="${a.getAttribute("data-path") || ''}"`);
  });
} else {
  console.log("No collapsible found.");
}
