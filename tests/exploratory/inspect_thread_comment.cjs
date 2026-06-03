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
      console.log('Keys of a threadComment object:', Object.keys(data.props.threadComments[0]));
      console.log('Full first threadComment object:', data.props.threadComments[0]);
      break;
    }
  } catch (e) {}
}
