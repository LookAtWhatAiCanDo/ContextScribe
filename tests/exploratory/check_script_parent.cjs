const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments) {
      console.log(`Script [${idx}] (len ${data.props.threadComments.length}):`);
      // Find closest thread container ancestor
      const container = s.closest(".js-comment-container, review-thread-collapsible, .timeline-comment-group");
      if (container) {
        console.log(`  Ancestor: tag=${container.tagName} class="${container.className}" id="${container.id}"`);
      } else {
        console.log(`  No matching ancestor! Parent is: tag=${s.parentElement.tagName} class="${s.parentElement.className}"`);
      }
    }
  } catch (e) {}
});
