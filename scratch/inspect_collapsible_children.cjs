const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Find one review-thread-collapsible with data-resolved="true"
const rtc = document.querySelector('review-thread-collapsible[data-resolved="true"]');
if (rtc) {
  console.log("Found review-thread-collapsible!");
  console.log("Attributes:", Array.from(rtc.attributes).map(a => `${a.name}="${a.value}"`).join(', '));
  console.log("Inner HTML:\n", rtc.innerHTML.substring(0, 1500));
} else {
  console.log("Could not find any review-thread-collapsible with data-resolved='true'!");
}
