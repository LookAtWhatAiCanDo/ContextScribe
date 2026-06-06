const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
const allTCs = [];
scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments) {
      data.props.threadComments.forEach(tc => {
        allTCs.push({
          scriptIdx: idx,
          permalink: tc.permalink,
          message: tc.message
        });
      });
    }
  } catch (e) {}
});

console.log(`Total collected: ${allTCs.length}`);
// Let's group by permalink
const grouped = {};
allTCs.forEach(tc => {
  if (!grouped[tc.permalink]) grouped[tc.permalink] = [];
  grouped[tc.permalink].push(tc.scriptIdx);
});

Object.keys(grouped).forEach(pl => {
  console.log(`Permalink: ${pl} is in scripts: ${grouped[pl].join(', ')}`);
});
