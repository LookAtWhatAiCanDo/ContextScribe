const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
console.log("Analyzing all scripts...");

scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.comment) {
      const c = data.props.comment;
      const auto = c.automatedComment;
      if (auto && auto.suggestion) {
        console.log(`\nScript [${idx}] has suggestion for comment ID: ${c.id}`);
        console.log(`Body: ${c.body.substring(0, 100)}...`);
        console.log("Suggestion keys:", Object.keys(auto.suggestion));
        if (auto.suggestion.diffEntries) {
          auto.suggestion.diffEntries.forEach((de, deIdx) => {
            console.log(`  Diff Entry [${deIdx}] for path: ${de.path}`);
            console.log(`  diffLines length: ${de.diffLines?.length}`);
            if (de.diffLines && de.diffLines.length > 0) {
              console.log(`  First few diffLines:`, JSON.stringify(de.diffLines.slice(0, 5), null, 2));
            }
          });
        }
      }
    }
  } catch (e) {
    // ignore
  }
});
