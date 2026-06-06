const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const s = document.querySelectorAll('script[data-target="react-partial.embeddedData"]')[6];
const data = JSON.parse(s.textContent.trim());
console.log(`Script [6] threadComments:`);
data.props.threadComments.forEach((tc, idx) => {
  console.log(`  [${idx}]: permalink=${tc.permalink} message=${tc.message.substring(0, 60)}... hasSuggestion=${tc.hasSuggestion}`);
});
