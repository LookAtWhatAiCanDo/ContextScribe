const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
for (let s of scripts) {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments && data.props.threadComments.length > 0) {
      // Find one comment that has a suggestion
      const tc = data.props.threadComments.find(c => c.hasSuggestion);
      if (tc) {
        console.log(`permalink: ${tc.permalink}`);
        console.log(`hasSuggestion: ${tc.hasSuggestion}`);
        console.log(`suggestionHtml:\n${tc.suggestionHtml}`);
      }
      break;
    }
  } catch (e) {}
}
